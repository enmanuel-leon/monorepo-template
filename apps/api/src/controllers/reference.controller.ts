import type { FastifyReply, FastifyRequest } from 'fastify';
import { listCountriesFromDb, listTimezonesFromDb } from '../services/reference.service.js';

export async function listTimezones(
  request: FastifyRequest<{ Querystring: { countryCode?: string } }>,
  reply: FastifyReply,
) {
  const timezones = await listTimezonesFromDb(request.query.countryCode);
  return reply.send({ timezones });
}

export async function listCountries(_request: FastifyRequest, reply: FastifyReply) {
  const countries = await listCountriesFromDb();
  return reply.send({ countries });
}
