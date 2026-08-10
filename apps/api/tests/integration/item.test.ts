import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('Item API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  it('rejects unauthenticated GET /api/v1/items', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/items',
    });

    expect(response.statusCode).toBe(401);
  });
});
