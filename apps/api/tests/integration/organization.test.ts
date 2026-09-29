import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

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
});
