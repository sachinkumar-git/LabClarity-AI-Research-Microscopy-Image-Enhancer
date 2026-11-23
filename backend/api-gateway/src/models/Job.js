/**
 * Job model: one enhancement request and its lifecycle.
 * Clients only ever see `publicId` (random UUID), so job URLs are unguessable.
 */
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { JOB_STATUS } from '../config/constants.js';

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
    originalName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    model: { type: String, required: true },
    scale: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(JOB_STATUS),
      default: JOB_STATUS.QUEUED,
      index: true,
    },
    files: {
      original: { type: String, required: true },
      preview: String,
      enhanced: String, // 8-bit display PNG
      enhancedData: String, // optional 16-bit PNG at original intensity scale
    },
    metrics: metricsSchema,
    errorMessage: { type: String, maxlength: 500 },
    startedAt: Date,
    completedAt: Date,
    expiresAt: { type: Date, index: true },
  },
  { timestamps: true, versionKey: false },
);

export const Job = mongoose.model('Job', jobSchema);
