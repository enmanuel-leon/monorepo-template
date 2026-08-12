import { z } from 'zod';
import { PASSWORD_POLICY } from '../constants/auth.constants.js';

export const seedAdminEmailSchema = z.email();
export const seedAdminPasswordSchema = z
  .string()
  .min(PASSWORD_POLICY.MIN_LENGTH)
  .max(PASSWORD_POLICY.MAX_LENGTH);
