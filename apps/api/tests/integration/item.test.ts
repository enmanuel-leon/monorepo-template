import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

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

    // 1. Create item
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

    // 3. Delete item
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
});
