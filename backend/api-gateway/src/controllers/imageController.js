/** HTTP layer for image enhancement jobs. Delegates all logic to services. */
import path from 'node:path';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../views/responseView.js';
import { toJobView } from '../views/jobView.js';

const CACHE_HEADER = 'private, max-age=3600';

export function createImageController({ jobService, storage }) {
  function sendStoredFile(res, key, { contentType, downloadName } = {}) {
    const headers = { 'Cache-Control': CACHE_HEADER };
    if (contentType) headers['Content-Type'] = contentType;
    if (downloadName) headers['Content-Disposition'] = `attachment; filename="${downloadName}"`;
    return res.sendFile(storage.pathFor(key), { headers });
  }

  return {
    async create(req, res) {
      const job = await jobService.create({ file: req.file, ...req.validated });
      const view = toJobView(job);
      res.location(view.links.self);
      return sendSuccess(res, view, { status: 202 });
    },

    async show(req, res) {
      const job = await jobService.findByPublicId(req.params.id);
      return sendSuccess(res, toJobView(job));
    },

    async original(req, res) {
      const job = await jobService.findByPublicId(req.params.id);
      return sendStoredFile(res, job.files.original, {
        contentType: job.mimeType,
        downloadName: job.originalName,
      });
    },

    async preview(req, res) {
      const job = await jobService.findByPublicId(req.params.id);
      if (!toJobView(job).links.preview) throw AppError.notFound('Preview not available yet');
      // A generated PNG preview wins; browser-safe originals can be served directly.
      if (job.files.preview) return sendStoredFile(res, job.files.preview, { contentType: 'image/png' });
      return sendStoredFile(res, job.files.original, { contentType: job.mimeType });
    },

    async enhanced(req, res) {
      const job = await jobService.findByPublicId(req.params.id);
      if (!toJobView(job).links.enhanced) throw AppError.notFound('Enhanced image not available yet');
      const stem = path.parse(job.originalName).name;
      const downloadName = req.query.download === '1' ? `${stem}_${job.model}_x${job.scale}.png` : undefined;
      return sendStoredFile(res, job.files.enhanced, { contentType: 'image/png', downloadName });
    },

    /** 16-bit grayscale result at the original intensity scale, for quantitative analysis. */
    async enhancedData(req, res) {
      const job = await jobService.findByPublicId(req.params.id);
      if (!toJobView(job).links.enhancedData) throw AppError.notFound('16-bit data not available');
      const stem = path.parse(job.originalName).name;
      return sendStoredFile(res, job.files.enhancedData, {
        contentType: 'image/png',
        downloadName: `${stem}_${job.model}_x${job.scale}_16bit.png`,
      });
    },

    async destroy(req, res) {
      await jobService.remove(req.params.id);
      return res.status(204).end();
    },
  };
}
