import type { FastifyInstance } from 'fastify';
import { getHealthCheck } from '../../controllers/health.controller.js';
import { healthSchema } from '../../schemas/health.schema.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', { schema: healthSchema }, getHealthCheck);
}
