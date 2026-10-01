import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import type { User } from '@prisma/client';
import { prisma } from '../../src/lib/prisma.js';
import { withRLS } from '../../src/lib/rls-client.js';
import { env } from '../../src/config/env.js';
import { ITEM_STATUS } from '../../src/constants/item.constants.js';
import { NOTIFICATION_TYPES } from '../../src/constants/notification.constants.js';
import { USER_ROLES } from '../../src/constants/auth.constants.js';

const ITEM_TITLES = {
  USER_A_ITEM: 'User A Confidential Item',
  USER_B_FORGED_ITEM: 'User B Forged Item',
  MODIFIED_TITLE: 'Unauthorized Title Change',
} as const;

const NOTIFICATION_MESSAGES = {
  USER_A_NOTIF_TITLE: 'Confidential Notification',
  USER_A_NOTIF_BODY: 'Confidential notification body for user A',
} as const;

describe('PostgreSQL Native Row-Level Security (RLS) Integration Tests', () => {
  const testRunId = Date.now().toString();
  const userAEmail = `rls-user-a-${testRunId}@example.com`;
  const userBEmail = `rls-user-b-${testRunId}@example.com`;
  const adminEmail = `rls-admin-${testRunId}@example.com`;

  let userA: User;
  let userB: User;
  let adminUser: User;
  let userAItemId: string;
  let userANotifId: string;

  beforeAll(async () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const migrationPath = resolve(
      currentDir,
      '../../prisma/migrations/20260930000000_enable_postgresql_rls_and_app_role/migration.sql',
    );
    const sql = readFileSync(migrationPath, 'utf8');

    const client = new Client({ connectionString: env.DATABASE_URL });
    await client.connect();
    try {
      await client.query(sql);
    } finally {
      await client.end();
    }

    userA = await prisma.user.create({
      data: {
        email: userAEmail,
        name: 'RLS User A',
        role: USER_ROLES.USER,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: userBEmail,
        name: 'RLS User B',
        role: USER_ROLES.USER,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'RLS Admin User',
        role: USER_ROLES.ADMIN,
      },
    });
  });

  afterAll(async () => {
    const userIds = [userA.id, userB.id, adminUser.id];
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.item.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  });

  it('allows User A to create and access their own items and notifications', async () => {
    const item = await withRLS({ userId: userA.id, email: userA.email }, async (tx) => {
      return tx.item.create({
        data: {
          title: ITEM_TITLES.USER_A_ITEM,
          userId: userA.id,
          status: ITEM_STATUS.ACTIVE,
        },
      });
    });
    userAItemId = item.id;
    expect(item.id).toBeDefined();

    const notif = await withRLS({ userId: userA.id, email: userA.email }, async (tx) => {
      return tx.notification.create({
        data: {
          title: NOTIFICATION_MESSAGES.USER_A_NOTIF_TITLE,
          message: NOTIFICATION_MESSAGES.USER_A_NOTIF_BODY,
          type: NOTIFICATION_TYPES.ORGANIZATION_MEMBER_REMOVED,
          userId: userA.id,
        },
      });
    });
    userANotifId = notif.id;
    expect(notif.id).toBeDefined();

    const foundItems = await withRLS({ userId: userA.id, email: userA.email }, async (tx) => {
      return tx.item.findMany({
        where: { id: userAItemId },
      });
    });
    expect(foundItems).toHaveLength(1);

    const foundNotifs = await withRLS({ userId: userA.id, email: userA.email }, async (tx) => {
      return tx.notification.findMany({
        where: { id: userANotifId },
      });
    });
    expect(foundNotifs).toHaveLength(1);
  });

  it("prevents User B from listing or retrieving User A's items and notifications", async () => {
    const userBItems = await withRLS({ userId: userB.id, email: userB.email }, async (tx) => {
      return tx.item.findMany({
        where: { id: userAItemId },
      });
    });
    expect(userBItems).toHaveLength(0);

    const userBSingleItem = await withRLS({ userId: userB.id, email: userB.email }, async (tx) => {
      return tx.item.findUnique({
        where: { id: userAItemId },
      });
    });
    expect(userBSingleItem).toBeNull();

    const userBNotifs = await withRLS({ userId: userB.id, email: userB.email }, async (tx) => {
      return tx.notification.findMany({
        where: { id: userANotifId },
      });
    });
    expect(userBNotifs).toHaveLength(0);

    const userBSingleNotif = await withRLS({ userId: userB.id, email: userB.email }, async (tx) => {
      return tx.notification.findUnique({
        where: { id: userANotifId },
      });
    });
    expect(userBSingleNotif).toBeNull();
  });

  it("prevents User B from updating or deleting User A's item", async () => {
    const updateResult = await withRLS({ userId: userB.id, email: userB.email }, async (tx) => {
      return tx.item.updateMany({
        where: { id: userAItemId },
        data: { title: ITEM_TITLES.MODIFIED_TITLE },
      });
    });
    expect(updateResult.count).toBe(0);

    const deleteResult = await withRLS({ userId: userB.id, email: userB.email }, async (tx) => {
      return tx.item.deleteMany({
        where: { id: userAItemId },
      });
    });
    expect(deleteResult.count).toBe(0);

    const unchangedItem = await prisma.item.findUnique({
      where: { id: userAItemId },
    });
    expect(unchangedItem?.title).toBe(ITEM_TITLES.USER_A_ITEM);
  });

  it("prevents User B from creating an item with User A's identity", async () => {
    await expect(
      withRLS({ userId: userB.id, email: userB.email }, async (tx) => {
        return tx.item.create({
          data: {
            title: ITEM_TITLES.USER_B_FORGED_ITEM,
            userId: userA.id,
            status: ITEM_STATUS.ACTIVE,
          },
        });
      }),
    ).rejects.toThrow();
  });

  it("allows Platform Admin to bypass RLS and access any user's items and notifications", async () => {
    const adminItems = await withRLS(
      { userId: adminUser.id, email: adminUser.email, isAdmin: true },
      async (tx) => {
        return tx.item.findMany({
          where: { id: userAItemId },
        });
      },
    );
    expect(adminItems).toHaveLength(1);
    expect(adminItems[0]?.id).toBe(userAItemId);

    const adminNotifs = await withRLS(
      { userId: adminUser.id, email: adminUser.email, isAdmin: true },
      async (tx) => {
        return tx.notification.findMany({
          where: { id: userANotifId },
        });
      },
    );
    expect(adminNotifs).toHaveLength(1);
    expect(adminNotifs[0]?.id).toBe(userANotifId);
  });

  it('prevents unauthenticated access to private items and notifications', async () => {
    const unauthItems = await withRLS({}, async (tx) => {
      return tx.item.findMany({
        where: { id: userAItemId },
      });
    });
    expect(unauthItems).toHaveLength(0);

    const unauthNotifs = await withRLS({}, async (tx) => {
      return tx.notification.findMany({
        where: { id: userANotifId },
      });
    });
    expect(unauthNotifs).toHaveLength(0);
  });
});
