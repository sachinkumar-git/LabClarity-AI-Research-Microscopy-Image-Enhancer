/** Process entry point: connects dependencies, starts HTTP, handles graceful shutdown. */
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { createContainer } from './container.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';

async function start() {
  await connectDatabase(config.mongoUri);
  const container = createContainer(config);
  await container.services.onStartup?.();

  const app = createApp(container);
  const server = app.listen(config.port, () => {
    logger.info(`API gateway listening on port ${config.port}`, { env: config.nodeEnv });
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    await container.services.onShutdown?.();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});

start().catch((err) => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});
