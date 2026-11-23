import { Router } from 'express';

export function createModelRoutes({ modelController }) {
  const router = Router();
  router.get('/', modelController.list);
  return router;
}
