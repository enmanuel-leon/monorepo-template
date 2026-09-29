import type { Prisma, Notification } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ListNotificationsParams {
  userId: string;
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

export interface ListNotificationsResult {
  data: Notification[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  unreadCount: number;
}

export interface MarkNotificationAsReadResult {
  success: boolean;
  notFound?: boolean;
  notification?: Notification;
}

export interface MarkAllNotificationsAsReadResult {
  success: boolean;
  count: number;
}

export interface UnreadNotificationsCountResult {
  unreadCount: number;
}

export async function createNotification(
  input: Readonly<CreateNotificationInput>,
): Promise<Notification> {
  const data: Prisma.NotificationUncheckedCreateInput = {
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
  };

  if (input.metadata !== undefined) {
    data.metadata = input.metadata as Prisma.InputJsonValue;
  }

  return prisma.notification.create({ data });
}

export async function listUserNotifications(
  params: Readonly<ListNotificationsParams>,
): Promise<ListNotificationsResult> {
  let page = 1;
  if (params.page !== undefined && params.page > 0) {
    page = params.page;
  }

  let pageSize = 10;
  if (params.pageSize !== undefined && params.pageSize > 0) {
    if (params.pageSize > 50) {
      pageSize = 50;
    } else {
      pageSize = params.pageSize;
    }
  }

  const where: Prisma.NotificationWhereInput = {
    userId: params.userId,
  };

  if (params.unreadOnly === true) {
    where.read = false;
  }

  const skip = (page - 1) * pageSize;

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        userId: params.userId,
        read: false,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
    },
    unreadCount,
  };
}

export async function markNotificationAsRead(
  id: string,
  userId: string,
): Promise<MarkNotificationAsReadResult> {
  const existing = await prisma.notification.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!existing) {
    return { success: false, notFound: true };
  }

  const notification = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  return { success: true, notification };
}

export async function markAllNotificationsAsRead(
  userId: string,
): Promise<MarkAllNotificationsAsReadResult> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  });

  return {
    success: true,
    count: result.count,
  };
}

export async function getUnreadNotificationsCount(
  userId: string,
): Promise<UnreadNotificationsCountResult> {
  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });

  return { unreadCount };
}
