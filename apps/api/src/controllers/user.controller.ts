import type { FastifyReply, FastifyRequest } from 'fastify';
import { auth } from '../lib/auth.js';
import {
  getUserProfileWithRelations,
  updateUserProfile,
  type UpdateUserProfileInput,
} from '../services/user.service.js';

export async function getCurrentUser(request: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  const fullUser = await getUserProfileWithRelations(session.user.id);

  let userResult = session.user;
  if (fullUser) {
    userResult = fullUser;
  }

  return reply.send({
    user: userResult,
  });
}

export async function updateUser(
  request: FastifyRequest<{ Body: UpdateUserProfileInput }>,
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
    locale: request.body.locale,
    theme: request.body.theme,
    hasSeenTour: request.body.hasSeenTour,
    hasCompletedOnboarding: request.body.hasCompletedOnboarding,
  });

  return reply.send({
    user: updatedUser,
  });
}
