import { realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SYSTEM_PATH_DIRECTORIES = [
  '/usr/local/sbin',
  '/usr/local/bin',
  '/usr/sbin',
  '/usr/bin',
  '/sbin',
  '/bin',
];

const SAFE_LINUX_PATH = Array.from(
  new Set([...SYSTEM_PATH_DIRECTORIES, dirname(process.execPath)]),
).join(':');

export const SYSTEM_COMMANDS = {
  NODE: process.execPath,
  PNPM_SCRIPT: realpathSync(join(dirname(process.execPath), 'pnpm')),
  DOCKER: '/usr/bin/docker',
} as const;

export function getSafeCommandEnvironment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...overrides,
    PATH: SAFE_LINUX_PATH,
  };
}
