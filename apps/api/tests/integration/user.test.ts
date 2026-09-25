import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('User API', () => {
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
    const cookieHeader = resolveCookieHeader(setCookie);

    const meRes = await app.inject({
      method: 'GET',
      url: '/me',
      headers: {
        cookie: cookieHeader,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const body = JSON.parse(meRes.payload);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(email);
    expect(body.user.hasSeenTour).toBe(false);
  });

  it('PATCH /me updates user preferences (locale, theme, tour flag)', async () => {
    const email = `patch-test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Patch Test User' },
    });

    const setCookie = signUpRes.headers['set-cookie'];
    const cookieHeader = resolveCookieHeader(setCookie);

    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      payload: {
        locale: 'en',
        theme: 'light',
        hasSeenTour: true,
        hasCompletedOnboarding: true,
      },
    });

    expect(patchRes.statusCode).toBe(200);
    const patchBody = JSON.parse(patchRes.payload);
    expect(patchBody.user.locale).toBe('en');
    expect(patchBody.user.theme).toBe('light');
    expect(patchBody.user.hasSeenTour).toBe(true);
    expect(patchBody.user.hasCompletedOnboarding).toBe(true);

    const meRes = await app.inject({
      method: 'GET',
      url: '/me',
      headers: {
        cookie: cookieHeader,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const getBody = JSON.parse(meRes.payload);
    expect(getBody.user.locale).toBe('en');
    expect(getBody.user.theme).toBe('light');
    expect(getBody.user.hasSeenTour).toBe(true);
    expect(getBody.user.hasCompletedOnboarding).toBe(true);
  });
});
