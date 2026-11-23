/**
 * Model catalogue proxy. The AI service is the source of truth; results are cached
 * briefly so uploads don't trigger a catalogue request every time.
 */
import { AppError } from '../utils/AppError.js';

export function createModelService({ aiClient, ttlMs = 15_000 }) {
  let cache = null;
  let cachedAt = 0;

  async function catalogue() {
    if (cache && Date.now() - cachedAt < ttlMs) return cache;
    cache = await aiClient.models();
    cachedAt = Date.now();
    return cache;
  }

  return {
    catalogue,

    /** Throws unless the model exists and can run on the AI service right now. */
    async assertAvailable(modelId) {
      const { models = [] } = await catalogue();
      const model = models.find((m) => m.id === modelId);
      if (!model) throw AppError.badRequest(`Unknown model "${modelId}"`);
      if (!model.available) {
        throw new AppError(`Model "${model.name}" is unavailable: ${model.unavailableReason}`, {
          status: 422,
          code: 'MODEL_UNAVAILABLE',
        });
      }
      return model;
    },

    invalidate() {
      cache = null;
    },
  };
}
