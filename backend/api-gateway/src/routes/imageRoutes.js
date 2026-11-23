import { Router } from 'express';
import { createUploadMiddleware, verifyImageFile } from '../middleware/upload.js';
import { createUploadLimiter } from '../middleware/rateLimiter.js';
import { validateEnhanceRequest, validateJobId } from '../middleware/validate.js';

export function createImageRoutes({ imageController }, config) {
  const router = Router();
  const upload = createUploadMiddleware(config.upload);
  const uploadLimiter = createUploadLimiter(config.rateLimit);

  router.post(
    '/',
    uploadLimiter,
    upload,
    verifyImageFile,
    validateEnhanceRequest,
    imageController.create,
  );

  router.get('/:id', validateJobId, imageController.show);
  router.get('/:id/original', validateJobId, imageController.original);
  router.get('/:id/preview', validateJobId, imageController.preview);
  router.get('/:id/enhanced', validateJobId, imageController.enhanced);
  router.get('/:id/enhanced-data', validateJobId, imageController.enhancedData);
  router.delete('/:id', validateJobId, imageController.destroy);

  return router;
}
