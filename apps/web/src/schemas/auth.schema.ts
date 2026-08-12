import { z } from 'zod';

export const registrationPasswordSchema = z.string().min(8).max(128);
