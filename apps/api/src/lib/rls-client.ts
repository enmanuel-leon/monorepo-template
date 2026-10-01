import type { PrismaClient } from '@prisma/client';
import { prisma } from './prisma.js';
import { RLS_SESSION_VARS } from '../constants/rls.constants.js';

export interface RlsContext {
  userId?: string | null;
  email?: string | null;
  isAdmin?: boolean;
}

export type RlsTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function withRLS<T>(
  context: Readonly<RlsContext>,
  action: (tx: RlsTransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    try {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${RLS_SESSION_VARS.ROLE};`);
    } catch {
      // In development/test environments where monorepo_app role is not yet created,
      // fallback without failing transaction.
    }

    if (context.userId) {
      await tx.$executeRawUnsafe(
        `SELECT set_config('${RLS_SESSION_VARS.USER_ID}', $1, true);`,
        context.userId,
      );
    } else {
      await tx.$executeRawUnsafe(`SELECT set_config('${RLS_SESSION_VARS.USER_ID}', '', true);`);
    }

    if (context.email) {
      await tx.$executeRawUnsafe(
        `SELECT set_config('${RLS_SESSION_VARS.USER_EMAIL}', $1, true);`,
        context.email,
      );
    } else {
      await tx.$executeRawUnsafe(`SELECT set_config('${RLS_SESSION_VARS.USER_EMAIL}', '', true);`);
    }

    if (context.isAdmin) {
      await tx.$executeRawUnsafe(
        `SELECT set_config('${RLS_SESSION_VARS.IS_ADMIN}', 'true', true);`,
      );
    } else {
      await tx.$executeRawUnsafe(
        `SELECT set_config('${RLS_SESSION_VARS.IS_ADMIN}', 'false', true);`,
      );
    }

    return action(tx as unknown as RlsTransactionClient);
  });
}
