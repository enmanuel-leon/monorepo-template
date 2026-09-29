import type { FastifyInstance } from 'fastify';
import {
  getNotifications,
  patchNotificationRead,
  patchReadAllNotifications,
  getUnreadCount,
} from '../../controllers/notification.controller.js';
import {
  listNotificationsSchema,
  markNotificationReadSchema,
  markAllReadSchema,
  unreadCountSchema,
} from '../../schemas/notification.schema.js';

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get('/notifications', { schema: listNotificationsSchema }, getNotifications);
  fastify.patch(
    '/notifications/:id/read',
    { schema: markNotificationReadSchema },
    patchNotificationRead,
  );
  fastify.patch(
    '/notifications/read-all',
    { schema: markAllReadSchema },
    patchReadAllNotifications,
  );
  fastify.get('/notifications/unread-count', { schema: unreadCountSchema }, getUnreadCount);
}
