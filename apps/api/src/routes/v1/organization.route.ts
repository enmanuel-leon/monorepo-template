import type { FastifyInstance } from 'fastify';
import { getOrganizations, createOrganization } from '../../controllers/organization.controller.js';
import {
  listOrganizationsSchema,
  createOrganizationSchema,
} from '../../schemas/organization.schema.js';

export async function organizationRoutes(fastify: FastifyInstance) {
  fastify.get('/organizations', { schema: listOrganizationsSchema }, getOrganizations);
  fastify.post('/organizations', { schema: createOrganizationSchema }, createOrganization);
}
