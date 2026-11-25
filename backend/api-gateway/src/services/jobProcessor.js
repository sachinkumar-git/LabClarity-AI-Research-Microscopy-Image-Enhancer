/**
 * Background worker: runs queued jobs through the AI pipeline and stores labelled outputs.
 * Jobs are claimed atomically (queued -> processing) so each runs exactly once.
 * Originals are only ever read; the input hash is re-checked before processing.
 */
import { JOB_STATUS } from '../config/constants.js';
import { Asset } from '../models/Asset.js';
import { Job } from '../models/Job.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { BUCKETS, sha256 } from './storageService.js';

function toMetrics(audit) {
  return {
    inputWidth: audit.input?.roi?.width ?? audit.input?.width,
    inputHeight: audit.input?.roi?.height ?? audit.input?.height,
    outputWidth: audit.output?.width,
    outputHeight: audit.output?.height,
    bitDepth: audit.output?.dataBitDepth,
    device: audit.device,
    durationMs: audit.durationMs,
  };
}

export function createJobProcessor({ aiClient, storage, queue }) {
  const claim = (publicId) =>
    Job.findOneAndUpdate(
      { publicId, status: JOB_STATUS.QUEUED },
      { status: JOB_STATUS.PROCESSING, startedAt: new Date() },
      { returnDocument: 'after' },
    );

  async function loadReference(referenceAssetId) {
    if (!referenceAssetId) return null;
    const ref = await Asset.findOne({ publicId: referenceAssetId });
    if (!ref) throw AppError.badRequest('Reference image no longer exists');
    return { buffer: await storage.read(ref.files.original), mimeType: ref.mimeType, filename: ref.originalName };
  }

  async function run(job) {
    const buffer = await storage.read(job.files.original);
    const inputHash = sha256(buffer);
    if (job.inputSha256 && inputHash !== job.inputSha256) {
      throw new AppError('Original image failed its integrity check; processing aborted', { status: 500 });
    }
    const result = await aiClient.process({
      buffer,
      mimeType: job.mimeType,
      filename: job.originalName,
      pipeline: job.pipeline,
      roi: job.roi,
      reference: await loadReference(job.referenceAssetId),
    });
    job.files.enhanced = await storage.save(BUCKETS.RESULTS, result.display, '.png');
    if (result.diff) job.files.diff = await storage.save(BUCKETS.RESULTS, result.diff, '.png');
    if (result.data) job.files.enhancedData = await storage.save(BUCKETS.RESULTS, result.data, '.png');
    job.metrics = toMetrics(result.audit);
    job.quality = result.audit.quality ?? null;
    job.audit = { ...result.audit, gateway: { inputSha256: inputHash, queuedAt: job.createdAt, startedAt: job.startedAt } };
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
    if (job.audit) job.audit.gateway.completedAt = job.completedAt;
    job.markModified('audit');
    await job.save();
  }

  const enqueue = (publicId) => queue.push(() => process(publicId));

  return {
    process,
    enqueue,

    /** On boot: fail jobs interrupted by a crash/restart and re-queue waiting ones. */
    async recover() {
      const interrupted = await Job.updateMany(
        { status: JOB_STATUS.PROCESSING },
        { status: JOB_STATUS.FAILED, errorMessage: 'Interrupted by a server restart', completedAt: new Date() },
      );
      const waiting = await Job.find({ status: JOB_STATUS.QUEUED }).sort({ createdAt: 1 }).select('publicId');
      waiting.forEach(({ publicId }) => enqueue(publicId));
      if (interrupted.modifiedCount || waiting.length) {
        logger.info('Job recovery', { failed: interrupted.modifiedCount, requeued: waiting.length });
      }
    },
  };
}
