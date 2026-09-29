import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.route.js';
import { authRoutes } from './auth.route.js';
import { userRoutes } from './user.route.js';
import { organizationRoutes } from './organization.route.js';
import { itemRoutes } from './item.route.js';
import { referenceRoutes } from './reference.route.js';
import { metricsRoutes } from './metrics.route.js';
import { notificationRoutes } from './notification.route.js';

export async function v1Routes(fastify: FastifyInstance) {
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(userRoutes);
  await fastify.register(organizationRoutes);
  await fastify.register(itemRoutes);
  await fastify.register(referenceRoutes);
  await fastify.register(metricsRoutes);
  await fastify.register(notificationRoutes);
}
