import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import {
  createNotification,
  listUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationsCount,
} from '../../src/services/notification.service.js';
import { NOTIFICATION_TYPES } from '../../src/constants/notification.constants.js';

describe('Notification Service Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createNotification', () => {
    it('creates a notification with metadata', async () => {
      const mockCreated = {
        id: 'notif-1',
        userId: 'user-1',
        type: NOTIFICATION_TYPES.ORGANIZATION_MEMBER_REMOVED,
        title: 'Removed from Org',
        message: 'You have been removed',
        read: false,
        metadata: { organizationId: 'org-1' },
        createdAt: new Date(),
      };

      const createSpy = vi
        .spyOn(prisma.notification, 'create')
        .mockResolvedValue(
          mockCreated as unknown as Awaited<ReturnType<typeof prisma.notification.create>>,
        );

      const result = await createNotification({
        userId: 'user-1',
        type: NOTIFICATION_TYPES.ORGANIZATION_MEMBER_REMOVED,
        title: 'Removed from Org',
        message: 'You have been removed',
        metadata: { organizationId: 'org-1' },
      });

      expect(createSpy).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: NOTIFICATION_TYPES.ORGANIZATION_MEMBER_REMOVED,
          title: 'Removed from Org',
          message: 'You have been removed',
          metadata: { organizationId: 'org-1' },
        },
      });
      expect(result).toEqual(mockCreated);
    });

    it('creates a notification without metadata', async () => {
      const mockCreated = {
        id: 'notif-2',
        userId: 'user-1',
        type: NOTIFICATION_TYPES.ORGANIZATION_INVITATION_RECEIVED,
        title: 'Invitation',
        message: 'You received an invite',
        read: false,
        metadata: null,
        createdAt: new Date(),
      };

      const createSpy = vi
        .spyOn(prisma.notification, 'create')
        .mockResolvedValue(
          mockCreated as unknown as Awaited<ReturnType<typeof prisma.notification.create>>,
        );

      const result = await createNotification({
        userId: 'user-1',
        type: NOTIFICATION_TYPES.ORGANIZATION_INVITATION_RECEIVED,
        title: 'Invitation',
        message: 'You received an invite',
      });

      expect(createSpy).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: NOTIFICATION_TYPES.ORGANIZATION_INVITATION_RECEIVED,
          title: 'Invitation',
          message: 'You received an invite',
        },
      });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('listUserNotifications', () => {
    it('uses default pagination and lists all notifications for user', async () => {
      const mockNotifications = [
        {
          id: 'n-1',
          userId: 'user-1',
          type: NOTIFICATION_TYPES.ORGANIZATION_MEMBER_REMOVED,
          title: 'Test',
          message: 'Message',
          read: false,
          metadata: null,
          createdAt: new Date(),
        },
      ];

      const findManySpy = vi
        .spyOn(prisma.notification, 'findMany')
        .mockResolvedValue(
          mockNotifications as unknown as Awaited<ReturnType<typeof prisma.notification.findMany>>,
        );
      const countSpy = vi
        .spyOn(prisma.notification, 'count')
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      const result = await listUserNotifications({ userId: 'user-1' });

      expect(findManySpy).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(countSpy).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(countSpy).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
      });
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
      expect(result.unreadCount).toBe(1);
    });

    it('filters by unreadOnly and respects custom page and pageSize', async () => {
      vi.spyOn(prisma.notification, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.notification, 'count').mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await listUserNotifications({
        userId: 'user-1',
        page: 3,
        pageSize: 5,
        unreadOnly: true,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        skip: 10,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.pagination.page).toBe(3);
      expect(result.pagination.pageSize).toBe(5);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('caps pageSize to 50 if exceeded', async () => {
      vi.spyOn(prisma.notification, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.notification, 'count').mockResolvedValueOnce(100).mockResolvedValueOnce(20);

      const result = await listUserNotifications({
        userId: 'user-1',
        page: 1,
        pageSize: 100,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        skip: 0,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.pagination.pageSize).toBe(50);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('falls back to default page and pageSize when invalid numbers are provided', async () => {
      vi.spyOn(prisma.notification, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.notification, 'count').mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await listUserNotifications({
        userId: 'user-1',
        page: -5,
        pageSize: -10,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(10);
    });
  });

  describe('markNotificationAsRead', () => {
    it('returns notFound when notification does not exist or user is not owner', async () => {
      vi.spyOn(prisma.notification, 'findFirst').mockResolvedValue(null);

      const result = await markNotificationAsRead('missing-id', 'user-1');

      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'missing-id', userId: 'user-1' },
      });
      expect(result).toEqual({ success: false, notFound: true });
    });

    it('updates read to true when notification exists and belongs to user', async () => {
      const mockNotif = {
        id: 'notif-1',
        userId: 'user-1',
        type: NOTIFICATION_TYPES.ORGANIZATION_MEMBER_REMOVED,
        title: 'Title',
        message: 'Msg',
        read: false,
        metadata: null,
        createdAt: new Date(),
      };
      const mockUpdated = { ...mockNotif, read: true };

      vi.spyOn(prisma.notification, 'findFirst').mockResolvedValue(
        mockNotif as unknown as Awaited<ReturnType<typeof prisma.notification.findFirst>>,
      );
      vi.spyOn(prisma.notification, 'update').mockResolvedValue(
        mockUpdated as unknown as Awaited<ReturnType<typeof prisma.notification.update>>,
      );

      const result = await markNotificationAsRead('notif-1', 'user-1');

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { read: true },
      });
      expect(result).toEqual({ success: true, notification: mockUpdated });
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('updates all unread notifications for user to read: true', async () => {
      vi.spyOn(prisma.notification, 'updateMany').mockResolvedValue({ count: 4 });

      const result = await markAllNotificationsAsRead('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        data: { read: true },
      });
      expect(result).toEqual({ success: true, count: 4 });
    });
  });

  describe('getUnreadNotificationsCount', () => {
    it('counts unread notifications for given user', async () => {
      vi.spyOn(prisma.notification, 'count').mockResolvedValue(7);

      const result = await getUnreadNotificationsCount('user-1');

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
      });
      expect(result).toEqual({ unreadCount: 7 });
    });
  });
});
