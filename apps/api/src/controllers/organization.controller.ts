import type { FastifyReply, FastifyRequest } from 'fastify';
import { auth } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';
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

  const existingOwner = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      role: 'owner',
    },
  });

  if (existingOwner) {
    return reply.status(403).send({
      error: {
        code: 'OWNER_LIMIT_REACHED',
        message: 'You are already the owner of an organization.',
        statusCode: 403,
      },
    });
  }

  const org = await createOrganizationForUser(
    session.user.id,
    request.body.name,
    request.body.slug,
  );
  return reply.status(201).send(org);
}
