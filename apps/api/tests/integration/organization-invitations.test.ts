import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  AUTH_ERROR_CODES,
  INVITATION_STATUS,
  MEMBER_ROLES,
} from '../../src/constants/auth.constants.js';

describe('Organization Invitations API Integration Tests', () => {
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

  it('rejects unauthenticated request to /api/v1/organizations/:organizationId/invitations', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations/00000000-0000-0000-0000-000000000000/invitations',
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 400 when invalid UUID format is passed for organizationId', async () => {
    const email = `org-inv-val-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Validation User' },
    });
    const cookieHeader = resolveCookieHeader(signUpRes.headers['set-cookie']);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations/invalid-uuid-format/invitations',
      headers: { cookie: cookieHeader },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when querystring validation fails (e.g. invalid status or pageSize > 50)', async () => {
    const email = `org-inv-query-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Query Validation User' },
    });
    const cookieHeader = resolveCookieHeader(signUpRes.headers['set-cookie']);

    const validUuid = '00000000-0000-0000-0000-000000000000';

    const resOverSize = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${validUuid}/invitations?pageSize=100`,
      headers: { cookie: cookieHeader },
    });
    expect(resOverSize.statusCode).toBe(400);

    const resBadStatus = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${validUuid}/invitations?status=not_a_valid_status`,
      headers: { cookie: cookieHeader },
    });
    expect(resBadStatus.statusCode).toBe(400);
  });

  it('returns 403 FORBIDDEN_ADMIN_ACCESS when caller is not an owner or admin of the organization', async () => {
    const emailOwner = `inv-owner-${Date.now()}@example.com`;
    const emailMember = `inv-member-${Date.now()}@example.com`;
    const emailOutsider = `inv-outsider-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    // Sign up Owner
    const signUpOwnerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email: emailOwner, password, name: 'Owner User' },
    });
    const cookieOwner = resolveCookieHeader(signUpOwnerRes.headers['set-cookie']);

    // Create organization
    const createOrgRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: {
        'content-type': 'application/json',
        cookie: cookieOwner,
      },
      payload: {
        name: 'Secret Invitations Org',
        slug: `secret-inv-${Date.now()}`,
      },
    });
    expect(createOrgRes.statusCode).toBe(201);
    const org = JSON.parse(createOrgRes.payload);

    // Sign up Outsider
    const signUpOutsiderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email: emailOutsider, password, name: 'Outsider User' },
    });
    const cookieOutsider = resolveCookieHeader(signUpOutsiderRes.headers['set-cookie']);

    // Outsider attempts to list invitations -> 403
    const outsiderRes = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${org.id}/invitations`,
      headers: { cookie: cookieOutsider },
    });
    expect(outsiderRes.statusCode).toBe(403);
    const outsiderBody = JSON.parse(outsiderRes.payload);
    expect(outsiderBody.error.code).toBe(AUTH_ERROR_CODES.FORBIDDEN_ADMIN_ACCESS);

    // Sign up regular member and add them with role 'member'
    const signUpMemberRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email: emailMember, password, name: 'Regular Member' },
    });
    const cookieMember = resolveCookieHeader(signUpMemberRes.headers['set-cookie']);

    const memberUser = await prisma.user.findUnique({ where: { email: emailMember } });
    expect(memberUser).not.toBeNull();

    await prisma.member.create({
      data: {
        organizationId: org.id,
        userId: memberUser!.id,
        role: MEMBER_ROLES.MEMBER,
      },
    });

    // Regular member attempts to list invitations -> 403
    const memberRes = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${org.id}/invitations`,
      headers: { cookie: cookieMember },
    });
    expect(memberRes.statusCode).toBe(403);
    const memberBody = JSON.parse(memberRes.payload);
    expect(memberBody.error.code).toBe(AUTH_ERROR_CODES.FORBIDDEN_ADMIN_ACCESS);
  });

  it('supports full server-side pagination, status filtering, and sorting for owner/admin', async () => {
    const emailOwner = `inv-admin-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    // Sign up Owner
    const signUpOwnerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email: emailOwner, password, name: 'Owner User' },
    });
    const cookieOwner = resolveCookieHeader(signUpOwnerRes.headers['set-cookie']);

    // Create organization
    const createOrgRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: {
        'content-type': 'application/json',
        cookie: cookieOwner,
      },
      payload: {
        name: 'Invitations Pagination Org',
        slug: `inv-page-${Date.now()}`,
      },
    });
    expect(createOrgRes.statusCode).toBe(201);
    const org = JSON.parse(createOrgRes.payload);

    const ownerInDb = await prisma.user.findUnique({ where: { email: emailOwner } });
    expect(ownerInDb).not.toBeNull();

    // 1. Initial list when no invitations exist
    const emptyRes = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${org.id}/invitations`,
      headers: { cookie: cookieOwner },
    });
    expect(emptyRes.statusCode).toBe(200);
    const emptyBody = JSON.parse(emptyRes.payload);
    expect(emptyBody.data).toHaveLength(0);
    expect(emptyBody.pagination).toEqual({
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    // 2. Seed 3 invitations with different statuses and creation dates
    const now = Date.now();
    await prisma.invitation.createMany({
      data: [
        {
          organizationId: org.id,
          email: 'pending-1@example.com',
          role: 'member',
          status: INVITATION_STATUS.PENDING,
          expiresAt: new Date(now + 86400000),
          inviterId: ownerInDb!.id,
          createdAt: new Date(now - 3000),
        },
        {
          organizationId: org.id,
          email: 'accepted-2@example.com',
          role: 'member',
          status: INVITATION_STATUS.ACCEPTED,
          expiresAt: new Date(now + 86400000),
          inviterId: ownerInDb!.id,
          createdAt: new Date(now - 2000),
        },
        {
          organizationId: org.id,
          email: 'pending-3@example.com',
          role: 'admin',
          status: INVITATION_STATUS.PENDING,
          expiresAt: new Date(now + 86400000),
          inviterId: ownerInDb!.id,
          createdAt: new Date(now - 1000),
        },
      ],
    });

    // 3. Fetch all with default pagination
    const allRes = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${org.id}/invitations`,
      headers: { cookie: cookieOwner },
    });
    expect(allRes.statusCode).toBe(200);
    const allBody = JSON.parse(allRes.payload);
    expect(allBody.data).toHaveLength(3);
    expect(allBody.pagination).toEqual({
      total: 3,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    // Check inviter user relation was selected
    expect(allBody.data[0].user).toBeDefined();
    expect(allBody.data[0].user.name).toBe('Owner User');
    expect(allBody.data[0].user.email).toBe(emailOwner);

    // 4. Filter by status: 'pending'
    const pendingRes = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${org.id}/invitations?status=pending`,
      headers: { cookie: cookieOwner },
    });
    expect(pendingRes.statusCode).toBe(200);
    const pendingBody = JSON.parse(pendingRes.payload);
    expect(pendingBody.data).toHaveLength(2);
    expect(pendingBody.pagination).toEqual({
      total: 2,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    for (const item of pendingBody.data) {
      expect(item.status).toBe(INVITATION_STATUS.PENDING);
    }

    // 5. Filter by status: 'all'
    const statusAllRes = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${org.id}/invitations?status=all`,
      headers: { cookie: cookieOwner },
    });
    expect(statusAllRes.statusCode).toBe(200);
    const statusAllBody = JSON.parse(statusAllRes.payload);
    expect(statusAllBody.data).toHaveLength(3);

    // 6. Pagination: page 1 of size 2
    const page1Res = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${org.id}/invitations?page=1&pageSize=2`,
      headers: { cookie: cookieOwner },
    });
    expect(page1Res.statusCode).toBe(200);
    const page1Body = JSON.parse(page1Res.payload);
    expect(page1Body.data).toHaveLength(2);
    expect(page1Body.pagination).toEqual({
      total: 3,
      page: 1,
      pageSize: 2,
      totalPages: 2,
    });

    // 7. Pagination: page 2 of size 2
    const page2Res = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${org.id}/invitations?page=2&pageSize=2`,
      headers: { cookie: cookieOwner },
    });
    expect(page2Res.statusCode).toBe(200);
    const page2Body = JSON.parse(page2Res.payload);
    expect(page2Body.data).toHaveLength(1);
    expect(page2Body.pagination).toEqual({
      total: 3,
      page: 2,
      pageSize: 2,
      totalPages: 2,
    });

    // 8. Sorting: sortOrder=asc vs sortOrder=desc
    const ascRes = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${org.id}/invitations?sortOrder=asc`,
      headers: { cookie: cookieOwner },
    });
    expect(ascRes.statusCode).toBe(200);
    const ascBody = JSON.parse(ascRes.payload);
    expect(ascBody.data[0].email).toBe('pending-1@example.com');

    const descRes = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${org.id}/invitations?sortOrder=desc`,
      headers: { cookie: cookieOwner },
    });
    expect(descRes.statusCode).toBe(200);
    const descBody = JSON.parse(descRes.payload);
    expect(descBody.data[0].email).toBe('pending-3@example.com');
  });

  it('re-throws unexpected internal errors to error handler (500)', async () => {
    const email = `org-inv-err-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Err Inv User' },
    });
    const cookieHeader = resolveCookieHeader(signUpRes.headers['set-cookie']);

    vi.spyOn(prisma.member, 'findFirst').mockRejectedValueOnce(new Error('Unexpected DB Error'));

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations/00000000-0000-0000-0000-000000000000/invitations',
      headers: { cookie: cookieHeader },
    });

    expect(res.statusCode).toBe(500);
  });
});
