import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('User API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  it('GET /me returns 401 for unauthenticated request', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/me',
    });

    expect(response.statusCode).toBe(401);
  });

  it('GET /me returns current user info when cookie session is provided', async () => {
    const email = `me-test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Me Test User' },
    });

    const setCookie = signUpRes.headers['set-cookie'];

    const meRes = await app.inject({
      method: 'GET',
      url: '/me',
      headers: {
        cookie: Array.isArray(setCookie) ? setCookie.join('; ') : setCookie || '',
      },
    });

    expect(meRes.statusCode).toBe(200);
    const body = JSON.parse(meRes.payload);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(email);
  });
});
