import type { FastifyInstance } from 'fastify';
import { listTimezones, listCountries } from '../../controllers/reference.controller.js';

export async function referenceRoutes(fastify: FastifyInstance) {
  fastify.get('/reference/timezones', listTimezones);
  fastify.get('/reference/countries', listCountries);
}
