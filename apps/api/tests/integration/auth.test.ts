import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('Auth Integration API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  it('POST /api/v1/auth/sign-up/email creates a user and session', async () => {
    const email = `test-user-${Date.now()}@example.com`;
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        email,
        password: 'TestPassword123!',
        name: 'Test User',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(email);
  });

  it('POST /api/v1/auth/sign-in/email authenticates existing user', async () => {
    const email = `signin-user-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    // Sign up first
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'SignIn User' },
    });

    // Sign in
    const signInRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-in/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password },
    });

    expect(signInRes.statusCode).toBe(200);
    const body = JSON.parse(signInRes.payload);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(email);
  });

  it('POST /api/v1/auth/organization/create creates organization via auth bridge', async () => {
    const email = `org-owner-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Org Owner' },
    });

    const setCookie = signUpRes.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie || '';

    const createOrgRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/organization/create',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      payload: {
        name: 'Bridge Org',
        slug: `bridge-org-${Date.now()}`,
      },
    });

    expect(createOrgRes.statusCode).toBe(200);
    const body = JSON.parse(createOrgRes.payload);
    expect(body.name).toBe('Bridge Org');
  });
});
