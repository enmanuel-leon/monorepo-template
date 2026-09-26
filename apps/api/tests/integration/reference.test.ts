import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('Reference API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  it('GET /api/v1/reference/countries returns 200 and country list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reference/countries',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.countries).toBeDefined();
    expect(Array.isArray(body.countries)).toBe(true);
  });

  it('GET /api/v1/reference/timezones returns 200 and all timezones when query omitted', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reference/timezones',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.timezones).toBeDefined();
    expect(Array.isArray(body.timezones)).toBe(true);
  });

  it('GET /api/v1/reference/timezones?countryCode=MX returns 200 filtered by country', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reference/timezones?countryCode=MX',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.timezones).toBeDefined();
    expect(Array.isArray(body.timezones)).toBe(true);
  });
});
