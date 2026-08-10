import type { FastifyInstance } from 'fastify';
import { getCurrentUser, updateUser } from '../../controllers/user.controller.js';
import { userSchema } from '../../schemas/user.schema.js';

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/me', { schema: userSchema }, getCurrentUser);
  fastify.patch('/me', updateUser);
}
