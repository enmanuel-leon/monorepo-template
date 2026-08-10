import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { env } from './config/env.js';
import { API_VERSION, AUTH_POLICIES } from './config/constants.js';
import { swaggerPlugin } from './plugins/swagger.plugin.js';
import { sensiblePlugin } from './plugins/sensible.plugin.js';
import { errorHandlerPlugin } from './plugins/error-handler.plugin.js';
import { v1Routes } from './routes/v1/index.js';
import { healthRoutes } from './routes/v1/health.route.js';
import { userRoutes } from './routes/v1/user.route.js';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  if (AUTH_POLICIES.ALLOW_ANONYMOUS_REGISTER) {
    app.log.info('Anonymous registration is enabled.');
  }

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(errorHandlerPlugin);
  await app.register(sensiblePlugin);
  await app.register(swaggerPlugin);

  // Versioned routes (/api/v1/...)
  await app.register(v1Routes, { prefix: `/api/${API_VERSION}` });

  // Unprefixed convenience aliases (/health, /me)
  await app.register(healthRoutes);
  await app.register(userRoutes);

  return app;
}
