/** Frontend configuration. Only public, non-secret values belong here. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
export const API_PREFIX = '/api/v1';

export const MAX_UPLOAD_MB = 25;
export const ACCEPTED_TYPES = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/tiff': ['.tif', '.tiff'],
};

export const SCALES = [2, 4];
export const DEFAULT_SCALE = 4;

export const POLL_INTERVAL_MS = 1500;
export const MODELS_REFRESH_MS = 30_000;
