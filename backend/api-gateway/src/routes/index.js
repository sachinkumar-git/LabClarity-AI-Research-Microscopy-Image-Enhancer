/** Mounts all versioned API routers. */
import { Router } from 'express';
import { createHealthRoutes } from './healthRoutes.js';
import { createImageRoutes } from './imageRoutes.js';
import { createModelRoutes } from './modelRoutes.js';

export function createApiRouter(controllers, config) {
  const router = Router();
  router.use('/health', createHealthRoutes(controllers));
  router.use('/models', createModelRoutes(controllers));
  router.use('/images', createImageRoutes(controllers, config));
  return router;
}
