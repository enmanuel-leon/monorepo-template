import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignoreBinaries: ['scripts/check-secrets.sh', 'scripts/kill-ports.sh', 'sonar-scanner'],
  workspaces: {
    'apps/api': {
      entry: [
        'src/services/storage/storage.service.ts',
        'src/services/email/email.service.ts',
        'src/lib/redis.ts',
        'src/constants/**/*.ts',
      ],
      project: ['src/**/*.ts'],
      ignoreDependencies: ['@fastify/rate-limit', '@simplewebauthn/server', 'pino-pretty'],
    },
    'apps/web': {
      entry: [
        'src/components/ui/country-flag.tsx',
        'src/hooks/use-copy-to-clipboard.ts',
        'src/constants/**/*.ts',
      ],
      project: ['src/**/*.{ts,tsx}'],
      ignoreDependencies: ['@tanstack/react-table', 'class-variance-authority', 'tailwindcss'],
    },
  },
};

export default config;
