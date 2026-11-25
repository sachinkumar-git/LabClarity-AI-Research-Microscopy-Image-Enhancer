/** Mounts all versioned API routers. */
import { Router } from 'express';
import { createHealthRoutes } from './healthRoutes.js';
import { createImageRoutes, createJobRoutes } from './imageRoutes.js';
import { createModelRoutes } from './modelRoutes.js';
import { createAssetRoutes, createExperimentRoutes, createInsightRoutes, createRunRoutes } from './researchRoutes.js';

export function createApiRouter(controllers, config) {
  const router = Router();
  router.use('/health', createHealthRoutes(controllers));
  router.use('/models', createModelRoutes(controllers));
  router.use('/images', createImageRoutes(controllers, config));
  router.use('/jobs', createJobRoutes(controllers));
  router.use('/assets', createAssetRoutes(controllers, config));
  router.use('/experiments', createExperimentRoutes(controllers));
  router.use('/', createRunRoutes(controllers, config));
  router.use('/', createInsightRoutes(controllers));
  return router;
}
