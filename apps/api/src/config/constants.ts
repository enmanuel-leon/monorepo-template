export const APP_NAME = 'Monorepo App Template';
export const API_VERSION = 'v1';
export const AUTH_BASE_PATH = '/api/v1/auth';

export const AUTH_POLICIES = {
  ALLOW_ANONYMOUS_REGISTER: true,
  TWO_FACTOR_ENABLED: false,
  PASSKEY_ENABLED: true,
  ADMIN_PLUGIN_ENABLED: true,
} as const;
