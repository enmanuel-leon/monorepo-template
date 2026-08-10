import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let redisClient: Redis | null = null;

if (env.REDIS_URL) {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  redisClient.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });
}

export function getRedisClient(): Redis | null {
  return redisClient;
}
