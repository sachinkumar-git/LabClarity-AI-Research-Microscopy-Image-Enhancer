/** Research workspace: experiments with their images and run history. */
import { sendSuccess } from '../views/responseView.js';
import { toJobSummary } from '../views/jobView.js';
import { toAssetView, toExperimentView } from '../views/researchViews.js';

export function createExperimentController({ experimentService, assetService, jobService }) {
  return {
    async list(req, res) {
      const { experiments, counts } = await experimentService.list();
      return sendSuccess(res, experiments.map((e) => toExperimentView(e, counts)));
    },

    async create(req, res) {
      const experiment = await experimentService.create(req.validated);
      return sendSuccess(res, toExperimentView(experiment), { status: 201 });
    },

    async show(req, res) {
      const experiment = await experimentService.findByPublicId(req.params.id);
      const [counts, assets, runs] = await Promise.all([
        experimentService.countsFor([experiment.publicId]),
        assetService.list({ experimentId: experiment.publicId, limit: 200 }),
        jobService.list({ experimentId: experiment.publicId }, { limit: 100 }),
      ]);
      return sendSuccess(res, {
        ...toExperimentView(experiment, counts),
        images: assets.map(toAssetView),
        runs: runs.items.map(toJobSummary),
      });
    },

    async update(req, res) {
      const experiment = await experimentService.update(req.params.id, req.validated);
      return sendSuccess(res, toExperimentView(experiment));
    },

    async destroy(req, res) {
      await experimentService.remove(req.params.id);
      return res.status(204).end();
    },
  };
}
