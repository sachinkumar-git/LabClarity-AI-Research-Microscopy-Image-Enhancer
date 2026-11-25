/** Source images: batch upload (with analysis), listing, files and integrity verification. */
import { UUID_PATTERN } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';
import { sendStoredFile } from '../utils/sendStoredFile.js';
import { sendSuccess } from '../views/responseView.js';
import { toAssetView } from '../views/researchViews.js';

export function createAssetController({ assetService, storage }) {
  return {
    async create(req, res) {
      const experimentId = req.body?.experimentId || undefined;
      if (experimentId && !UUID_PATTERN.test(experimentId)) throw AppError.badRequest('Invalid experimentId');
      const assets = await assetService.createMany(req.files, { experimentId });
      return sendSuccess(res, assets.map(toAssetView), { status: 201 });
    },

    async list(req, res) {
      const { experimentId } = req.query;
      if (experimentId && !UUID_PATTERN.test(experimentId)) throw AppError.badRequest('Invalid experimentId');
      const assets = await assetService.list({ experimentId, limit: 200 });
      return sendSuccess(res, assets.map(toAssetView));
    },

    async show(req, res) {
      return sendSuccess(res, toAssetView(await assetService.findByPublicId(req.params.id)));
    },

    async original(req, res) {
      const asset = await assetService.findByPublicId(req.params.id);
      return sendStoredFile(res, storage, asset.files.original, {
        contentType: asset.mimeType,
        downloadName: asset.originalName,
      });
    },

    async preview(req, res) {
      const asset = await assetService.findByPublicId(req.params.id);
      if (!toAssetView(asset).links.preview) throw AppError.notFound('Preview not available');
      const key = asset.files.preview ?? asset.files.original;
      return sendStoredFile(res, storage, key, { contentType: asset.files.preview ? 'image/png' : asset.mimeType });
    },

    async verify(req, res) {
      return sendSuccess(res, await assetService.verify(req.params.id));
    },

    async destroy(req, res) {
      await assetService.remove(req.params.id);
      return res.status(204).end();
    },
  };
}
