/** Run creation (single / comparison / batch) and batch progress. */
import { sendSuccess } from '../views/responseView.js';
import { toBatchView } from '../views/researchViews.js';

export function createRunController({ runService, runControlService }) {
  return {
    async create(req, res) {
      const { batchId } = await runService.create(req.validated);
      const view = toBatchView(await runService.progress(batchId));
      res.location(view.links.self);
      return sendSuccess(res, view, { status: 202 });
    },

    async batch(req, res) {
      return sendSuccess(res, toBatchView(await runService.progress(req.params.id)));
    },

    async retryBatch(req, res) {
      const result = await runControlService.retryBatch(req.params.id);
      return sendSuccess(res, { ...result, batch: toBatchView(await runService.progress(req.params.id)) });
    },

    async cancelBatch(req, res) {
      const result = await runControlService.cancelBatch(req.params.id);
      return sendSuccess(res, { ...result, batch: toBatchView(await runService.progress(req.params.id)) });
    },

    async retryJob(req, res) {
      return sendSuccess(res, await runControlService.retryJob(req.params.id));
    },
  };
}
