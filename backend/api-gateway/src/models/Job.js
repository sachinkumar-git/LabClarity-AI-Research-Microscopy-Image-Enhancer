/**
 * Job: one processing run of a pipeline on one source asset.
 * Clients only ever see `publicId` (random UUID), so job URLs are unguessable.
 * `files.original`/`files.preview` reference the asset's files (owned by the asset, never deleted here).
 */
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { JOB_STATUS } from '../config/constants.js';

const { Mixed } = mongoose.Schema.Types;

const metricsSchema = new mongoose.Schema(
  {
    inputWidth: Number,
    inputHeight: Number,
    outputWidth: Number,
    outputHeight: Number,
    bitDepth: Number,
    device: String,
    durationMs: Number,
  },
  { _id: false },
);

const jobSchema = new mongoose.Schema(
  {
    publicId: { type: String, default: randomUUID, unique: true },
    assetId: { type: String, index: true },
    experimentId: { type: String, default: null, index: true },
    batchId: { type: String, default: null, index: true },
    label: { type: String, maxlength: 80 },
    originalName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    inputSha256: { type: String },
    model: { type: String, required: true }, // primary model (SR model, or last AI/op used)
    scale: { type: Number, required: true }, // overall magnification (1 = same size)
    pipeline: { type: Mixed, default: null }, // validated, normalised pipeline spec
    roi: { type: Mixed, default: null },
    referenceAssetId: { type: String, default: null },
    status: { type: String, enum: Object.values(JOB_STATUS), default: JOB_STATUS.QUEUED, index: true },
    files: {
      original: { type: String, required: true },
      preview: String,
      enhanced: String, // 8-bit display PNG (labelled as AI-processed)
      enhancedData: String, // optional 16-bit PNG at original intensity scale
      diff: String, // difference heatmap
    },
    metrics: metricsSchema,
    quality: { type: Mixed, default: null },
    audit: { type: Mixed, default: null }, // full provenance from the AI service + gateway
    errorMessage: { type: String, maxlength: 500 },
    startedAt: Date,
    completedAt: Date,
    expiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

jobSchema.index({ experimentId: 1, createdAt: -1 });

export const Job = mongoose.model('Job', jobSchema);
