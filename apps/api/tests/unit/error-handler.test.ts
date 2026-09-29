import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { errorHandlerPlugin } from '../../src/plugins/error-handler.plugin.js';

describe('Error Handler Plugin Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  async function createTestApp() {
    const app = Fastify({ logger: false });
    await app.register(errorHandlerPlugin);
    return app;
  }

  it('handles Prisma P2002 unique constraint violation', async () => {
    const app = await createTestApp();
    app.get('/test-p2002', async () => {
      const error = new Error('Unique constraint failed') as Error & { code?: string };
      error.code = 'P2002';
      throw error;
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-p2002',
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.payload);
    expect(body).toEqual({
      error: {
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        message: 'A record with this value already exists.',
        statusCode: 409,
      },
    });
  });

  it('handles Prisma P2025 record not found', async () => {
    const app = await createTestApp();
    app.get('/test-p2025', async () => {
      const error = new Error('Record does not exist') as Error & { code?: string };
      error.code = 'P2025';
      throw error;
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-p2025',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body).toEqual({
      error: {
        code: 'RECORD_NOT_FOUND',
        message: 'The requested resource was not found.',
        statusCode: 404,
      },
    });
  });

  it('handles Prisma P2003 foreign key violation', async () => {
    const app = await createTestApp();
    app.get('/test-p2003', async () => {
      const error = new Error('Foreign key constraint failed') as Error & { code?: string };
      error.code = 'P2003';
      throw error;
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-p2003',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body).toEqual({
      error: {
        code: 'FOREIGN_KEY_VIOLATION',
        message: 'Invalid reference to a related resource.',
        statusCode: 400,
      },
    });
  });

  it('handles schema validation errors with details', async () => {
    const app = await createTestApp();
    app.get('/test-validation', async () => {
      const error = new Error('Validation failed') as Error & { validation?: unknown };
      error.validation = [
        {
          keyword: 'required',
          dataPath: '.title',
          message: 'should have required property title',
        },
      ];
      throw error;
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-validation',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        statusCode: 400,
        details: [
          {
            keyword: 'required',
            dataPath: '.title',
            message: 'should have required property title',
          },
        ],
      },
    });
  });

  it('handles custom error with statusCode and custom code', async () => {
    const app = await createTestApp();
    app.get('/test-custom', async () => {
      const error = new Error('I am a custom teapot') as Error & {
        statusCode?: number;
        code?: string;
      };
      error.statusCode = 418;
      error.code = 'CUSTOM_TEAPOT';
      throw error;
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-custom',
    });

    expect(response.statusCode).toBe(418);
    const body = JSON.parse(response.payload);
    expect(body).toEqual({
      error: {
        code: 'CUSTOM_TEAPOT',
        message: 'I am a custom teapot',
        statusCode: 418,
      },
    });
  });

  it('handles generic unexpected error defaulting to 500 and INTERNAL_SERVER_ERROR', async () => {
    const app = await createTestApp();
    app.get('/test-unexpected', async () => {
      throw new Error('Database connection broke unexpectedly');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-unexpected',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.payload);
    expect(body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database connection broke unexpectedly',
        statusCode: 500,
      },
    });
  });

  it('handles generic error with empty message defaulting to standard fallback', async () => {
    const app = await createTestApp();
    app.get('/test-empty-message', async () => {
      const error = new Error('');
      error.message = '';
      throw error;
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-empty-message',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.payload);
    expect(body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
        statusCode: 500,
      },
    });
  });

  it('handles error with custom statusCode only', async () => {
    const app = await createTestApp();
    app.get('/test-status-only', async () => {
      const error = new Error('Payment Required') as Error & { statusCode?: number };
      error.statusCode = 402;
      throw error;
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-status-only',
    });

    expect(response.statusCode).toBe(402);
    const body = JSON.parse(response.payload);
    expect(body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Payment Required',
        statusCode: 402,
      },
    });
  });

  it('handles error with custom code only', async () => {
    const app = await createTestApp();
    app.get('/test-code-only', async () => {
      const error = new Error('Custom rule broken') as Error & { code?: string };
      error.code = 'RULE_BROKEN';
      throw error;
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-code-only',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.payload);
    expect(body).toEqual({
      error: {
        code: 'RULE_BROKEN',
        message: 'Custom rule broken',
        statusCode: 500,
      },
    });
  });
});
