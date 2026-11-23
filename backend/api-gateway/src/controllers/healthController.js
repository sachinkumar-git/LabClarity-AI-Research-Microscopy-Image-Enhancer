/** Liveness / readiness probes for orchestration and monitoring. */
import { isDatabaseConnected } from '../config/database.js';
import { sendSuccess } from '../views/responseView.js';

export function createHealthController({ aiClient }) {
  return {
    /** Process is up. Never touches dependencies. */
    live(req, res) {
      return sendSuccess(res, { status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
    },

    /** Dependencies are reachable. DB is required; AI service being down means "degraded". */
    async ready(req, res) {
      const database = isDatabaseConnected() ? 'up' : 'down';
      let aiService = 'down';
      let aiDetails;
      try {
        aiDetails = await aiClient.health();
        aiService = 'up';
      } catch {
        aiService = 'down';
      }

      const status = database === 'down' ? 'unavailable' : aiService === 'down' ? 'degraded' : 'ok';
      const httpStatus = database === 'down' ? 503 : 200;
      return sendSuccess(
        res,
        { status, dependencies: { database, aiService }, ai: aiDetails?.data },
        { status: httpStatus },
      );
    },
  };
}
