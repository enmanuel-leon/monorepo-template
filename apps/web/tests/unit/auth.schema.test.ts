import { describe, it, expect } from 'vitest';
import { registrationPasswordSchema } from '../../src/schemas/auth.schema';

describe('Auth Schema Unit Tests', () => {
  it('accepts passwords with valid length between 8 and 128 characters', () => {
    const validResult = registrationPasswordSchema.safeParse('ValidPass123!');
    expect(validResult.success).toBe(true);
  });

  it('rejects passwords shorter than 8 characters', () => {
    const shortResult = registrationPasswordSchema.safeParse('1234567');
    expect(shortResult.success).toBe(false);
  });

  it('rejects passwords longer than 128 characters', () => {
    const tooLong = 'A'.repeat(129);
    const longResult = registrationPasswordSchema.safeParse(tooLong);
    expect(longResult.success).toBe(false);
  });
});
