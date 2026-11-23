/** Business logic for creating, reading and deleting enhancement jobs. */
import { ALLOWED_IMAGE_TYPES, JOB_STATUS } from '../config/constants.js';
import { Job } from '../models/Job.js';
import { AppError } from '../utils/AppError.js';
import { BUCKETS } from './storageService.js';

const HOUR_MS = 60 * 60 * 1000;

export function createJobService({ storage, modelService, retentionHours, onJobCreated = () => {} }) {
  async function findByPublicId(publicId) {
    const job = await Job.findOne({ publicId });
    if (!job) throw AppError.notFound('Job not found');
    return job;
  }

  return {
    findByPublicId,

    async create({ file, model, scale }) {
      await modelService.assertAvailable(model);
      const { ext } = ALLOWED_IMAGE_TYPES[file.detectedMime];
      const originalKey = await storage.save(BUCKETS.ORIGINALS, file.buffer, ext);
      try {
        const job = await Job.create({
          originalName: sanitizeFilename(file.originalname),
          mimeType: file.detectedMime,
          sizeBytes: file.size,
          model,
          scale,
          files: { original: originalKey },
          expiresAt: new Date(Date.now() + retentionHours * HOUR_MS),
        });
        onJobCreated(job);
        return job;
      } catch (err) {
        await storage.remove(originalKey);
        throw err;
      }
    },

    async remove(publicId) {
      const job = await findByPublicId(publicId);
      if (job.status === JOB_STATUS.PROCESSING) {
        throw AppError.conflict('Job is currently processing and cannot be deleted');
      }
      await Promise.all(Object.values(job.files.toObject()).map((key) => storage.remove(key)));
      await job.deleteOne();
    },
  };
}

/** Keeps a display-safe filename: strips paths, control chars and odd symbols. */
export function sanitizeFilename(name = 'image') {
  const base = String(name).split(/[\\/]/).pop();
  const cleaned = base.replace(/[^\w.\- ]+/g, '_').replace(/^\.+/, '').slice(0, 200);
  return cleaned || 'image';
}
