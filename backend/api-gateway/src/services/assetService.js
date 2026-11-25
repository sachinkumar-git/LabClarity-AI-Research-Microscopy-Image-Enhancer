/**
 * Source images. Originals are hashed, written once, write-protected and never modified.
 * Each upload is analysed by the AI service (degradation metrics + recommended pipeline).
 */
import { ALLOWED_IMAGE_TYPES, JOB_STATUS } from '../config/constants.js';
import { Asset } from '../models/Asset.js';
import { Job } from '../models/Job.js';
import { AppError } from '../utils/AppError.js';
import { expiresAtFor } from '../utils/retention.js';
import { sanitizeFilename } from '../utils/sanitize.js';
import { logger } from '../utils/logger.js';
import { BUCKETS, sha256 } from './storageService.js';

const BROWSER_SAFE = new Set(['image/png', 'image/jpeg']);

export function createAssetService({ storage, aiClient, experimentService, retentionHours }) {
  async function findByPublicId(publicId) {
    const asset = await Asset.findOne({ publicId });
    if (!asset) throw AppError.notFound('Image not found');
    return asset;
  }

  async function analyse(input) {
    try {
      return { ...(await aiClient.analyze(input)), analysisError: undefined };
    } catch (err) {
      if (err.code === 'AI_REJECTED_INPUT') throw err; // undecodable image: reject the upload
      logger.warn('Analysis unavailable', { error: err.message });
      return { analysis: null, recommendation: null, analysisError: 'Analysis unavailable' };
    }
  }

  async function createOne(file, experimentId) {
    const input = { buffer: file.buffer, mimeType: file.detectedMime, filename: sanitizeFilename(file.originalname) };
    const preview = BROWSER_SAFE.has(file.detectedMime) ? null : await aiClient.preview(input);
    const { analysis, recommendation, analysisError } = await analyse(input);

    const original = await storage.save(BUCKETS.ORIGINALS, file.buffer, ALLOWED_IMAGE_TYPES[file.detectedMime].ext);
    await storage.protect(original);
    const previewKey = preview ? await storage.save(BUCKETS.PREVIEWS, preview.buffer, '.png') : undefined;
    try {
      return await Asset.create({
        experimentId: experimentId ?? null,
        originalName: input.filename,
        mimeType: file.detectedMime,
        sizeBytes: file.size,
        sha256: sha256(file.buffer),
        files: { original, preview: previewKey },
        analysis,
        recommendation,
        analysisError,
        expiresAt: expiresAtFor(experimentId, retentionHours),
      });
    } catch (err) {
      await Promise.all([storage.remove(original), storage.remove(previewKey)]);
      throw err;
    }
  }

  return {
    findByPublicId,

    async createMany(files, { experimentId } = {}) {
      if (experimentId) await experimentService.findByPublicId(experimentId);
      const assets = [];
      for (const file of files) assets.push(await createOne(file, experimentId)); // sequential: bounded memory/AI load
      return assets;
    },

    async findMany(publicIds) {
      const assets = await Asset.find({ publicId: { $in: publicIds } });
      if (assets.length !== new Set(publicIds).size) throw AppError.notFound('One or more images were not found');
      return assets;
    },

    list({ experimentId, limit = 50 } = {}) {
      const filter = experimentId ? { experimentId } : {};
      return Asset.find(filter).sort({ createdAt: -1 }).limit(limit);
    },

    /** Re-hashes the stored original and compares it with the fingerprint taken at upload. */
    async verify(publicId) {
      const asset = await findByPublicId(publicId);
      const actual = await storage.hash(asset.files.original);
      return { recorded: asset.sha256, actual, intact: actual === asset.sha256, checkedAt: new Date() };
    },

    /** Deletes an image together with all runs derived from it. */
    async remove(publicId) {
      const asset = await findByPublicId(publicId);
      const jobs = await Job.find({ assetId: publicId });
      if (jobs.some((j) => j.status === JOB_STATUS.PROCESSING)) {
        throw AppError.conflict('A run on this image is processing; try again when it finishes');
      }
      const outputs = jobs.flatMap((j) => [j.files.enhanced, j.files.enhancedData, j.files.diff]);
      await Promise.all([...outputs, asset.files.original, asset.files.preview].map((k) => storage.remove(k)));
      await Job.deleteMany({ assetId: publicId });
      await asset.deleteOne();
    },
  };
}
