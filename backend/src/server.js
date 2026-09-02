import app from './app.js';
import config from './config/index.js';
import { sequelize, testConnection } from './config/database.js';
import './models/index.js';
import { seedDefaultSettings } from './services/settingsService.js';
import { seedAdminIfNeeded } from './scripts/bootstrap.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  // 1. Connect & sync schema
  await testConnection();
  await sequelize.sync({ alter: true });
  logger.info('[db] schema synced');

  // 2. Seed defaults
  await seedDefaultSettings();
  await seedAdminIfNeeded();
  logger.info('[db] settings + admin seeded');

  // 3. Start HTTP server
  const server = app.listen(config.port, () => {
    logger.info(`[server] LINE Lottery backend listening on :${config.port} (${config.env})`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`[server] ${signal} received, shutting down...`);
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('[server] bootstrap failed', { message: err.message, stack: err.stack });
  process.exit(1);
});
