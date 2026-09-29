import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import { authRoutes } from '../../src/routes/v1/auth.route.js';
import { handleAuth } from '../../src/controllers/auth.controller.js';
import { auth } from '../../src/lib/auth.js';

describe('Auth Route and Controller Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  async function createTestApp() {
    const app = Fastify({ logger: false });
    await app.register(sensible);
    await app.register(authRoutes, { prefix: '/api/v1' });
    return app;
  }

  it('handles OPTIONS request with 204 No Content', async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/auth/session',
    });

    expect(response.statusCode).toBe(204);
    expect(response.payload).toBe('');
  });

  it('handles empty body in application/json parser', async () => {
    const app = await createTestApp();

    vi.spyOn(auth, 'handler').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/check',
      headers: {
        'content-type': 'application/json',
      },
      payload: '',
    });

    expect(response.statusCode).toBe(200);
  });

  it('handles malformed JSON body in application/json parser', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/check',
      headers: {
        'content-type': 'application/json',
      },
      payload: '{"malformed":',
    });

    expect(response.statusCode).toBe(500);
  });

  it('tests custom content type parser with non-string body and non-Error exception', async () => {
    let capturedParser: any;
    const mockFastify = {
      addContentTypeParser: vi.fn((_type: string, _opts: unknown, fn: unknown) => {
        capturedParser = fn;
      }),
      route: vi.fn(),
    };

    await authRoutes(mockFastify as any);
    expect(capturedParser).toBeDefined();

    // 1. Non-string body branch
    await new Promise<void>((resolve) => {
      capturedParser({} as any, 12345, (err: unknown, result: unknown) => {
        expect(err).toBeNull();
        expect(result).toBeUndefined();
        resolve();
      });
    });

    // 2. Successful JSON parse
    await new Promise<void>((resolve) => {
      capturedParser({} as any, '{"hello":"world"}', (err: unknown, result: unknown) => {
        expect(err).toBeNull();
        expect(result).toEqual({ hello: 'world' });
        resolve();
      });
    });

    // 3. Non-Error throw branch
    const jsonParseSpy = vi.spyOn(JSON, 'parse').mockImplementation(() => {
      throw 'string parsing exception';
    });

    await new Promise<void>((resolve) => {
      capturedParser({} as any, '{"fail":true}', (err: unknown, result: unknown) => {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe('string parsing exception');
        expect(result).toBeUndefined();
        resolve();
      });
    });

    jsonParseSpy.mockRestore();
  });

  it('handles GET request without body and forwards allowed headers', async () => {
    const app = await createTestApp();

    vi.spyOn(auth, 'handler').mockResolvedValue(
      new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-length': '20',
          'transfer-encoding': 'chunked',
          'x-custom-auth': 'custom-value-xyz',
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/get-session',
      // Notice: omitting host header tests host fallback to localhost
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-custom-auth']).toBe('custom-value-xyz');
    expect(response.headers['transfer-encoding']).toBeUndefined();
    const body = JSON.parse(response.payload);
    expect(body.user).toBeNull();
  });

  it('handles POST request with valid JSON body forwarding payload to auth handler', async () => {
    const app = await createTestApp();

    const authHandlerSpy = vi.spyOn(auth, 'handler').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-in/email',
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        email: 'user@example.com',
        password: 'SecurePassword123!',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(authHandlerSpy).toHaveBeenCalledTimes(1);

    const callArg = authHandlerSpy.mock.calls[0][0] as Request;
    const bodyText = await callArg.text();
    expect(bodyText).toBe(
      JSON.stringify({
        email: 'user@example.com',
        password: 'SecurePassword123!',
      }),
    );
  });

  it('handles auth bridge error when auth.handler throws', async () => {
    const app = await createTestApp();

    vi.spyOn(auth, 'handler').mockRejectedValue(new Error('Internal database unreachable'));

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/failing-endpoint',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.payload);
    expect(body.message).toBe('Internal authentication error');
  });

  it('tests handleAuth directly when host header is missing', async () => {
    const mockReply = {
      header: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };

    vi.spyOn(auth, 'handler').mockResolvedValue(new Response('ok', { status: 200 }));

    const mockRequest = {
      method: 'GET',
      url: '/api/v1/auth/session',
      headers: {},
    };

    await handleAuth(mockRequest as any, mockReply as any);
    expect(mockReply.status).toHaveBeenCalledWith(200);
  });
});
