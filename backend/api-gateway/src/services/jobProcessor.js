/**
 * Background worker: runs queued jobs through the AI service and stores the results.
 * Jobs are claimed atomically (queued -> processing) so each runs exactly once.
 */
import { JOB_STATUS } from '../config/constants.js';
import { Job } from '../models/Job.js';
import { logger } from '../utils/logger.js';
import { BUCKETS } from './storageService.js';

const BROWSER_SAFE = new Set(['image/png', 'image/jpeg']);

export function createJobProcessor({ aiClient, storage, queue }) {
  async function claim(publicId) {
    return Job.findOneAndUpdate(
      { publicId, status: JOB_STATUS.QUEUED },
      { status: JOB_STATUS.PROCESSING, startedAt: new Date() },
      { returnDocument: 'after' },
    );
  }

  async function run(job) {
    const input = {
      buffer: await storage.read(job.files.original),
      mimeType: job.mimeType,
      filename: job.originalName,
    };
    if (!BROWSER_SAFE.has(job.mimeType)) {
      const preview = await aiClient.preview(input);
      job.files.preview = await storage.save(BUCKETS.PREVIEWS, preview.buffer, '.png');
    }
    const result = await aiClient.enhance({ ...input, model: job.model, scale: job.scale });
    job.files.enhanced = await storage.save(BUCKETS.RESULTS, result.buffer, '.png');
    if (result.dataBuffer) {
      job.files.enhancedData = await storage.save(BUCKETS.RESULTS, result.dataBuffer, '.png');
    }
    job.metrics = result.metrics;
    job.status = JOB_STATUS.COMPLETED;
  }

  async function process(publicId) {
    const job = await claim(publicId);
    if (!job) return; // deleted or already handled
    try {
      await run(job);
      logger.info('Job completed', { id: publicId, model: job.model, ms: job.metrics?.durationMs });
    } catch (err) {
      job.status = JOB_STATUS.FAILED;
      job.errorMessage = err.isOperational ? err.message.slice(0, 500) : 'Processing failed';
      logger.error('Job failed', { id: publicId, error: err.message });
    }
    job.completedAt = new Date();
    await job.save();
  }

  return {
    process,

    enqueue(publicId) {
      queue.push(() => process(publicId));
    },

    /** On boot: fail jobs interrupted by a crash/restart and re-queue waiting ones. */
    async recover() {
      const interrupted = await Job.updateMany(
        { status: JOB_STATUS.PROCESSING },
        { status: JOB_STATUS.FAILED, errorMessage: 'Interrupted by a server restart', completedAt: new Date() },
      );
      const waiting = await Job.find({ status: JOB_STATUS.QUEUED }).sort({ createdAt: 1 }).select('publicId');
      waiting.forEach(({ publicId }) => this.enqueue(publicId));
      if (interrupted.modifiedCount || waiting.length) {
        logger.info('Job recovery', { failed: interrupted.modifiedCount, requeued: waiting.length });
      }
    },
  };
}
