/** Request validators. Each normalises valid input onto `req.validated`. */
import { ALLOWED_SCALES, DEFAULT_SCALE, MODEL_ID_PATTERN } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateEnhanceRequest(req, res, next) {
  const errors = [];
  const model = typeof req.body?.model === 'string' ? req.body.model.trim() : '';
  const rawScale = req.body?.scale;
  const scale = rawScale === undefined || rawScale === '' ? DEFAULT_SCALE : Number(rawScale);

  if (!MODEL_ID_PATTERN.test(model)) errors.push('model must be a valid model id');
  if (!ALLOWED_SCALES.includes(scale)) errors.push(`scale must be one of ${ALLOWED_SCALES.join(', ')}`);
  if (errors.length) return next(AppError.badRequest('Invalid enhancement request', errors));

  req.validated = { ...req.validated, model, scale };
  return next();
}

export function validateJobId(req, res, next) {
  if (!UUID_PATTERN.test(req.params.id)) return next(AppError.notFound('Job not found'));
  return next();
}
