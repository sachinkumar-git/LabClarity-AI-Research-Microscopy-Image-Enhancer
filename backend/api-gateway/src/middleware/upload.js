/**
 * Image upload handling: size-limited in-memory parsing followed by
 * magic-byte verification before anything touches disk.
 */
import multer from 'multer';
import { ALLOWED_IMAGE_TYPES } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';
import { detectImageType } from '../utils/fileSignature.js';

export const UPLOAD_FIELD = 'image';

export function createUploadMiddleware({ maxFileSizeMb }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSizeMb * 1024 * 1024,
      files: 1,
      fields: 5,
      fieldSize: 1024,
      parts: 6,
    },
  }).single(UPLOAD_FIELD);
}

/** Rejects missing files and files whose content is not an allowed image format. */
export function verifyImageFile(req, res, next) {
  if (!req.file) return next(AppError.badRequest(`An image file is required in field "${UPLOAD_FIELD}"`));

  const detected = detectImageType(req.file.buffer);
  if (!detected || !ALLOWED_IMAGE_TYPES[detected]) {
    return next(AppError.unsupportedMedia('Only PNG, JPEG and TIFF images are supported'));
  }
  req.file.detectedMime = detected;
  return next();
}

export const BATCH_UPLOAD_FIELD = 'images';

/** Multi-file upload for batches; every file is verified by magic bytes. */
export function createBatchUploadMiddleware({ maxFileSizeMb, maxBatchFiles }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSizeMb * 1024 * 1024,
      files: maxBatchFiles,
      fields: 3,
      fieldSize: 200,
      parts: maxBatchFiles + 3,
    },
  }).array(BATCH_UPLOAD_FIELD, maxBatchFiles);
}

export function verifyImageFiles(req, res, next) {
  if (!req.files?.length) return next(AppError.badRequest(`At least one image is required in field "${BATCH_UPLOAD_FIELD}"`));
  for (const file of req.files) {
    const detected = detectImageType(file.buffer);
    if (!detected || !ALLOWED_IMAGE_TYPES[detected]) {
      return next(AppError.unsupportedMedia(`"${file.originalname}" is not a PNG, JPEG or TIFF image`));
    }
    file.detectedMime = detected;
  }
  return next();
}
