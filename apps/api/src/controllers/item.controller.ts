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

  const item = await createItem({
    title: request.body.title,
    description: request.body.description,
    userId: session.user.id,
    organizationId: request.body.organizationId,
  });

  return reply.status(201).send(item);
}

export async function removeItem(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  await deleteItem(request.params.id, session.user.id);
  return reply.send({ success: true });
}
