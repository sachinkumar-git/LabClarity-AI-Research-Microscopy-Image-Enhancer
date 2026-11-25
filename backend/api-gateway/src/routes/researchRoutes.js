/** Routers for the research workspace: experiments, source images (assets), runs and batches. */
import { Router } from 'express';
import { createBatchUploadMiddleware, verifyImageFiles } from '../middleware/upload.js';
import { createUploadLimiter } from '../middleware/rateLimiter.js';
import {
  validateExperimentBody,
  validateRunBody,
  validateUuidParam,
} from '../middleware/validateResearch.js';

export function createExperimentRoutes({ experimentController: c }) {
  const router = Router();
  router.get('/', c.list);
  router.post('/', validateExperimentBody(), c.create);
  router.get('/:id', validateUuidParam, c.show);
  router.patch('/:id', validateUuidParam, validateExperimentBody({ partial: true }), c.update);
  router.delete('/:id', validateUuidParam, c.destroy);
  return router;
}

export function createAssetRoutes({ assetController: c }, config) {
  const router = Router();
  router.get('/', c.list);
  router.post(
    '/',
    createUploadLimiter(config.rateLimit),
    createBatchUploadMiddleware(config.upload),
    verifyImageFiles,
    c.create,
  );
  router.get('/:id', validateUuidParam, c.show);
  router.get('/:id/original', validateUuidParam, c.original);
  router.get('/:id/preview', validateUuidParam, c.preview);
  router.get('/:id/verify', validateUuidParam, c.verify);
  router.delete('/:id', validateUuidParam, c.destroy);
  return router;
}

export function createRunRoutes({ runController }, config) {
  const router = Router();
  router.post('/runs', createUploadLimiter(config.rateLimit), validateRunBody, runController.create);
  router.get('/batches/:id', validateUuidParam, runController.batch);
  router.post('/batches/:id/retry', validateUuidParam, runController.retryBatch);
  router.post('/batches/:id/cancel', validateUuidParam, runController.cancelBatch);
  router.post('/jobs/:id/retry', validateUuidParam, runController.retryJob);
  return router;
}

export function createInsightRoutes({ insightController: c }) {
  const router = Router();
  router.get('/reports/jobs/:id', validateUuidParam, c.jobReport);
  router.get('/reports/batches/:id', validateUuidParam, c.batchReport);
  router.get('/reports/experiments/:id', validateUuidParam, c.experimentReport);
  router.get('/stats', c.stats);
  return router;
}
