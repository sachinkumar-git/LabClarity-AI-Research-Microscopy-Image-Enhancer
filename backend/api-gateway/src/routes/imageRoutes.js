import { Router } from 'express';
import { createUploadMiddleware, verifyImageFile } from '../middleware/upload.js';
import { createUploadLimiter } from '../middleware/rateLimiter.js';
import { validateEnhanceRequest, validateJobId } from '../middleware/validate.js';
import { validateJobQuery } from '../middleware/validateResearch.js';

/** Read/delete endpoints shared by /images (legacy) and /jobs. */
function mountRunRoutes(router, controller) {
  router.get('/:id', validateJobId, controller.show);
  router.get('/:id/original', validateJobId, controller.original);
  router.get('/:id/preview', validateJobId, controller.preview);
  router.get('/:id/enhanced', validateJobId, controller.enhanced);
  router.get('/:id/enhanced-data', validateJobId, controller.enhancedData);
  router.get('/:id/diff', validateJobId, controller.diff);
  router.delete('/:id', validateJobId, controller.destroy);
  return router;
}

/** Legacy single-upload API (kept for backward compatibility). */
export function createImageRoutes({ imageController }, config) {
  const router = Router();
  router.post(
    '/',
    createUploadLimiter(config.rateLimit),
    createUploadMiddleware(config.upload),
    verifyImageFile,
    validateEnhanceRequest,
    imageController.create,
  );
  return mountRunRoutes(router, imageController);
}

export function createJobRoutes({ imageController }) {
  const router = Router();
  router.get('/', validateJobQuery, imageController.list);
  return mountRunRoutes(router, imageController);
}
