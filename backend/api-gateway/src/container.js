/**
 * Composition root: wires services and controllers together.
 * Tests can override any dependency (e.g. a fake AI client) via `overrides`.
 */
import { createAiClient } from './services/aiClientService.js';
import { createStorageService } from './services/storageService.js';
import { createModelService } from './services/modelService.js';
import { createJobService } from './services/jobService.js';
import { createJobProcessor } from './services/jobProcessor.js';
import { createCleanupService } from './services/cleanupService.js';
import { createHealthController } from './controllers/healthController.js';
import { createImageController } from './controllers/imageController.js';
import { createModelController } from './controllers/modelController.js';
import { TaskQueue } from './utils/TaskQueue.js';
import { logger } from './utils/logger.js';

export function createContainer(config, overrides = {}) {
  const aiClient = overrides.aiClient ?? createAiClient(config.ai);
  const storage = overrides.storage ?? createStorageService(config);
  const modelService = createModelService({ aiClient });
  const queue = new TaskQueue({
    concurrency: config.jobs.concurrency,
    onError: (err) => logger.error('Queue task error', { error: err.message }),
  });
  const jobProcessor = createJobProcessor({ aiClient, storage, queue });
  const jobService = createJobService({
    storage,
    modelService,
    retentionHours: config.jobs.retentionHours,
    onJobCreated: overrides.onJobCreated ?? ((job) => jobProcessor.enqueue(job.publicId)),
  });
  const cleanup = createCleanupService({ jobService });

  const services = {
    aiClient,
    storage,
    modelService,
    queue,
    jobProcessor,
    jobService,
    cleanup,
    async onStartup() {
      await storage.init();
      await jobProcessor.recover();
      cleanup.start();
    },
    async onShutdown() {
      cleanup.stop();
    },
  };

  const controllers = {
    healthController: createHealthController(services),
    imageController: createImageController(services),
    modelController: createModelController(services),
  };

  return { config, services, controllers };
}
