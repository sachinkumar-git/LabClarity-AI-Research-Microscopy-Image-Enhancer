/** Client-side pre-checks for fast feedback. The server re-validates everything. */
import { ACCEPTED_TYPES, MAX_UPLOAD_MB } from '../config.js';

const EXTENSIONS = Object.values(ACCEPTED_TYPES).flat();

export function validateFile(file) {
  if (!file) return 'Please choose an image file.';
  const name = file.name.toLowerCase();
  const typeOk = file.type in ACCEPTED_TYPES || EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!typeOk) return 'Unsupported format. Use PNG, JPEG or TIFF.';
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `File is larger than ${MAX_UPLOAD_MB} MB.`;
  return null;
}

