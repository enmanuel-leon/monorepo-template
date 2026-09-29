import type { FastifyReply, FastifyRequest } from 'fastify';
import { auth } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  listUserOrganizations,
  createOrganizationForUser,
  listOrganizationInvitations,
} from '../services/organization.service.js';
import { MEMBER_ROLES, AUTH_ERROR_CODES } from '../constants/auth.constants.js';

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
      role: MEMBER_ROLES.OWNER,
    },
  });

  if (existingOwner) {
    return reply.status(403).send({
      error: {
        code: AUTH_ERROR_CODES.OWNER_LIMIT_REACHED,
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

export async function getOrganizationInvitations(
  request: FastifyRequest<{
    Params: { organizationId: string };
    Querystring: {
      page?: number;
      pageSize?: number;
      status?: string;
      sortOrder?: 'asc' | 'desc';
    };
  }>,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  try {
    const result = await listOrganizationInvitations({
      organizationId: request.params.organizationId,
      userId: session.user.id,
      page: request.query.page,
      pageSize: request.query.pageSize,
      status: request.query.status,
      sortOrder: request.query.sortOrder,
    });

    return reply.send(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === AUTH_ERROR_CODES.FORBIDDEN_ADMIN_ACCESS) {
      return reply.status(403).send({
        error: {
          code: AUTH_ERROR_CODES.FORBIDDEN_ADMIN_ACCESS,
          message: 'You do not have permission to access organization invitations.',
          statusCode: 403,
        },
        code: AUTH_ERROR_CODES.FORBIDDEN_ADMIN_ACCESS,
      });
    }
    throw err;
  }
}
