import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('Organization API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  it('rejects unauthenticated request to /api/v1/organizations', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
    });

    expect(response.statusCode).toBe(401);
  });

  it('creates and lists organizations for authenticated user', async () => {
    const email = `org-test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Org Owner' },
    });

    const setCookie = signUpRes.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie || '';

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
});
