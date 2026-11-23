/** Periodically deletes expired jobs together with their stored files (data retention). */
import { JOB_STATUS } from '../config/constants.js';
import { Job } from '../models/Job.js';
import { logger } from '../utils/logger.js';

export function createCleanupService({ jobService, intervalMs = 15 * 60 * 1000 }) {
  let timer = null;

  async function runOnce() {
    const expired = await Job.find({
      expiresAt: { $lte: new Date() },
      status: { $ne: JOB_STATUS.PROCESSING },
    }).select('publicId');

    let removed = 0;
    for (const { publicId } of expired) {
      try {
        await jobService.remove(publicId);
        removed += 1;
      } catch (err) {
        logger.warn('Cleanup failed for job', { id: publicId, error: err.message });
      }
    }
    if (removed) logger.info('Expired jobs removed', { count: removed });
    return removed;
  }

  return {
    runOnce,
    start() {
      if (timer) return;
      timer = setInterval(() => runOnce().catch((e) => logger.error('Cleanup error', { error: e.message })), intervalMs);
      timer.unref();
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
  };
}
