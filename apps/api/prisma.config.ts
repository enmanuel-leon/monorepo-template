import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile('.env');
} catch {
  // Ignored if file does not exist
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url:
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/app_template_db',
  },
});
