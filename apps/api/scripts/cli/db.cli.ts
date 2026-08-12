import { spinner, log, confirm, isCancel, cancel, text, password } from '@clack/prompts';
import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import { prisma } from '../../src/lib/prisma.js';
import { getSafeCommandEnvironment, SYSTEM_COMMANDS } from '../../src/config/command.js';
import { SEED_DEFAULTS } from '../../src/constants/seed.constants.js';
import { seedAdminEmailSchema, seedAdminPasswordSchema } from '../../src/schemas/seed.schema.js';

const seedAdminSelectionSchema = z.object({
  email: seedAdminEmailSchema,
  password: seedAdminPasswordSchema.optional(),
});

type SeedAdminSelection = z.infer<typeof seedAdminSelectionSchema>;

async function promptSeedCredentials(): Promise<SeedAdminSelection | null> {
  let defaultEmail: string = SEED_DEFAULTS.ADMIN_EMAIL;
  if (process.env.SEED_ADMIN_EMAIL) {
    defaultEmail = process.env.SEED_ADMIN_EMAIL;
  }

  const email = await text({
    message: 'Enter the seed administrator email:',
    defaultValue: defaultEmail,
    validate: (value) => {
      if (!seedAdminEmailSchema.safeParse(value).success) {
        return 'Please enter a valid email address.';
      }
    },
  });

  if (isCancel(email)) {
    cancel('Seed credentials prompt cancelled.');
    return null;
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingAdmin) {
    log.info(`Seed administrator ${email} already exists. Password input skipped.`);
    return { email };
  }

  const adminPassword = await password({
    message: 'Enter the seed administrator password:',
    mask: '*',
    clearOnError: true,
    validate: (value) => {
      if (!seedAdminPasswordSchema.safeParse(value).success) {
        return 'The password must contain between 8 and 128 characters.';
      }
    },
  });

  if (isCancel(adminPassword)) {
    cancel('Seed credentials prompt cancelled.');
    return null;
  }

  const credentials = seedAdminSelectionSchema.safeParse({
    email,
    password: adminPassword,
  });
  if (!credentials.success) {
    log.error('Invalid seed administrator credentials.');
    return null;
  }

  return credentials.data;
}

function buildSeedEnvironment(credentials: SeedAdminSelection): NodeJS.ProcessEnv {
  const seedEnvironment: NodeJS.ProcessEnv = {
    SEED_ADMIN_EMAIL: credentials.email,
  };
  if (credentials.password) {
    seedEnvironment.SEED_ADMIN_PASSWORD = credentials.password;
  }
  return getSafeCommandEnvironment(seedEnvironment);
}

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
    SYSTEM_COMMANDS.NODE,
    [
      SYSTEM_COMMANDS.PNPM_SCRIPT,
      'exec',
      'prisma',
      'db',
      'push',
      '--schema',
      'prisma/schema.prisma',
    ],
    {
      stdio: 'pipe',
      encoding: 'utf-8',
      env: getSafeCommandEnvironment(),
    },
  );

  if (push.status !== 0) {
    s.stop('Schema sync failed!');
    log.error(push.stderr || push.stdout || 'Unknown error');
    return;
  }

  s.stop('Schema synced successfully!');

  const credentials = await promptSeedCredentials();
  if (!credentials) {
    return;
  }

  s.start('Seeding database with default admin user, countries, and timezones...');
  const seed = spawnSync(
    SYSTEM_COMMANDS.NODE,
    [SYSTEM_COMMANDS.PNPM_SCRIPT, 'exec', 'tsx', 'prisma/seed.ts'],
    {
      stdio: 'pipe',
      encoding: 'utf-8',
      env: buildSeedEnvironment(credentials),
    },
  );

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
    SYSTEM_COMMANDS.NODE,
    [
      SYSTEM_COMMANDS.PNPM_SCRIPT,
      'exec',
      'prisma',
      'db',
      'push',
      '--force-reset',
      '--schema',
      'prisma/schema.prisma',
    ],
    {
      stdio: 'pipe',
      encoding: 'utf-8',
      env: getSafeCommandEnvironment(),
    },
  );

  if (push.status !== 0) {
    s.stop('Database force reset failed!');
    log.error(push.stderr || push.stdout || 'Unknown reset error');
    return;
  }

  s.stop('Database wiped and schema recreated successfully!');

  const credentials = await promptSeedCredentials();
  if (!credentials) {
    return;
  }

  s.start('Seeding database with default admin user, countries, timezones, and demo data...');
  const seed = spawnSync(
    SYSTEM_COMMANDS.NODE,
    [SYSTEM_COMMANDS.PNPM_SCRIPT, 'exec', 'tsx', 'prisma/seed.ts'],
    {
      stdio: 'pipe',
      encoding: 'utf-8',
      env: buildSeedEnvironment(credentials),
    },
  );

  if (seed.status !== 0) {
    s.stop('Database seed failed!');
    log.error(seed.stderr || seed.stdout || 'Unknown seed error');
    return;
  }

  s.stop('Database reset and seed completed successfully!');
}
