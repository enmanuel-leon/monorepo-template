import type { FastifyReply, FastifyRequest } from 'fastify';
import { auth } from '../lib/auth.js';
import {
  listUserOrganizations,
  createOrganizationForUser,
} from '../services/organization.service.js';

export async function getOrganizations(request: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  const organizations = await listUserOrganizations(session.user.id);
  return reply.send({ organizations });
}

export async function createOrganization(
  request: FastifyRequest<{ Body: { name: string; slug?: string } }>,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  const org = await createOrganizationForUser(
    session.user.id,
    request.body.name,
    request.body.slug,
  );
  return reply.status(201).send(org);
}
