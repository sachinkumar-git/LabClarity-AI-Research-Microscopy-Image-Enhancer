/** Exposes the AI model catalogue, pipeline operations and runtime to the frontend. */
import { sendSuccess } from '../views/responseView.js';
import { toModelView } from '../views/modelView.js';

export function createModelController({ modelService }) {
  return {
    async list(req, res) {
      const { models = [], operations = [], runtime } = await modelService.catalogue();
      return sendSuccess(res, {
        models: models.map(toModelView),
        operations,
        runtime: runtime ? { device: runtime.device, gpu: runtime.gpu ?? null } : null,
      });
    },
  };
}
