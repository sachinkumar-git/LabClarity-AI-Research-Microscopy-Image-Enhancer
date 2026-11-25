/**
 * Validators for research endpoints. Structure is checked here; pipeline parameter ranges
 * are validated by the AI service (single source of truth) before any run is queued.
 */
import { JOB_STATUS, MODEL_ID_PATTERN, UUID_PATTERN } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';

const isUuid = (v) => typeof v === 'string' && UUID_PATTERN.test(v);
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v, min) => Number.isInteger(v) && v >= min;

export const validateUuidParam = (req, res, next) =>
  isUuid(req.params.id) ? next() : next(AppError.notFound('Resource not found'));

export function validateExperimentBody({ partial = false } = {}) {
  return (req, res, next) => {
    const { name, description, tags } = req.body ?? {};
    const errors = [];
    if (!partial || name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.length > 120) errors.push('name must be 1-120 characters');
    }
    if (description !== undefined && (typeof description !== 'string' || description.length > 2000)) {
      errors.push('description must be at most 2000 characters');
    }
    const tagsOk = Array.isArray(tags) && tags.length <= 10 && tags.every((t) => typeof t === 'string' && t.length <= 30);
    if (tags !== undefined && !tagsOk) errors.push('tags must be at most 10 strings of 30 characters');
    if (errors.length) return next(AppError.badRequest('Invalid experiment', errors));
    req.validated = Object.fromEntries(
      Object.entries({ name: name?.trim(), description, tags }).filter(([, v]) => v !== undefined),
    );
    return next();
  };
}

function checkPipeline(p, i, errors) {
  if (!isPlainObject(p)) return errors.push(`pipelines[${i}] must be an object`);
  if (p.label !== undefined && (typeof p.label !== 'string' || p.label.length > 80)) {
    errors.push(`pipelines[${i}].label must be at most 80 characters`);
  }
  const stepsOk = Array.isArray(p.steps) && p.steps.length >= 1 && p.steps.length <= 6;
  if (!stepsOk || !p.steps.every((s) => isPlainObject(s) && typeof s.op === 'string')) {
    errors.push(`pipelines[${i}].steps must be 1-6 step objects with an "op"`);
  }
  return undefined;
}

export function validateRunBody(req, res, next) {
  const { assetIds, pipelines, roi, referenceAssetId, experimentId } = req.body ?? {};
  const errors = [];
  if (!Array.isArray(assetIds) || assetIds.length < 1 || assetIds.length > 20 || !assetIds.every(isUuid)) {
    errors.push('assetIds must be 1-20 image ids');
  }
  if (!Array.isArray(pipelines) || pipelines.length < 1 || pipelines.length > 6) {
    errors.push('pipelines must contain 1-6 pipelines');
  } else {
    pipelines.forEach((p, i) => checkPipeline(p, i, errors));
  }
  if (roi != null) {
    const ok = isPlainObject(roi) && isInt(roi.x, 0) && isInt(roi.y, 0) && isInt(roi.width, 16) && isInt(roi.height, 16);
    if (!ok || Object.keys(roi).length !== 4) errors.push('roi must be {x, y, width>=16, height>=16} integers');
  }
  if (referenceAssetId != null && !isUuid(referenceAssetId)) errors.push('referenceAssetId must be an image id');
  if (experimentId != null && !isUuid(experimentId)) errors.push('experimentId must be an experiment id');
  if (errors.length) return next(AppError.badRequest('Invalid run request', errors));

  req.validated = { assetIds: [...new Set(assetIds)], pipelines, roi: roi ?? null,
    referenceAssetId: referenceAssetId ?? null, experimentId: experimentId ?? null };
  return next();
}

export function validateJobQuery(req, res, next) {
  const { experimentId, assetId, batchId, status, model, limit = '50', page = '1' } = req.query;
  const errors = [];
  [['experimentId', experimentId], ['assetId', assetId], ['batchId', batchId]].forEach(([k, v]) => {
    if (v !== undefined && !isUuid(v)) errors.push(`${k} must be an id`);
  });
  if (status !== undefined && !Object.values(JOB_STATUS).includes(status)) errors.push('invalid status');
  if (model !== undefined && !MODEL_ID_PATTERN.test(model)) errors.push('invalid model');
  const lim = Number(limit);
  const pg = Number(page);
  if (!Number.isInteger(lim) || lim < 1 || lim > 100) errors.push('limit must be 1-100');
  if (!Number.isInteger(pg) || pg < 1 || pg > 10_000) errors.push('page must be a positive integer');
  if (errors.length) return next(AppError.badRequest('Invalid query', errors));
  req.validated = { filter: { experimentId, assetId, batchId, status, model }, limit: lim, page: pg };
  return next();
}
