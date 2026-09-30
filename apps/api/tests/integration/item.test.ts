import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { AUTH_ERROR_CODES } from '../../src/constants/auth.constants.js';

describe('Item API Integration Tests', () => {
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

  it('rejects unauthenticated GET /api/v1/items', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/items',
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects unauthenticated POST /api/v1/items', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/items',
      payload: { title: 'Test Item' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects unauthenticated DELETE /api/v1/items/:id', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/items/some-id',
    });

    expect(response.statusCode).toBe(401);
  });

  it('supports full authenticated CRUD lifecycle (create, list, delete)', async () => {
    const email = `item-user-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Item Test User' },
    });

    const setCookie = signUpRes.headers['set-cookie'];
    const cookieHeader = resolveCookieHeader(setCookie);

    // 1. Create personal item
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/items',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      payload: {
        title: 'Integration Test Item',
        description: 'Created during integration test',
      },
    });

    expect(createRes.statusCode).toBe(201);
    const createdItem = JSON.parse(createRes.payload);
    expect(createdItem.id).toBeDefined();
    expect(createdItem.title).toBe('Integration Test Item');

    // 2. List items
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/items',
      headers: {
        cookie: cookieHeader,
      },
    });

    expect(listRes.statusCode).toBe(200);
    const items = JSON.parse(listRes.payload);
    expect(Array.isArray(items)).toBe(true);
    expect(items.some((i: { id: string }) => i.id === createdItem.id)).toBe(true);

    // 3. Delete non-existent item returns 404
    const notFoundRes = await app.inject({
      method: 'DELETE',
      url: '/api/v1/items/00000000-0000-0000-0000-000000000000',
      headers: {
        cookie: cookieHeader,
      },
    });
    expect(notFoundRes.statusCode).toBe(404);

    // 4. Delete personal item successfully
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/items/${createdItem.id}`,
      headers: {
        cookie: cookieHeader,
      },
    });

    expect(deleteRes.statusCode).toBe(200);
    const deleteBody = JSON.parse(deleteRes.payload);
    expect(deleteBody.success).toBe(true);
  });

  it('enforces multitenancy isolation on item creation, listing, and deletion', async () => {
    // 1. Create User A (Owner of Org A)
    const emailA = `org-owner-${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    const userARes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email: emailA, password, name: 'User A' },
    });
    const cookieA = resolveCookieHeader(userARes.headers['set-cookie']);

    const orgRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: {
        'content-type': 'application/json',
        cookie: cookieA,
      },
      payload: { name: 'Tenant Alpha', slug: `tenant-alpha-${Date.now()}` },
    });
    expect(orgRes.statusCode).toBe(201);
    const org = JSON.parse(orgRes.payload);

    // 2. User A creates item in Tenant Alpha
    const itemRes = await app.inject({
      method: 'POST',
      url: '/api/v1/items',
      headers: {
        'content-type': 'application/json',
        cookie: cookieA,
      },
      payload: {
        title: 'Alpha Secret Document',
        organizationId: org.id,
      },
    });
    expect(itemRes.statusCode).toBe(201);
    const alphaItem = JSON.parse(itemRes.payload);

    // 3. Create User B (Outsider - not in Tenant Alpha)
    const emailB = `org-outsider-${Date.now()}@example.com`;
    const userBRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email: emailB, password, name: 'User B' },
    });
    const cookieB = resolveCookieHeader(userBRes.headers['set-cookie']);

    // User B tries to query Tenant Alpha's items -> returns empty array
    const listOutsiderRes = await app.inject({
      method: 'GET',
      url: `/api/v1/items?organizationId=${org.id}`,
      headers: { cookie: cookieB },
    });
    expect(listOutsiderRes.statusCode).toBe(200);
    const outsiderItems = JSON.parse(listOutsiderRes.payload);
    expect(outsiderItems).toEqual([]);

    // User B tries to delete User A's organization item -> returns 403 Forbidden
    const deleteOutsiderRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/items/${alphaItem.id}`,
      headers: { cookie: cookieB },
    });
    expect(deleteOutsiderRes.statusCode).toBe(403);
    const deleteOutsiderBody = JSON.parse(deleteOutsiderRes.payload);
    expect(deleteOutsiderBody.error.code).toBe(AUTH_ERROR_CODES.FORBIDDEN_ORGANIZATION_ACCESS);
    expect(deleteOutsiderBody.code).toBe(AUTH_ERROR_CODES.FORBIDDEN_ORGANIZATION_ACCESS);

    // User B tries to create item in Tenant Alpha -> returns 403 Forbidden
    const createOutsiderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/items',
      headers: {
        'content-type': 'application/json',
        cookie: cookieB,
      },
      payload: {
        title: 'Injected Item',
        organizationId: org.id,
      },
    });
    expect(createOutsiderRes.statusCode).toBe(403);
    const createOutsiderBody = JSON.parse(createOutsiderRes.payload);
    expect(createOutsiderBody.error.code).toBe(AUTH_ERROR_CODES.FORBIDDEN_ORGANIZATION_ACCESS);
    expect(createOutsiderBody.code).toBe(AUTH_ERROR_CODES.FORBIDDEN_ORGANIZATION_ACCESS);
  });
});
