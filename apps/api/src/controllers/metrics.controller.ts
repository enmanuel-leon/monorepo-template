import type { FastifyReply, FastifyRequest } from 'fastify';
import { auth } from '../lib/auth.js';
import { getMetricsSummary } from '../services/metrics.service.js';
import { AUTH_ERROR_CODES } from '../constants/auth.constants.js';

export async function getMetricsSummaryHandler(
  request: FastifyRequest<{ Querystring: { organizationId?: string } }>,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  let organizationId: string | undefined = undefined;
  if (request.query.organizationId && request.query.organizationId.trim() !== '') {
    organizationId = request.query.organizationId;
  }

  try {
    const metrics = await getMetricsSummary({
      userId: session.user.id,
      organizationId,
    });

    return reply.send({ metrics });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === AUTH_ERROR_CODES.FORBIDDEN_ORGANIZATION_ACCESS) {
      return reply.status(403).send({
        error: {
          code: AUTH_ERROR_CODES.FORBIDDEN_ORGANIZATION_ACCESS,
          message: 'You are not a member of the specified organization.',
          statusCode: 403,
        },
        code: AUTH_ERROR_CODES.FORBIDDEN_ORGANIZATION_ACCESS,
      });
    }
    throw err;
  }
}
