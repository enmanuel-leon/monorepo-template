import { spawnSync } from 'node:child_process';
import { Client } from 'pg';
import { getSafeCommandEnvironment, SYSTEM_COMMANDS } from '../../src/config/command.js';

const TEST_DB_NAME = 'app_template_test_db';
const ADMIN_CONNECTION_STRING = 'postgresql://postgres:postgres@localhost:5432/postgres';
const TEST_CONNECTION_STRING = `postgresql://postgres:postgres@localhost:5432/${TEST_DB_NAME}?schema=public`;

async function ensureTestDatabase(): Promise<void> {
  const client = new Client({ connectionString: ADMIN_CONNECTION_STRING });
  try {
    await client.connect();
    const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      TEST_DB_NAME,
    ]);
    if (result.rowCount === 0) {
      console.log(`Creating test database: ${TEST_DB_NAME}`);
      await client.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      console.log(`Test database created: ${TEST_DB_NAME}`);
    }
  } finally {
    await client.end();
  }
}

function pushSchema(): void {
  console.log('Pushing Prisma schema to test database...');
  const result = spawnSync(
    SYSTEM_COMMANDS.PNPM,
    [
      'exec',
      'prisma',
      'db',
      'push',
      '--schema',
      'prisma/schema.prisma',
      '--url',
      TEST_CONNECTION_STRING,
      '--accept-data-loss',
    ],
    {
      stdio: 'pipe',
      encoding: 'utf-8',
      env: getSafeCommandEnvironment(),
    },
  );

  if (result.status !== 0) {
    let errorOutput = 'Unknown error while pushing schema';
    if (result.stderr) {
      errorOutput = result.stderr;
    } else if (result.stdout) {
      errorOutput = result.stdout;
    }
    throw new Error(`Failed to push Prisma schema: ${errorOutput}`);
  }

  console.log('Schema pushed successfully.');
}

export async function setup(): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = TEST_CONNECTION_STRING;
  process.env.BETTER_AUTH_SECRET = 'test-super-secret-key-32-chars-min-length';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';

  await ensureTestDatabase();
  pushSchema();
}
