import type { FastifyInstance } from 'fastify';
import { getMetricsSummaryHandler } from '../../controllers/metrics.controller.js';
import { getMetricsSummarySchema } from '../../schemas/metrics.schema.js';

export async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get('/metrics/summary', { schema: getMetricsSummarySchema }, getMetricsSummaryHandler);
}
