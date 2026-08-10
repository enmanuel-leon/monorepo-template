import { spinner, log, confirm, isCancel, cancel } from '@clack/prompts';
import { spawnSync } from 'node:child_process';
import { prisma } from '../../src/lib/prisma.js';

export async function runDbDiagnostics(): Promise<void> {
  const s = spinner();
  s.start('Connecting to PostgreSQL database...');

  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    s.stop('Database connection successful!');
    log.info(`Database raw response: ${JSON.stringify(result)}`);
  } catch (error) {
    s.stop('Database connection failed!');
    log.error(`Error connecting to database: ${(error as Error).message}`);
  }
}

export async function runDbPushAndSeed(): Promise<void> {
  const s = spinner();
  s.start('Syncing Prisma schema (non-destructive)...');

  const push = spawnSync(
    'pnpm',
    ['exec', 'prisma', 'db', 'push', '--schema', 'prisma/schema.prisma'],
    {
      stdio: 'pipe',
      encoding: 'utf-8',
    },
  );

  if (push.status !== 0) {
    s.stop('Schema sync failed!');
    log.error(push.stderr || push.stdout || 'Unknown error');
    return;
  }

  s.stop('Schema synced successfully!');

  s.start('Seeding database with default admin user, countries, and timezones...');
  const seed = spawnSync('pnpm', ['exec', 'tsx', 'prisma/seed.ts'], {
    stdio: 'pipe',
    encoding: 'utf-8',
  });

  if (seed.status !== 0) {
    s.stop('Database seed failed!');
    log.error(seed.stderr || seed.stdout || 'Unknown seed error');
    return;
  }

  s.stop('Database seeded successfully!');
}

export async function runDbForceResetAndSeed(): Promise<void> {
  const isConfirmed = await confirm({
    message:
      '⚠️  Are you sure you want to WIPE the entire database and recreate schema? All existing data will be permanently deleted.',
  });

  if (isCancel(isConfirmed) || !isConfirmed) {
    cancel('Database force reset cancelled.');
    return;
  }

  const s = spinner();
  s.start('Wiping database and executing force reset (prisma db push --force-reset)...');

  const push = spawnSync(
    'pnpm',
    ['exec', 'prisma', 'db', 'push', '--force-reset', '--schema', 'prisma/schema.prisma'],
    {
      stdio: 'pipe',
      encoding: 'utf-8',
    },
  );

  if (push.status !== 0) {
    s.stop('Database force reset failed!');
    log.error(push.stderr || push.stdout || 'Unknown reset error');
    return;
  }

  s.stop('Database wiped and schema recreated successfully!');

  s.start('Seeding database with default admin user, countries, timezones, and demo data...');
  const seed = spawnSync('pnpm', ['exec', 'tsx', 'prisma/seed.ts'], {
    stdio: 'pipe',
    encoding: 'utf-8',
  });

  if (seed.status !== 0) {
    s.stop('Database seed failed!');
    log.error(seed.stderr || seed.stdout || 'Unknown seed error');
    return;
  }

  s.stop('Database reset and seed completed successfully!');
}
