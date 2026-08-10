import type { FastifyInstance } from 'fastify';
import { getItems, postItem, removeItem } from '../../controllers/item.controller.js';
import { listItemSchema, createItemSchema } from '../../schemas/item.schema.js';

export async function itemRoutes(fastify: FastifyInstance) {
  fastify.get('/items', { schema: listItemSchema }, getItems);
  fastify.post('/items', { schema: createItemSchema }, postItem);
  fastify.delete('/items/:id', removeItem);
}
