import type { FastifyReply, FastifyRequest } from 'fastify';
import { auth } from '../lib/auth.js';
import {
  listUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationsCount,
} from '../services/notification.service.js';

export async function getNotifications(
  request: FastifyRequest<{
    Querystring: {
      page?: number;
      pageSize?: number;
      unreadOnly?: boolean;
    };
  }>,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  const result = await listUserNotifications({
    userId: session.user.id,
    page: request.query.page,
    pageSize: request.query.pageSize,
    unreadOnly: request.query.unreadOnly,
  });

  return reply.send(result);
}

export async function patchNotificationRead(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  const result = await markNotificationAsRead(request.params.id, session.user.id);
  if (result.notFound) {
    return reply.status(404).send({ message: 'Notification not found' });
  }

  return reply.send(result);
}

export async function patchReadAllNotifications(request: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  const result = await markAllNotificationsAsRead(session.user.id);
  return reply.send(result);
}

export async function getUnreadCount(request: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  const result = await getUnreadNotificationsCount(session.user.id);
  return reply.send(result);
}
