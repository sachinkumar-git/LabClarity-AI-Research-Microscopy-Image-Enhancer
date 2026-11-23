/** Exposes the AI model catalogue (with per-host availability) to the frontend. */
import { sendSuccess } from '../views/responseView.js';
import { toModelView } from '../views/modelView.js';

export function createModelController({ modelService }) {
  return {
    async list(req, res) {
      const { models = [], runtime } = await modelService.catalogue();
      return sendSuccess(res, {
        models: models.map(toModelView),
        runtime: runtime ? { device: runtime.device, gpu: runtime.gpu ?? null } : null,
      });
    },
  };
}
