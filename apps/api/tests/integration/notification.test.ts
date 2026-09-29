import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { auth } from '../../src/lib/auth.js';
import { prisma } from '../../src/lib/prisma.js';
import { createNotification } from '../../src/services/notification.service.js';
import { NOTIFICATION_TYPES } from '../../src/constants/notification.constants.js';
import * as emailService from '../../src/services/email/email.service.js';

describe('Notification API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  function resolveCookieHeader(setCookie: string | string[] | undefined): string {
    if (Array.isArray(setCookie)) {
      return setCookie.join('; ');
    }
    if (setCookie) {
      return setCookie;
    }
    return '';
  }

  describe('Unauthenticated Endpoints', () => {
    it.each([
      { method: 'GET' as const, url: '/api/v1/notifications' },
      {
        method: 'PATCH' as const,
        url: '/api/v1/notifications/00000000-0000-0000-0000-000000000000/read',
      },
      { method: 'PATCH' as const, url: '/api/v1/notifications/read-all' },
      { method: 'GET' as const, url: '/api/v1/notifications/unread-count' },
    ])('returns 401 when unauthenticated on $method $url', async ({ method, url }) => {
      const res = await app.inject({ method, url });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Validation & Parameter Checks', () => {
    it('rejects invalid UUID parameter on mark as read', async () => {
      const email = `notif-val-${Date.now()}@example.com`;
      const signUpRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-up/email',
        headers: { 'content-type': 'application/json' },
        payload: { email, password: 'TestPassword123!', name: 'Val User' },
      });
      const cookieHeader = resolveCookieHeader(signUpRes.headers['set-cookie']);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/notifications/invalid-uuid/read',
        headers: { cookie: cookieHeader },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Authenticated Lifecycle & User Isolation', () => {
    it('supports full authenticated notifications lifecycle', async () => {
      const userAEmail = `notif-user-a-${Date.now()}@example.com`;
      const userBEmail = `notif-user-b-${Date.now()}@example.com`;

      const signUpARes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-up/email',
        headers: { 'content-type': 'application/json' },
        payload: { email: userAEmail, password: 'TestPassword123!', name: 'User A' },
      });
      const cookieHeaderA = resolveCookieHeader(signUpARes.headers['set-cookie']);
      const userABody = JSON.parse(signUpARes.payload);
      const userAId = userABody.user.id;

      const signUpBRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-up/email',
        headers: { 'content-type': 'application/json' },
        payload: { email: userBEmail, password: 'TestPassword123!', name: 'User B' },
      });
      const userBBody = JSON.parse(signUpBRes.payload);
      const userBId = userBBody.user.id;

      // 1. Initial state: count is 0, list is empty
      const initialCountRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/unread-count',
        headers: { cookie: cookieHeaderA },
      });
      expect(initialCountRes.statusCode).toBe(200);
      expect(JSON.parse(initialCountRes.payload)).toEqual({ unreadCount: 0 });

      const initialListRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { cookie: cookieHeaderA },
      });
      expect(initialListRes.statusCode).toBe(200);
      const initialList = JSON.parse(initialListRes.payload);
      expect(initialList.data).toHaveLength(0);
      expect(initialList.pagination).toEqual({
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
      expect(initialList.unreadCount).toBe(0);

      // 2. Create notifications for User A
      const notif1 = await createNotification({
        userId: userAId,
        type: NOTIFICATION_TYPES.ORGANIZATION_MEMBER_REMOVED,
        title: 'Removed from Org 1',
        message: 'You have been removed from Org 1',
        metadata: { organizationId: '00000000-0000-0000-0000-000000000001' },
      });

      const notif2 = await createNotification({
        userId: userAId,
        type: NOTIFICATION_TYPES.ORGANIZATION_INVITATION_RECEIVED,
        title: 'Invitation from Org 2',
        message: 'You have been invited to Org 2',
      });

      const notif3 = await createNotification({
        userId: userAId,
        type: NOTIFICATION_TYPES.ORGANIZATION_INVITATION_RECEIVED,
        title: 'Old Notification',
        message: 'Already read message',
      });
      await prisma.notification.update({
        where: { id: notif3.id },
        data: { read: true },
      });

      // Create notification for User B (to test isolation)
      const notifB = await createNotification({
        userId: userBId,
        type: NOTIFICATION_TYPES.ORGANIZATION_MEMBER_REMOVED,
        title: 'User B Notification',
        message: 'Message for User B',
      });

      // 3. Verify unread count for User A (should be 2, ignoring notif3 and notifB)
      const countRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/unread-count',
        headers: { cookie: cookieHeaderA },
      });
      expect(countRes.statusCode).toBe(200);
      expect(JSON.parse(countRes.payload)).toEqual({ unreadCount: 2 });

      // 4. List all notifications for User A
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { cookie: cookieHeaderA },
      });
      expect(listRes.statusCode).toBe(200);
      const listData = JSON.parse(listRes.payload);
      expect(listData.data).toHaveLength(3);
      expect(listData.pagination.total).toBe(3);
      expect(listData.unreadCount).toBe(2);

      // 5. List with unreadOnly=true
      const unreadListRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications?unreadOnly=true',
        headers: { cookie: cookieHeaderA },
      });
      expect(unreadListRes.statusCode).toBe(200);
      const unreadData = JSON.parse(unreadListRes.payload);
      expect(unreadData.data).toHaveLength(2);
      expect(unreadData.pagination.total).toBe(2);
      expect(unreadData.unreadCount).toBe(2);

      // 6. Pagination
      const pagedRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications?page=1&pageSize=2',
        headers: { cookie: cookieHeaderA },
      });
      expect(pagedRes.statusCode).toBe(200);
      const pagedData = JSON.parse(pagedRes.payload);
      expect(pagedData.data).toHaveLength(2);
      expect(pagedData.pagination.total).toBe(3);
      expect(pagedData.pagination.pageSize).toBe(2);
      expect(pagedData.pagination.totalPages).toBe(2);

      // 7. Isolation check: User A trying to mark User B's notification returns 404
      const isolateRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/notifications/${notifB.id}/read`,
        headers: { cookie: cookieHeaderA },
      });
      expect(isolateRes.statusCode).toBe(404);
      expect(JSON.parse(isolateRes.payload).message).toBe('Notification not found');

      // 8. Non-existent ID returns 404
      const notFoundRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/notifications/00000000-0000-0000-0000-000000000099/read',
        headers: { cookie: cookieHeaderA },
      });
      expect(notFoundRes.statusCode).toBe(404);

      // 9. Mark notif1 as read
      const markRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/notifications/${notif1.id}/read`,
        headers: { cookie: cookieHeaderA },
      });
      expect(markRes.statusCode).toBe(200);
      const markData = JSON.parse(markRes.payload);
      expect(markData.success).toBe(true);
      expect(markData.notification.id).toBe(notif1.id);
      expect(markData.notification.read).toBe(true);

      // Unread count should now be 1
      const countAfterOneRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/unread-count',
        headers: { cookie: cookieHeaderA },
      });
      expect(JSON.parse(countAfterOneRes.payload)).toEqual({ unreadCount: 1 });

      // 10. Mark all as read
      const markAllRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/notifications/read-all',
        headers: { cookie: cookieHeaderA },
      });
      expect(markAllRes.statusCode).toBe(200);
      const markAllData = JSON.parse(markAllRes.payload);
      expect(markAllData.success).toBe(true);
      expect(markAllData.count).toBe(1);

      // Final unread count should be 0
      const finalCountRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/unread-count',
        headers: { cookie: cookieHeaderA },
      });
      expect(JSON.parse(finalCountRes.payload)).toEqual({ unreadCount: 0 });

      // User B's notification must still be unread
      const userBNotifInDb = await prisma.notification.findUnique({
        where: { id: notifB.id },
      });
      expect(userBNotifInDb?.read).toBe(false);
    });
  });

  describe('Organization Hook: afterRemoveMember', () => {
    it('executes hook and creates notification and sends email with Spanish default locale', async () => {
      const orgPlugin = auth.options.plugins?.find((p: any) => p.id === 'organization') as any;
      expect(orgPlugin).toBeDefined();
      expect(orgPlugin.options?.organizationHooks?.afterRemoveMember).toBeDefined();

      const hook = orgPlugin.options.organizationHooks.afterRemoveMember;
      const sendEmailSpy = vi.spyOn(emailService, 'sendEmail').mockResolvedValue(undefined);

      const targetUser = await prisma.user.create({
        data: {
          email: `hook-es-${Date.now()}@example.com`,
          name: 'Hook User ES',
          locale: 'es',
          emailVerified: true,
        },
      });

      await hook({
        member: { id: 'm-1', role: 'member' },
        user: targetUser,
        organization: { id: 'org-test-1', name: 'Acme Test Corp' },
      });

      // Verify email was sent with Spanish subject
      expect(sendEmailSpy).toHaveBeenCalledWith(
        targetUser.email,
        'Has sido desvinculado de Acme Test Corp',
        expect.stringContaining('Acme Test Corp'),
      );

      // Verify in-app notification was created
      const notif = await prisma.notification.findFirst({
        where: {
          userId: targetUser.id,
          type: NOTIFICATION_TYPES.ORGANIZATION_MEMBER_REMOVED,
        },
      });

      expect(notif).toBeDefined();
      expect(notif?.title).toBe('Desvinculado de Acme Test Corp');
      expect(notif?.message).toContain('Acme Test Corp');
    });

    it('executes hook with English locale and handles errors gracefully', async () => {
      const orgPlugin = auth.options.plugins?.find((p: any) => p.id === 'organization') as any;
      const hook = orgPlugin.options.organizationHooks.afterRemoveMember;
      const sendEmailSpy = vi.spyOn(emailService, 'sendEmail').mockResolvedValue(undefined);

      const targetUser = await prisma.user.create({
        data: {
          email: `hook-en-${Date.now()}@example.com`,
          name: 'Hook User EN',
          locale: 'en',
          emailVerified: true,
        },
      });

      await hook({
        member: { id: 'm-2', role: 'member' },
        user: targetUser,
        organization: { id: 'org-test-2', name: 'Beta Global' },
      });

      expect(sendEmailSpy).toHaveBeenCalledWith(
        targetUser.email,
        'You have been removed from Beta Global',
        expect.stringContaining('Beta Global'),
      );

      const notif = await prisma.notification.findFirst({
        where: {
          userId: targetUser.id,
          type: NOTIFICATION_TYPES.ORGANIZATION_MEMBER_REMOVED,
        },
      });

      expect(notif).toBeDefined();
      expect(notif?.title).toBe('Removed from Beta Global');

      // Test error handling branch
      vi.spyOn(emailService, 'sendEmail').mockRejectedValueOnce(new Error('Email failed'));
      await expect(
        hook({
          member: { id: 'm-3', role: 'member' },
          user: targetUser,
          organization: { id: 'org-test-2', name: 'Beta Global' },
        }),
      ).resolves.not.toThrow();
    });
  });
});
