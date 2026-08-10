import { spinner, log, confirm, isCancel, cancel } from '@clack/prompts';
import { Redis } from 'ioredis';
import { getRedisClient } from '../../src/lib/redis.js';

function getClient(): Redis {
  const existing = getRedisClient();
  if (existing) {
    return existing;
  }
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  return new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
}

export async function runRedisDiagnostics(): Promise<void> {
  const s = spinner();
  s.start('Connecting to Redis...');

  try {
    const client = getClient();
    if (client.status === 'wait') {
      await client.connect();
    }
    const response = await client.ping();
    s.stop('Redis ping response received!');
    log.info(`Redis PING response: ${response}`);
  } catch (error) {
    s.stop('Redis connection failed!');
    log.error(`Redis error: ${(error as Error).message}`);
  }
}

export async function runRedisFlush(): Promise<void> {
  const isConfirmed = await confirm({
    message: '⚠️  Are you sure you want to FLUSH all Redis database keys?',
  });

  if (isCancel(isConfirmed) || !isConfirmed) {
    cancel('Redis flush cancelled.');
    return;
  }

  const s = spinner();
  s.start('Flushing Redis keys...');

  try {
    const client = getClient();
    if (client.status === 'wait') {
      await client.connect();
    }
    await client.flushdb();
    s.stop('Redis keys flushed successfully!');
  } catch (error) {
    s.stop('Redis flush failed!');
    log.error(`Redis flush error: ${(error as Error).message}`);
  }
}
