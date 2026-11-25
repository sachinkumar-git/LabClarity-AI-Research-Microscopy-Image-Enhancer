/**
 * Composition root: wires services and controllers together.
 * Tests can override any dependency (e.g. a fake AI client) via `overrides`.
 * Mutually dependent services are connected through lazy getters.
 */
import { createAiClient } from './services/aiClientService.js';
import { createStorageService } from './services/storageService.js';
import { createModelService } from './services/modelService.js';
import { createExperimentService } from './services/experimentService.js';
import { createAssetService } from './services/assetService.js';
import { createRunService } from './services/runService.js';
import { createJobService } from './services/jobService.js';
import { createJobProcessor } from './services/jobProcessor.js';
import { createCleanupService } from './services/cleanupService.js';
import { createReportService } from './services/reports/reportService.js';
import { createStatsService } from './services/statsService.js';
import { createRunControlService } from './services/runControlService.js';
import { createControllers } from './controllers/index.js';
import { TaskQueue } from './utils/TaskQueue.js';
import { logger } from './utils/logger.js';

export function createContainer(config, overrides = {}) {
  const { retentionHours, concurrency } = config.jobs;
  const aiClient = overrides.aiClient ?? createAiClient(config.ai);
  const storage = overrides.storage ?? createStorageService(config);
  const modelService = createModelService({ aiClient });
  const queue = new TaskQueue({
    concurrency,
    onError: (err) => logger.error('Queue task error', { error: err.message }),
  });
  const jobProcessor = createJobProcessor({ aiClient, storage, queue });
  const onJobCreated = overrides.onJobCreated ?? ((job) => jobProcessor.enqueue(job.publicId));

  let assetService;
  let runService;
  const experimentService = createExperimentService({ getAssetService: () => assetService });
  assetService = createAssetService({ storage, aiClient, experimentService, retentionHours });
  runService = createRunService({ assetService, experimentService, aiClient, retentionHours, onJobCreated });
  const jobService = createJobService({
    storage,
    modelService,
    getAssetService: () => assetService,
    getRunService: () => runService,
  });
  const cleanup = createCleanupService({ jobService, getAssetService: () => assetService });
  const reportService = createReportService({ storage, assetService });
  const statsService = createStatsService();
  const runControlService = createRunControlService({ storage, onJobCreated });

  const services = {
    aiClient, storage, modelService, queue, jobProcessor,
    experimentService, assetService, runService, jobService, cleanup, reportService, statsService, runControlService,
    async onStartup() {
      await storage.init();
      await jobProcessor.recover();
      cleanup.start();
    },
    async onShutdown() {
      cleanup.stop();
    },
  };

  return { config, services, controllers: createControllers(services) };
}
