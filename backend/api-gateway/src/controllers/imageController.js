/** HTTP layer for runs (jobs) and their files. Delegates all logic to services. */
import path from 'node:path';
import { AppError } from '../utils/AppError.js';
import { sendStoredFile } from '../utils/sendStoredFile.js';
import { sendSuccess } from '../views/responseView.js';
import { toJobSummary, toJobView } from '../views/jobView.js';

/** Output names always carry an explicit "processed" label, never the original's name alone. */
const outputName = (job, suffix = '') =>
  `${path.parse(job.originalName).name}_processed_${job.model}_x${job.scale}${suffix}.png`;

export function createImageController({ jobService, storage }) {
  const send = (res, key, opts) => sendStoredFile(res, storage, key, opts);

  async function completedFile(req, linkName, message) {
    const job = await jobService.findByPublicId(req.params.id);
    if (!toJobView(job).links[linkName]) throw AppError.notFound(message);
    return job;
  }

  return {
    async create(req, res) {
      const job = await jobService.create({ file: req.file, ...req.validated });
      const view = toJobView(job);
      res.location(view.links.self);
      return sendSuccess(res, view, { status: 202 });
    },

    async list(req, res) {
      const { filter, limit, page } = req.validated;
      const { items, total } = await jobService.list(filter, { limit, page });
      return sendSuccess(res, items.map(toJobSummary), { meta: { total, page, limit } });
    },

    async show(req, res) {
      return sendSuccess(res, toJobView(await jobService.findByPublicId(req.params.id)));
    },

    async original(req, res) {
      const job = await jobService.findByPublicId(req.params.id);
      return send(res, job.files.original, { contentType: job.mimeType, downloadName: job.originalName });
    },

    async preview(req, res) {
      const job = await completedFile(req, 'preview', 'Preview not available');
      // A generated PNG preview wins; browser-safe originals can be served directly.
      if (job.files.preview) return send(res, job.files.preview, { contentType: 'image/png' });
      return send(res, job.files.original, { contentType: job.mimeType });
    },

    async enhanced(req, res) {
      const job = await completedFile(req, 'enhanced', 'Enhanced image not available yet');
      const downloadName = req.query.download === '1' ? outputName(job) : undefined;
      return send(res, job.files.enhanced, { contentType: 'image/png', downloadName });
    },

    /** 16-bit grayscale result at the original intensity scale, for quantitative analysis. */
    async enhancedData(req, res) {
      const job = await completedFile(req, 'enhancedData', '16-bit data not available');
      return send(res, job.files.enhancedData, { contentType: 'image/png', downloadName: outputName(job, '_16bit') });
    },

    async diff(req, res) {
      const job = await completedFile(req, 'diff', 'Difference map not available');
      const downloadName = req.query.download === '1' ? outputName(job, '_difference') : undefined;
      return send(res, job.files.diff, { contentType: 'image/png', downloadName });
    },

    async destroy(req, res) {
      await jobService.remove(req.params.id);
      return res.status(204).end();
    },
  };
}
