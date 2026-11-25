/** Dashboard analytics computed with MongoDB aggregation pipelines. */
import { JOB_STATUS } from '../config/constants.js';
import { Asset } from '../models/Asset.js';
import { Experiment } from '../models/Experiment.js';
import { Job } from '../models/Job.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const round = (v, d = 3) => (typeof v === 'number' ? Number(v.toFixed(d)) : null);

function byModelPipeline() {
  return [
    { $group: {
      _id: '$model',
      runs: { $sum: 1 },
      completed: { $sum: { $cond: [{ $eq: ['$status', JOB_STATUS.COMPLETED] }, 1, 0] } },
      failed: { $sum: { $cond: [{ $eq: ['$status', JOB_STATUS.FAILED] }, 1, 0] } },
      avgDurationMs: { $avg: '$metrics.durationMs' },
      avgPsnr: { $avg: '$quality.consistency.psnr' },
      avgSsim: { $avg: '$quality.consistency.ssim' },
      avgNoiseIn: { $avg: '$quality.noReference.input.noiseSigma' },
      avgNoiseOut: { $avg: '$quality.noReference.output.noiseSigma' },
    } },
    { $sort: { runs: -1 } },
  ];
}

function timelinePipeline(days) {
  const since = new Date(Date.now() - (days - 1) * DAY_MS);
  since.setUTCHours(0, 0, 0, 0);
  return [
    { $match: { createdAt: { $gte: since } } },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      runs: { $sum: 1 },
      completed: { $sum: { $cond: [{ $eq: ['$status', JOB_STATUS.COMPLETED] }, 1, 0] } },
      failed: { $sum: { $cond: [{ $eq: ['$status', JOB_STATUS.FAILED] }, 1, 0] } },
    } },
  ];
}

/** Fills missing days with zeros so charts have a continuous axis. */
function fillDays(rows, days) {
  const map = new Map(rows.map((r) => [r._id, r]));
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10);
    const row = map.get(date);
    return { date, runs: row?.runs ?? 0, completed: row?.completed ?? 0, failed: row?.failed ?? 0 };
  });
}

export function createStatsService() {
  return {
    async overview({ days = 14 } = {}) {
      const [experiments, images, statusRows, models, ops, timeline, devices, recent, overall] = await Promise.all([
        Experiment.countDocuments(),
        Asset.countDocuments(),
        Job.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
        Job.aggregate(byModelPipeline()),
        Job.aggregate([{ $unwind: '$pipeline.steps' }, { $group: { _id: '$pipeline.steps.op', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
        Job.aggregate(timelinePipeline(days)),
        Job.aggregate([{ $match: { 'metrics.device': { $ne: null } } }, { $group: { _id: '$metrics.device', n: { $sum: 1 } } }]),
        Job.find().sort({ createdAt: -1 }).limit(8),
        Job.aggregate([{ $match: { status: JOB_STATUS.COMPLETED } }, { $group: { _id: null, avg: { $avg: '$metrics.durationMs' }, models: { $addToSet: '$model' } } }]),
      ]);
      const status = Object.fromEntries(Object.values(JOB_STATUS).map((s) => [s, 0]));
      statusRows.forEach((r) => { status[r._id] = r.n; });
      const runs = Object.values(status).reduce((a, b) => a + b, 0);
      const finished = status.completed + status.failed;

      return {
        totals: { experiments, images, runs, ...status },
        days,
        avgDurationMs: round(overall[0]?.avg ?? null, 0),
        modelsUsed: overall[0]?.models.length ?? 0,
        successRate: finished ? round(status.completed / finished, 4) : null,
        byModel: models.map((m) => ({
          model: m._id, runs: m.runs, completed: m.completed, failed: m.failed,
          avgDurationMs: round(m.avgDurationMs, 0), avgPsnr: round(m.avgPsnr, 2), avgSsim: round(m.avgSsim, 4),
          avgNoiseReduction: m.avgNoiseIn != null ? round(m.avgNoiseIn - m.avgNoiseOut, 5) : null,
        })),
        operations: ops.map((o) => ({ op: o._id, count: o.n })),
        timeline: fillDays(timeline, days),
        devices: devices.map((d) => ({ device: d._id, runs: d.n })),
        recent,
      };
    },
  };
}
