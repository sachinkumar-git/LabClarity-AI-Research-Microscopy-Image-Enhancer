/**
 * Per-IP rate limiting. Reads (GET/HEAD) are cheap and the UI polls them while jobs run, so
 * they get a generous budget; writes keep a strict one; uploads have their own, stricter limit.
 */
import { rateLimit } from 'express-rate-limit';
import { ERROR_CODES } from '../config/constants.js';
import { sendError } from '../views/responseView.js';

const isRead = (req) => req.method === 'GET' || req.method === 'HEAD';

function createLimiter({ windowMs, max, message, skip }) {
  return rateLimit({
    windowMs,
    limit: max,
    skip,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => sendError(res, { status: 429, code: ERROR_CODES.RATE_LIMITED, message }),
  });
}

/** Two independent budgets: one for reads, one for writes. */
export function createApiLimiter({ windowMs, max, readMax }) {
  const reads = createLimiter({
    windowMs, max: readMax, skip: (req) => !isRead(req),
    message: 'Too many requests, please slow down and try again shortly.',
  });
  const writes = createLimiter({
    windowMs, max, skip: isRead,
    message: 'Too many changes in a short time, please try again later.',
  });
  return [reads, writes];
}

export const createUploadLimiter = ({ windowMs, uploadMax }) =>
  createLimiter({ windowMs, max: uploadMax, message: 'Upload limit reached, please try again later.' });
