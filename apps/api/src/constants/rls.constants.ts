export const RLS_SESSION_VARS = {
  USER_ID: 'app.current_user_id',
  USER_EMAIL: 'app.current_user_email',
  IS_ADMIN: 'app.is_admin',
  ROLE: 'monorepo_app',
} as const;

export const RLS_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TRANSACTION_FAILED: 'RLS_TRANSACTION_FAILED',
} as const;

export type RlsSessionVar = (typeof RLS_SESSION_VARS)[keyof typeof RLS_SESSION_VARS];
export type RlsErrorCode = (typeof RLS_ERROR_CODES)[keyof typeof RLS_ERROR_CODES];
