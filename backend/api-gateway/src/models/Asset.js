/**
 * Asset: an uploaded source image. The original file is written once, made read-only and
 * fingerprinted (SHA-256) so its integrity can be re-verified at any time. It is never modified.
 */
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema(
  {
    publicId: { type: String, default: randomUUID, unique: true },
    experimentId: { type: String, default: null, index: true },
    originalName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    sha256: { type: String, required: true, match: /^[0-9a-f]{64}$/ },
    files: {
      original: { type: String, required: true },
      preview: String, // generated PNG for formats browsers cannot display (TIFF)
    },
    analysis: { type: mongoose.Schema.Types.Mixed, default: null },
    recommendation: { type: mongoose.Schema.Types.Mixed, default: null },
    analysisError: { type: String, maxlength: 300 },
    expiresAt: { type: Date, default: null, index: true }, // null = retained (experiment data)
  },
  { timestamps: true, versionKey: false },
);

export const Asset = mongoose.model('Asset', assetSchema);
