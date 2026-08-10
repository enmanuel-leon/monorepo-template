import type { FastifyInstance } from 'fastify';
import { handleAuth } from '../../controllers/auth.controller.js';

const AUTH_METHODS: Array<'GET' | 'POST' | 'OPTIONS'> = ['GET', 'POST', 'OPTIONS'];

export async function authRoutes(fastify: FastifyInstance) {
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_request, body, done) => {
      const text = typeof body === 'string' ? body : '';
      if (text.length === 0) {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(text));
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        done(err, undefined);
      }
    },
  );

  fastify.route({
    method: AUTH_METHODS,
    url: '/auth/*',
    schema: { hide: true },
    handler: handleAuth,
  });
}
