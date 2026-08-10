import type { FastifyReply, FastifyRequest } from 'fastify';
import { RESPONSE_STATUS } from '../constants/system.constants.js';

export async function getHealthCheck(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({
    status: RESPONSE_STATUS.OK,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
