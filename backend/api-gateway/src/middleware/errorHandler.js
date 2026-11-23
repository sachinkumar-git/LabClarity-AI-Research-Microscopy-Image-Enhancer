/** Central 404 + error handling. Never leaks stack traces or internals to clients. */
import multer from 'multer';
import mongoose from 'mongoose';
import { ERROR_CODES } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { sendError } from '../views/responseView.js';

export function notFoundHandler(req, res, next) {
  next(AppError.notFound(`Route ${req.method} ${req.path} not found`));
}

function normalizeError(err) {
  if (err instanceof AppError) return err;

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return new AppError('Uploaded file is too large', {
        status: 413,
        code: ERROR_CODES.PAYLOAD_TOO_LARGE,
      });
    }
    return AppError.badRequest(`Upload error: ${err.message}`);
  }

  if (err instanceof mongoose.Error.CastError) return AppError.notFound('Resource not found');
  if (err instanceof mongoose.Error.ValidationError) {
    return AppError.badRequest('Validation failed', Object.keys(err.errors));
  }
  if (err.type === 'entity.too.large') {
    return new AppError('Request body too large', { status: 413, code: ERROR_CODES.PAYLOAD_TOO_LARGE });
  }
  if (err.type === 'entity.parse.failed') return AppError.badRequest('Malformed JSON body');

  return null;
}

// Express identifies error handlers by their 4-argument signature.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const appError = normalizeError(err);

  if (!appError) {
    logger.error('Unhandled error', { path: req.originalUrl, error: err.message, stack: err.stack });
    return sendError(res, {
      status: 500,
      code: ERROR_CODES.INTERNAL,
      message: 'An unexpected error occurred',
    });
  }

  if (appError.status >= 500) logger.error(appError.message, { code: appError.code });
  return sendError(res, appError);
}
