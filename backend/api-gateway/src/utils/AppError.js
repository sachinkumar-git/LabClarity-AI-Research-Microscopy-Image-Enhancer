import { ERROR_CODES } from '../config/constants.js';

/** Operational error with an HTTP status and a stable machine-readable code. */
export class AppError extends Error {
  constructor(message, { status = 500, code = ERROR_CODES.INTERNAL, details } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(message, details) {
    return new AppError(message, { status: 400, code: ERROR_CODES.VALIDATION, details });
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, { status: 404, code: ERROR_CODES.NOT_FOUND });
  }

  static unsupportedMedia(message) {
    return new AppError(message, { status: 415, code: ERROR_CODES.UNSUPPORTED_MEDIA });
  }

  static conflict(message) {
    return new AppError(message, { status: 409, code: ERROR_CODES.CONFLICT });
  }

  static aiUnavailable(message = 'AI service is unavailable') {
    return new AppError(message, { status: 503, code: ERROR_CODES.AI_UNAVAILABLE });
  }
}
