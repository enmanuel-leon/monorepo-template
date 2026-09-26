import { describe, it, expect } from 'vitest';
import { SYSTEM_COMMANDS, getSafeCommandEnvironment } from '../../src/config/command.js';

describe('Command Configuration Unit Tests', () => {
  it('SYSTEM_COMMANDS contains valid node and pnpm commands', () => {
    expect(SYSTEM_COMMANDS.NODE).toBeDefined();
    expect(typeof SYSTEM_COMMANDS.NODE).toBe('string');
    expect(SYSTEM_COMMANDS.NODE.length).toBeGreaterThan(0);

    expect(SYSTEM_COMMANDS.PNPM).toBeDefined();
    expect(typeof SYSTEM_COMMANDS.PNPM).toBe('string');
    expect(SYSTEM_COMMANDS.PNPM.length).toBeGreaterThan(0);
  });

  it('getSafeCommandEnvironment merges safe PATH and custom environment variables', () => {
    const customEnv = getSafeCommandEnvironment({
      CUSTOM_VARIABLE: 'test-value-123',
    });

    expect(customEnv.CUSTOM_VARIABLE).toBe('test-value-123');
    expect(customEnv.PATH).toBeDefined();
    expect(typeof customEnv.PATH).toBe('string');
    expect(customEnv.PATH?.length).toBeGreaterThan(0);
  });
});
