/** Application-wide constants (non-secret, non-environment specific). */

export const API_PREFIX = '/api/v1';

export const JOB_STATUS = Object.freeze({
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

/** Accepted image formats, keyed by MIME type. Verified by magic bytes, not by extension. */
export const ALLOWED_IMAGE_TYPES = Object.freeze({
  'image/png': { ext: '.png' },
  'image/jpeg': { ext: '.jpg' },
  'image/tiff': { ext: '.tif' },
});

export const ALLOWED_SCALES = Object.freeze([2, 4]);
export const DEFAULT_SCALE = 4;

/** Model ids must be short slugs; the AI service is the source of truth for which exist. */
export const MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,63}$/;

export const ERROR_CODES = Object.freeze({
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNSUPPORTED_MEDIA: 'UNSUPPORTED_MEDIA_TYPE',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  RATE_LIMITED: 'RATE_LIMITED',
  CONFLICT: 'CONFLICT',
  AI_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  INTERNAL: 'INTERNAL_ERROR',
});
