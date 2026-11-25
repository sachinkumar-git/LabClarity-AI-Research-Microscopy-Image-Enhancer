/** Reading, listing and deleting runs, plus the legacy single-upload endpoint. */
import { JOB_STATUS } from '../config/constants.js';
import { Job } from '../models/Job.js';
import { AppError } from '../utils/AppError.js';

export { sanitizeFilename } from '../utils/sanitize.js';

const LIST_FILTERS = ['experimentId', 'assetId', 'batchId', 'status', 'model'];

export function createJobService({ storage, modelService, getAssetService, getRunService }) {
  async function findByPublicId(publicId) {
    const job = await Job.findOne({ publicId });
    if (!job) throw AppError.notFound('Job not found');
    return job;
  }

  return {
    findByPublicId,

    /** Legacy API: upload one image and run a single super-resolution model on it. */
    async create({ file, model, scale }) {
      await modelService.assertAvailable(model); // fail fast, before storing anything
      const [asset] = await getAssetService().createMany([file]);
      const steps = [{ op: 'super_resolution', model, scale }];
      try {
        const { jobs } = await getRunService().create({ assetIds: [asset.publicId], pipelines: [{ steps }] });
        return jobs[0];
      } catch (err) {
        await getAssetService().remove(asset.publicId);
        throw err;
      }
    },

    async list(query = {}, { limit = 50, page = 1 } = {}) {
      const filter = Object.fromEntries(LIST_FILTERS.filter((k) => query[k]).map((k) => [k, query[k]]));
      const [items, total] = await Promise.all([
        Job.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        Job.countDocuments(filter),
      ]);
      return { items, total, page, limit };
    },

    /** Deletes a run and its outputs. The source image (original) is owned by its asset and kept. */
    async remove(publicId) {
      const job = await findByPublicId(publicId);
      if (job.status === JOB_STATUS.PROCESSING) {
        throw AppError.conflict('Job is currently processing and cannot be deleted');
      }
      const { enhanced, enhancedData, diff } = job.files;
      await Promise.all([enhanced, enhancedData, diff].map((key) => storage.remove(key)));
      await job.deleteOne();
    },
  };
}
