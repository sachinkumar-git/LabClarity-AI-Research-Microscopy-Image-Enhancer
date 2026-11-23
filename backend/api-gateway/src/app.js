/** Builds the Express application (no network listening here, so it is testable). */
import express from 'express';
import { API_PREFIX } from './config/constants.js';
import { securityMiddleware } from './middleware/security.js';
import { createApiLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createApiRouter } from './routes/index.js';

export function createApp({ config, controllers }) {
  const app = express();

  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use(requestLogger);
  app.use(securityMiddleware(config));
  app.use(API_PREFIX, createApiLimiter(config.rateLimit), createApiRouter(controllers, config));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
