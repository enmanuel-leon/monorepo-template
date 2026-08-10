import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { auth } from '../lib/auth.js';

const SKIP_RESPONSE_HEADERS = new Set(['content-length', 'content-encoding', 'transfer-encoding']);

function buildAuthRequestBody(method: string, body: unknown): string | null {
  if (method === 'GET' || method === 'HEAD' || body === undefined) {
    return null;
  }
  return JSON.stringify(body);
}

export async function handleAuth(request: FastifyRequest, reply: FastifyReply) {
  if (request.method === 'OPTIONS') {
    return reply.status(204).send();
  }

  try {
    const headers = fromNodeHeaders(request.headers);
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const requestBody = buildAuthRequestBody(request.method, request.body);

    headers.delete('content-length');

    const authRequest = new Request(url.toString(), {
      method: request.method,
      headers,
      body: requestBody,
    });

    const response = await auth.handler(authRequest);
    const responseText = await response.text();

    response.headers.forEach((value, key) => {
      if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
        reply.header(key, value);
      }
    });

    return reply.status(response.status).send(responseText);
  } catch (error) {
    request.log.error({ err: error }, 'Authentication Bridge Error');
    throw request.server.httpErrors.internalServerError('Internal authentication error');
  }
}
