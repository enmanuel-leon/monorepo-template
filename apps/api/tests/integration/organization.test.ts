import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { MEMBER_ROLES } from '../../src/constants/auth.constants.js';

describe('Organization API', () => {
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

  it('rejects unauthenticated request to /api/v1/organizations', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects unauthenticated POST request to /api/v1/organizations', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      payload: { name: 'Unauthorized Corp' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('creates and lists organizations for authenticated user, and enforces owner limit', async () => {
    const email = `org-test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Org Owner' },
    });

    const setCookie = signUpRes.headers['set-cookie'];
    const cookieHeader = resolveCookieHeader(setCookie);

    // Create organization
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      payload: {
        name: 'Acme Test Corp',
        slug: `acme-${Date.now()}`,
      },
    });

    expect(createRes.statusCode).toBe(201);

    // Attempt second organization creation while already owner -> 403 Forbidden
    const secondCreateRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      payload: {
        name: 'Second Forbidden Corp',
        slug: `forbidden-${Date.now()}`,
      },
    });

    expect(secondCreateRes.statusCode).toBe(403);
    const errorBody = JSON.parse(secondCreateRes.payload);
    expect(errorBody.error.code).toBe('OWNER_LIMIT_REACHED');

    // List organizations
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
      headers: {
        cookie: cookieHeader,
      },
    });

    expect(listRes.statusCode).toBe(200);
    const body = JSON.parse(listRes.payload);
    expect(body.organizations).toBeDefined();
    expect(body.organizations.length).toBeGreaterThanOrEqual(1);
  });

  it('successfully sets active organization via /api/v1/auth/organization/set-active', async () => {
    const ownerEmail = `org-owner-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    // 1. Sign up a user.
    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email: ownerEmail, password, name: 'Org Owner' },
    });
    expect(signUpRes.statusCode).toBe(200);

    const ownerCookieHeader = resolveCookieHeader(signUpRes.headers['set-cookie']);

    // 2. Create an organization using POST /api/v1/organizations.
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: {
        'content-type': 'application/json',
        cookie: ownerCookieHeader,
      },
      payload: {
        name: 'Active Org Test',
        slug: `active-org-${Date.now()}`,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const org = JSON.parse(createRes.payload);

    // 3. Call POST /api/v1/auth/organization/set-active with { organizationId: org.id }, origin: 'http://localhost:5173', and the cookie header.
    const ownerSetActiveRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/organization/set-active',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
        cookie: ownerCookieHeader,
      },
      payload: {
        organizationId: org.id,
      },
    });

    // 4. Log the statusCode and payload, and expect statusCode to be 200.
    console.log('Owner set-active statusCode:', ownerSetActiveRes.statusCode);
    console.log('Owner set-active payload:', ownerSetActiveRes.payload);
    expect(ownerSetActiveRes.statusCode).toBe(200);

    // 5. Also sign up a second user, add them as member to the organization via prisma.member.create, and call POST /api/v1/auth/organization/set-active with { organizationId: org.id } and the second user's cookie.
    const memberEmail = `org-member-${Date.now()}@example.com`;
    const secondSignUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email: memberEmail, password, name: 'Org Member' },
    });
    expect(secondSignUpRes.statusCode).toBe(200);

    const memberCookieHeader = resolveCookieHeader(secondSignUpRes.headers['set-cookie']);

    const memberUser = await prisma.user.findUnique({
      where: { email: memberEmail },
    });
    expect(memberUser).not.toBeNull();

    await prisma.member.create({
      data: {
        organizationId: org.id,
        userId: memberUser!.id,
        role: MEMBER_ROLES.MEMBER,
      },
    });

    const memberSetActiveRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/organization/set-active',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
        cookie: memberCookieHeader,
      },
      payload: {
        organizationId: org.id,
      },
    });

    // 6. Log the statusCode and payload, and expect statusCode to be 200.
    console.log('Member set-active statusCode:', memberSetActiveRes.statusCode);
    console.log('Member set-active payload:', memberSetActiveRes.payload);
    expect(memberSetActiveRes.statusCode).toBe(200);
  });

  it('calls listOrganizations for a user that has an organization created via Prisma', async () => {
    // 1. Sign up a user.
    const email = `org-prisma-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Prisma Org User' },
    });
    expect(signUpRes.statusCode).toBe(200);

    const cookieHeader = resolveCookieHeader(signUpRes.headers['set-cookie']);
    const signUpBody = JSON.parse(signUpRes.payload);
    const user = signUpBody.user;
    expect(user).toBeDefined();

    // 2. Create an organization with prisma.organization.create with members: { create: { userId: user.id, role: 'owner' } } (EXACTLY like seed-admin.ts).
    const createdOrg = await prisma.organization.create({
      data: {
        name: 'Default Organization',
        slug: `default-org-${Date.now()}`,
        members: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
      },
    });

    // 3. Call GET /api/v1/auth/organization/list with that user's session cookie and origin: 'http://localhost:5173'.
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/organization/list',
      headers: {
        origin: 'http://localhost:5173',
        cookie: cookieHeader,
      },
    });

    // 4. Log the statusCode and payload.
    console.log('listOrganizations statusCode:', listRes.statusCode);
    console.log('listOrganizations payload:', listRes.payload);

    // 5. Expect statusCode to be 200 and payload to contain the organization.
    expect(listRes.statusCode).toBe(200);
    expect(listRes.payload).toContain(createdOrg.id);
    const payload = JSON.parse(listRes.payload);
    if (Array.isArray(payload)) {
      expect(payload).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createdOrg.id,
          }),
        ]),
      );
    } else {
      expect(payload).toMatchObject({
        id: createdOrg.id,
      });
    }
  });
});
