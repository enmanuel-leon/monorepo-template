import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { AUTH_ERROR_CODES, INVITATION_STATUS } from '../../src/constants/auth.constants.js';

describe('Metrics API Integration Tests', () => {
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

  it('rejects unauthenticated request to /api/v1/metrics/summary', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/metrics/summary',
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 400 when invalid UUID format is passed for organizationId', async () => {
    const email = `metrics-val-${Date.now()}@example.com`;
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
      url: '/api/v1/metrics/summary?organizationId=invalid-uuid',
      headers: { cookie: cookieHeader },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 403 FORBIDDEN_ORGANIZATION_ACCESS when user is not member of target organization', async () => {
    const emailA = `metrics-owner-${Date.now()}@example.com`;
    const emailB = `metrics-outsider-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    // Sign up User A and create an organization
    const signUpARes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email: emailA, password, name: 'Owner User' },
    });
    const cookieA = resolveCookieHeader(signUpARes.headers['set-cookie']);

    const createOrgRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: {
        'content-type': 'application/json',
        cookie: cookieA,
      },
      payload: {
        name: 'Private Metrics Org',
        slug: `private-org-${Date.now()}`,
      },
    });
    expect(createOrgRes.statusCode).toBe(201);
    const org = JSON.parse(createOrgRes.payload);

    // Sign up User B
    const signUpBRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email: emailB, password, name: 'Outsider User' },
    });
    const cookieB = resolveCookieHeader(signUpBRes.headers['set-cookie']);

    // User B tries to query metrics for Org A
    const metricsRes = await app.inject({
      method: 'GET',
      url: `/api/v1/metrics/summary?organizationId=${org.id}`,
      headers: { cookie: cookieB },
    });

    expect(metricsRes.statusCode).toBe(403);
    const errorBody = JSON.parse(metricsRes.payload);
    expect(errorBody.error.code).toBe(AUTH_ERROR_CODES.FORBIDDEN_ORGANIZATION_ACCESS);
  });

  it('returns personal workspace metrics when organizationId is omitted and updates profile completeness', async () => {
    const email = `metrics-personal-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Personal Metrics User' },
    });
    const cookieHeader = resolveCookieHeader(signUpRes.headers['set-cookie']);

    // Create a personal item
    const createItemRes = await app.inject({
      method: 'POST',
      url: '/api/v1/items',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      payload: {
        title: 'Personal Task',
        description: 'Personal workspace item',
      },
    });
    expect(createItemRes.statusCode).toBe(201);

    // Fetch personal metrics
    const metricsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/metrics/summary',
      headers: { cookie: cookieHeader },
    });

    expect(metricsRes.statusCode).toBe(200);
    const body = JSON.parse(metricsRes.payload);

    expect(body.metrics).toBeDefined();
    expect(body.metrics.items.total).toBe(1);
    expect(body.metrics.items.count).toBe(1);
    expect(body.metrics.items.recent).toHaveLength(1);
    expect(body.metrics.items.recent[0].title).toBe('Personal Task');
    expect(body.metrics.organization).toBeNull();
    expect(body.metrics.security.passkeyCount).toBe(0);
    expect(body.metrics.security.twoFactorEnabled).toBe(false);
    expect(body.metrics.profile.name).toBe('Personal Metrics User');
    expect(body.metrics.profile.email).toBe(email);
    expect(body.metrics.profile.isComplete).toBe(false);

    // Upsert a test country and timezone in DB
    const country = await prisma.country.upsert({
      where: { code: 'US' },
      update: {},
      create: {
        code: 'US',
        iso3: 'USA',
        name: 'United States',
        flag: 'US',
      },
    });

    const timezone = await prisma.timezone.upsert({
      where: { ianaName: 'America/New_York' },
      update: {},
      create: {
        countryCode: country.code,
        ianaName: 'America/New_York',
        displayName: 'Eastern Time (US & Canada)',
        gmtOffset: 'UTC-05:00',
      },
    });

    // Update user profile with country and timezone
    const updateProfileRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      payload: {
        countryCode: country.code,
        timezoneId: timezone.id,
      },
    });
    expect(updateProfileRes.statusCode).toBe(200);

    // Fetch metrics again to verify profile is now complete
    const updatedMetricsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/metrics/summary',
      headers: { cookie: cookieHeader },
    });
    expect(updatedMetricsRes.statusCode).toBe(200);
    const updatedBody = JSON.parse(updatedMetricsRes.payload);
    expect(updatedBody.metrics.profile.isComplete).toBe(true);
  });

  it('aggregates organization metrics when organizationId is provided and caller is owner', async () => {
    const email = `metrics-org-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Org Admin User' },
    });
    const cookieHeader = resolveCookieHeader(signUpRes.headers['set-cookie']);

    // Create organization
    const createOrgRes = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      payload: {
        name: 'Metrics Test Org',
        slug: `metrics-org-${Date.now()}`,
      },
    });
    expect(createOrgRes.statusCode).toBe(201);
    const org = JSON.parse(createOrgRes.payload);

    // Create an item inside the organization
    const createItemRes = await app.inject({
      method: 'POST',
      url: '/api/v1/items',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      payload: {
        title: 'Org Task Item',
        description: 'Item inside tenant',
        organizationId: org.id,
      },
    });
    expect(createItemRes.statusCode).toBe(201);

    // Create a pending invitation directly in DB
    const userInDb = await prisma.user.findUnique({ where: { email } });
    expect(userInDb).not.toBeNull();

    await prisma.invitation.create({
      data: {
        organizationId: org.id,
        email: `invited-${Date.now()}@example.com`,
        role: 'member',
        status: INVITATION_STATUS.PENDING,
        expiresAt: new Date(Date.now() + 86400000),
        inviterId: userInDb!.id,
      },
    });

    // Fetch organization metrics
    const metricsRes = await app.inject({
      method: 'GET',
      url: `/api/v1/metrics/summary?organizationId=${org.id}`,
      headers: { cookie: cookieHeader },
    });

    expect(metricsRes.statusCode).toBe(200);
    const body = JSON.parse(metricsRes.payload);

    expect(body.metrics.items.total).toBe(1);
    expect(body.metrics.items.count).toBe(1);
    expect(body.metrics.items.recent).toHaveLength(1);
    expect(body.metrics.items.recent[0].title).toBe('Org Task Item');

    expect(body.metrics.organization).toBeDefined();
    expect(body.metrics.organization.id).toBe(org.id);
    expect(body.metrics.organization.name).toBe('Metrics Test Org');
    expect(body.metrics.organization.memberCount).toBe(1);
    expect(body.metrics.organization.pendingInvitationCount).toBe(1);
    expect(body.metrics.organization.userRole).toBe('owner');
  });

  it('re-throws unexpected internal errors to error handler (500)', async () => {
    const email = `metrics-err-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const signUpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: { email, password, name: 'Err User' },
    });
    const cookieHeader = resolveCookieHeader(signUpRes.headers['set-cookie']);

    vi.spyOn(prisma.item, 'count').mockRejectedValueOnce(new Error('Unexpected DB Error'));

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/metrics/summary',
      headers: { cookie: cookieHeader },
    });

    expect(res.statusCode).toBe(500);
  });
});
