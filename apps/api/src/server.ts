import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

try {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: env.HOST });
  logger.info(`Server running at http://${env.HOST}:${env.PORT}`);
  logger.info(`OpenAPI docs available at http://${env.HOST}:${env.PORT}/docs`);
} catch (err) {
  logger.error(err);
  process.exitCode = 1;
}
