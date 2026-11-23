/** Per-IP rate limiting: a general API limit and a stricter limit for expensive uploads. */
import { rateLimit } from 'express-rate-limit';
import { ERROR_CODES } from '../config/constants.js';
import { sendError } from '../views/responseView.js';

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) =>
      sendError(res, { status: 429, code: ERROR_CODES.RATE_LIMITED, message }),
  });
}

export const createApiLimiter = ({ windowMs, max }) =>
  createLimiter({ windowMs, max, message: 'Too many requests, please try again later.' });

export const createUploadLimiter = ({ windowMs, uploadMax }) =>
  createLimiter({ windowMs, max: uploadMax, message: 'Upload limit reached, please try again later.' });
