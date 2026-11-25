/** Experiments: CRUD plus summary counts. Deleting cascades to images and runs. */
import { Asset } from '../models/Asset.js';
import { Experiment } from '../models/Experiment.js';
import { Job } from '../models/Job.js';
import { AppError } from '../utils/AppError.js';

export function createExperimentService({ getAssetService }) {
  async function findByPublicId(publicId) {
    const experiment = await Experiment.findOne({ publicId });
    if (!experiment) throw AppError.notFound('Experiment not found');
    return experiment;
  }

  async function countsFor(ids) {
    const group = (Model) =>
      Model.aggregate([{ $match: { experimentId: { $in: ids } } }, { $group: { _id: '$experimentId', n: { $sum: 1 } } }]);
    const [assets, jobs] = await Promise.all([group(Asset), group(Job)]);
    const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.n]));
    return { assets: toMap(assets), jobs: toMap(jobs) };
  }

  return {
    findByPublicId,
    countsFor,

    create(input) {
      return Experiment.create(input);
    },

    async list({ limit = 100 } = {}) {
      const experiments = await Experiment.find().sort({ updatedAt: -1 }).limit(limit);
      return { experiments, counts: await countsFor(experiments.map((e) => e.publicId)) };
    },

    async update(publicId, changes) {
      const experiment = await findByPublicId(publicId);
      experiment.set(changes);
      return experiment.save();
    },

    async remove(publicId) {
      await findByPublicId(publicId);
      const assets = await Asset.find({ experimentId: publicId }).select('publicId');
      for (const { publicId: assetId } of assets) await getAssetService().remove(assetId);
      await Job.deleteMany({ experimentId: publicId, assetId: { $exists: false } });
      await Experiment.deleteOne({ publicId });
    },
  };
}
