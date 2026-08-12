import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/setup/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        'postgresql://postgres:postgres@localhost:5432/app_template_test_db?schema=public',
      BETTER_AUTH_SECRET: 'test-super-secret-key-32-chars-min-length',
      BETTER_AUTH_URL: 'http://localhost:3000',
      EMAIL_ENABLED: 'false',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/tests/**',
        'prisma/**',
        'src/server.ts',
        'src/config/**',
        'src/constants/**',
      ],
    },
  },
});
