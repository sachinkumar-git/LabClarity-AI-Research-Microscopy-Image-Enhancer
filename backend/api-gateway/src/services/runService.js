/**
 * Creates processing runs. One request = images x pipelines, which covers single runs,
 * multi-model comparisons (1 image x N pipelines) and batches (N images x 1 pipeline).
 * Pipelines are validated by the AI service (single source of truth) before anything is queued.
 */
import { randomUUID } from 'node:crypto';
import { JOB_STATUS } from '../config/constants.js';
import { Job } from '../models/Job.js';
import { AppError } from '../utils/AppError.js';
import { describePipeline, primaryModel } from '../utils/pipelineLabel.js';
import { expiresAtFor } from '../utils/retention.js';

export const MAX_RUNS_PER_REQUEST = 60;

function assertRoiFits(roi, assets) {
  if (!roi) return;
  for (const asset of assets) {
    const { width, height } = asset.analysis ?? {};
    if (width && (roi.x + roi.width > width || roi.y + roi.height > height)) {
      throw AppError.badRequest(`ROI exceeds the bounds of "${asset.originalName}" (${width}x${height})`);
    }
  }
}

export function createRunService({ assetService, experimentService, aiClient, retentionHours, onJobCreated }) {
  async function normalise(pipelines) {
    return Promise.all(
      pipelines.map(async ({ label, steps }) => {
        const { pipeline, scale } = await aiClient.validatePipeline({ steps });
        return { label: label || describePipeline(pipeline), pipeline, scale };
      }),
    );
  }

  return {
    async create({ assetIds, pipelines, roi = null, referenceAssetId = null, experimentId = null }) {
      if (assetIds.length * pipelines.length > MAX_RUNS_PER_REQUEST) {
        throw AppError.badRequest(`At most ${MAX_RUNS_PER_REQUEST} runs per request`);
      }
      if (experimentId) await experimentService.findByPublicId(experimentId);
      const assets = await assetService.findMany(assetIds);
      if (referenceAssetId) await assetService.findByPublicId(referenceAssetId);
      assertRoiFits(roi, assets);
      const specs = await normalise(pipelines);

      const batchId = randomUUID();
      const docs = assets.flatMap((asset) =>
        specs.map((spec) => {
          const expId = experimentId ?? asset.experimentId ?? null;
          return {
            assetId: asset.publicId,
            experimentId: expId,
            batchId,
            label: spec.label,
            originalName: asset.originalName,
            mimeType: asset.mimeType,
            sizeBytes: asset.sizeBytes,
            inputSha256: asset.sha256,
            model: primaryModel(spec.pipeline),
            scale: spec.scale,
            pipeline: spec.pipeline,
            roi,
            referenceAssetId,
            files: { original: asset.files.original, preview: asset.files.preview },
            expiresAt: expiresAtFor(expId, retentionHours),
          };
        }),
      );
      const jobs = await Job.insertMany(docs);
      jobs.forEach((job) => onJobCreated(job));
      return { batchId, jobs };
    },

    /** Aggregate progress for a batch/comparison. */
    async progress(batchId) {
      const jobs = await Job.find({ batchId }).sort({ createdAt: 1 });
      if (!jobs.length) throw AppError.notFound('Batch not found');
      const counts = Object.fromEntries(Object.values(JOB_STATUS).map((s) => [s, 0]));
      jobs.forEach((job) => {
        counts[job.status] += 1;
      });
      const finished = counts.completed + counts.failed;
      return {
        id: batchId,
        total: jobs.length,
        counts,
        percent: Math.round((finished / jobs.length) * 100),
        done: finished === jobs.length,
        jobs,
      };
    },
  };
}
