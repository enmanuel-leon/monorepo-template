import type { FastifyReply, FastifyRequest } from 'fastify';
import { auth } from '../lib/auth.js';
import { getUserProfileWithRelations, updateUserProfile } from '../services/user.service.js';

export async function getCurrentUser(request: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  const fullUser = await getUserProfileWithRelations(session.user.id);

  return reply.send({
    user: fullUser || session.user,
  });
}

export async function updateUser(
  request: FastifyRequest<{ Body: { name?: string; countryCode?: string; timezoneId?: string } }>,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  const updatedUser = await updateUserProfile(session.user.id, {
    name: request.body.name,
    countryCode: request.body.countryCode,
    timezoneId: request.body.timezoneId,
  });

  return reply.send({
    user: updatedUser,
  });
}
