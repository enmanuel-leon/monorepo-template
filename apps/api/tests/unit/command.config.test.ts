import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dirname, join } from 'node:path';
import { SYSTEM_COMMANDS, getSafeCommandEnvironment } from '../../src/config/command.js';

describe('Command Configuration Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('SYSTEM_COMMANDS contains valid node and pnpm commands', () => {
    expect(SYSTEM_COMMANDS.NODE).toBeDefined();
    expect(typeof SYSTEM_COMMANDS.NODE).toBe('string');
    expect(SYSTEM_COMMANDS.NODE.length).toBeGreaterThan(0);

    expect(SYSTEM_COMMANDS.PNPM).toBeDefined();
    expect(typeof SYSTEM_COMMANDS.PNPM).toBe('string');
    expect(SYSTEM_COMMANDS.PNPM.length).toBeGreaterThan(0);

    expect(SYSTEM_COMMANDS.PNPM_SCRIPT).toBe(SYSTEM_COMMANDS.PNPM);
    expect(SYSTEM_COMMANDS.DOCKER).toBe('/usr/bin/docker');
  });

  it('getSafeCommandEnvironment merges safe PATH and custom environment variables', () => {
    const customEnv = getSafeCommandEnvironment({
      CUSTOM_VARIABLE: 'test-value-123',
    });

    expect(customEnv.CUSTOM_VARIABLE).toBe('test-value-123');
    expect(customEnv.PATH).toBeDefined();
    expect(typeof customEnv.PATH).toBe('string');
    expect(customEnv.PATH?.length).toBeGreaterThan(0);
    expect(customEnv.PATH).toContain('/usr/bin');
    expect(customEnv.PATH).toContain('/bin');
  });

  it('getSafeCommandEnvironment works without arguments', () => {
    const envWithoutArgs = getSafeCommandEnvironment();
    expect(envWithoutArgs.PATH).toBeDefined();
    expect(envWithoutArgs.PATH).toContain('/usr/bin');
  });

  it('resolves PNPM from custom process.env.PNPM_PATH when valid', async () => {
    vi.resetModules();
    const originalPnpmPath = process.env.PNPM_PATH;
    process.env.PNPM_PATH = '/custom/bin/pnpm';

    vi.doMock('node:fs', () => {
      return {
        existsSync: vi.fn((path: string) => {
          if (path === '/custom/bin/pnpm') {
            return true;
          }
          return false;
        }),
        realpathSync: vi.fn((path: string) => {
          if (path === '/custom/bin/pnpm') {
            return '/real/custom/bin/pnpm';
          }
          return path;
        }),
      };
    });

    const modulePath = '../../src/config/command.js?test=custom-pnpm-valid';
    const { SYSTEM_COMMANDS: isolatedCommands } = (await import(
      modulePath
    )) as typeof import('../../src/config/command.js');
    expect(isolatedCommands.PNPM).toBe('/real/custom/bin/pnpm');

    if (originalPnpmPath) {
      process.env.PNPM_PATH = originalPnpmPath;
    } else {
      delete process.env.PNPM_PATH;
    }
  });

  it('handles realpathSync throwing by falling back to candidate path', async () => {
    vi.resetModules();
    const originalPnpmPath = process.env.PNPM_PATH;
    process.env.PNPM_PATH = '/custom/unresolvable/pnpm';

    vi.doMock('node:fs', () => {
      return {
        existsSync: vi.fn((path: string) => {
          if (path === '/custom/unresolvable/pnpm') {
            return true;
          }
          return false;
        }),
        realpathSync: vi.fn(() => {
          throw new Error('EACCES permission denied');
        }),
      };
    });

    const modulePath = '../../src/config/command.js?test=realpath-throws';
    const { SYSTEM_COMMANDS: isolatedCommands } = (await import(
      modulePath
    )) as typeof import('../../src/config/command.js');
    expect(isolatedCommands.PNPM).toBe('/custom/unresolvable/pnpm');

    if (originalPnpmPath) {
      process.env.PNPM_PATH = originalPnpmPath;
    } else {
      delete process.env.PNPM_PATH;
    }
  });

  it('resolves PNPM from PATH directories via findBinaryInPath', async () => {
    vi.resetModules();
    const originalPnpmPath = process.env.PNPM_PATH;
    const originalPath = process.env.PATH;
    delete process.env.PNPM_PATH;
    process.env.PATH = '/custom/tools::/usr/bin';

    const nodeSibling = join(dirname(process.execPath), 'pnpm');
    const expectedBinaryPath = '/custom/tools/pnpm';

    vi.doMock('node:fs', () => {
      return {
        existsSync: vi.fn((path: string) => {
          if (path === nodeSibling) {
            return false;
          }
          if (path === expectedBinaryPath) {
            return true;
          }
          return false;
        }),
        realpathSync: vi.fn((path: string) => {
          return path;
        }),
      };
    });

    const modulePath = '../../src/config/command.js?test=find-in-path';
    const { SYSTEM_COMMANDS: isolatedCommands } = (await import(
      modulePath
    )) as typeof import('../../src/config/command.js');
    expect(isolatedCommands.PNPM).toBe(expectedBinaryPath);

    if (originalPnpmPath) {
      process.env.PNPM_PATH = originalPnpmPath;
    }
    if (originalPath) {
      process.env.PATH = originalPath;
    }
  });

  it('resolves PNPM from HOME common locations when not found in PATH or sibling', async () => {
    vi.resetModules();
    const originalPnpmPath = process.env.PNPM_PATH;
    const originalHome = process.env.HOME;
    const originalPath = process.env.PATH;
    delete process.env.PNPM_PATH;
    process.env.PATH = '';
    process.env.HOME = '/home/mockuser';

    const pnpmHomeBin = join('/home/mockuser', '.local/share/pnpm/bin/pnpm');

    vi.doMock('node:fs', () => {
      return {
        existsSync: vi.fn((path: string) => {
          if (path === pnpmHomeBin) {
            return true;
          }
          return false;
        }),
        realpathSync: vi.fn((path: string) => {
          return path;
        }),
      };
    });

    const modulePath = '../../src/config/command.js?test=home-location';
    const { SYSTEM_COMMANDS: isolatedCommands } = (await import(
      modulePath
    )) as typeof import('../../src/config/command.js');
    expect(isolatedCommands.PNPM).toBe(pnpmHomeBin);

    if (originalPnpmPath) {
      process.env.PNPM_PATH = originalPnpmPath;
    }
    if (originalHome) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }
    if (originalPath) {
      process.env.PATH = originalPath;
    }
  });

  it('skips invalid PNPM_PATH and non-matching PATH dirs before resolving', async () => {
    vi.resetModules();
    const originalPnpmPath = process.env.PNPM_PATH;
    const originalPath = process.env.PATH;
    process.env.PNPM_PATH = '/nonexistent/pnpm';
    process.env.PATH = '/empty-dir:/found-dir';

    const nodeSibling = join(dirname(process.execPath), 'pnpm');
    const expectedBinaryPath = '/found-dir/pnpm';

    vi.doMock('node:fs', () => {
      return {
        existsSync: vi.fn((path: string) => {
          if (path === '/nonexistent/pnpm') {
            return false;
          }
          if (path === nodeSibling) {
            return false;
          }
          if (path === '/empty-dir/pnpm') {
            return false;
          }
          if (path === expectedBinaryPath) {
            return true;
          }
          return false;
        }),
        realpathSync: vi.fn((path: string) => path),
      };
    });

    const modulePath = '../../src/config/command.js?test=skip-invalid-pnpm-and-path';
    const { SYSTEM_COMMANDS: isolatedCommands } = (await import(
      modulePath
    )) as typeof import('../../src/config/command.js');
    expect(isolatedCommands.PNPM).toBe(expectedBinaryPath);

    if (originalPnpmPath) {
      process.env.PNPM_PATH = originalPnpmPath;
    } else {
      delete process.env.PNPM_PATH;
    }
    if (originalPath) {
      process.env.PATH = originalPath;
    }
  });

  it('falls back to raw pnpm string when all candidate resolutions return null', async () => {
    vi.resetModules();
    const originalPnpmPath = process.env.PNPM_PATH;
    const originalHome = process.env.HOME;
    const originalPath = process.env.PATH;

    delete process.env.PNPM_PATH;
    delete process.env.HOME;
    delete process.env.PATH;

    vi.doMock('node:fs', () => {
      return {
        existsSync: vi.fn(() => false),
        realpathSync: vi.fn((path: string) => path),
      };
    });

    const modulePath = '../../src/config/command.js?test=fallback-pnpm';
    const { SYSTEM_COMMANDS: isolatedCommands } = (await import(
      modulePath
    )) as typeof import('../../src/config/command.js');
    expect(isolatedCommands.PNPM).toBe('pnpm');

    if (originalPnpmPath) {
      process.env.PNPM_PATH = originalPnpmPath;
    }
    if (originalHome) {
      process.env.HOME = originalHome;
    }
    if (originalPath) {
      process.env.PATH = originalPath;
    }
  });
});
