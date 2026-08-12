import { z } from 'zod';
import { NODE_ENVIRONMENTS } from '../constants/system.constants.js';
import { STORAGE_PROVIDERS } from '../constants/storage.constants.js';

function loadEnvFileWithoutOverridingProcessEnv(): void {
  const processEnv = Object.fromEntries(Object.entries(process.env));

  try {
    process.loadEnvFile('.env');
  } catch {
    try {
      process.loadEnvFile('apps/api/.env');
    } catch {
      // Ignored when no environment file exists
    }
  }

  for (const [key, value] of Object.entries(processEnv)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFileWithoutOverridingProcessEnv();

const envSchema = z.object({
  NODE_ENV: z
    .enum([NODE_ENVIRONMENTS.DEVELOPMENT, NODE_ENVIRONMENTS.PRODUCTION, NODE_ENVIRONMENTS.TEST])
    .default(NODE_ENVIRONMENTS.DEVELOPMENT),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((val) => val.split(',').map((origin) => origin.trim())),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url().default('http://localhost:3000'),
  STORAGE_PROVIDER: z
    .enum([STORAGE_PROVIDERS.LOCAL, STORAGE_PROVIDERS.S3, STORAGE_PROVIDERS.GCS])
    .default(STORAGE_PROVIDERS.LOCAL),
  STORAGE_BUCKET: z.string().default('local-bucket'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  EMAIL_ENABLED: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .default(false),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export const env = envSchema.parse(process.env);
