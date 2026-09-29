import type { FastifyReply, FastifyRequest } from 'fastify';
import { auth } from '../lib/auth.js';
import { listItems, createItem, deleteItem } from '../services/item.service.js';

export async function getItems(
  request: FastifyRequest<{ Querystring: { organizationId?: string } }>,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  const items = await listItems(session.user.id, request.query.organizationId);
  return reply.send(items);
}

export async function postItem(
  request: FastifyRequest<{
    Body: { title: string; description?: string; organizationId?: string };
  }>,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  try {
    const item = await createItem({
      title: request.body.title,
      description: request.body.description,
      userId: session.user.id,
      organizationId: request.body.organizationId,
    });

    return reply.status(201).send(item);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'FORBIDDEN_ORGANIZATION_ACCESS') {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'You are not a member of the specified organization.',
          statusCode: 403,
        },
      });
    }
    throw err;
  }
}

export async function removeItem(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  const result = await deleteItem(request.params.id, session.user.id);

  if (result.notFound) {
    return reply.status(404).send({
      error: {
        code: 'RECORD_NOT_FOUND',
        message: 'Item not found.',
        statusCode: 404,
      },
    });
  }

  if (result.forbidden) {
    return reply.status(403).send({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this item.',
        statusCode: 403,
      },
    });
  }

  return reply.send({ success: true });
}
