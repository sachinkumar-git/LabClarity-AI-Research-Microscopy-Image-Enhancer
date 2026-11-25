/**
 * Periodically deletes expired ad-hoc data (experiment data has no expiry).
 * Expired images cascade to their runs; orphaned expired runs are removed individually.
 */
import { JOB_STATUS } from '../config/constants.js';
import { Asset } from '../models/Asset.js';
import { Job } from '../models/Job.js';
import { logger } from '../utils/logger.js';

const expired = () => ({ expiresAt: { $ne: null, $lte: new Date() } });

export function createCleanupService({ jobService, getAssetService, intervalMs = 15 * 60 * 1000 }) {
  let timer = null;

  async function removeAll(docs, remove) {
    let removed = 0;
    for (const { publicId } of docs) {
      try {
        await remove(publicId);
        removed += 1;
      } catch (err) {
        logger.warn('Cleanup skipped item', { id: publicId, error: err.message });
      }
    }
    return removed;
  }

  async function runOnce() {
    const assets = await Asset.find(expired()).select('publicId');
    const removedAssets = await removeAll(assets, (id) => getAssetService().remove(id));
    const jobs = await Job.find({ ...expired(), status: { $ne: JOB_STATUS.PROCESSING } }).select('publicId');
    const removedJobs = await removeAll(jobs, (id) => jobService.remove(id));
    const total = removedAssets + removedJobs;
    if (total) logger.info('Expired data removed', { images: removedAssets, runs: removedJobs });
    return total;
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
