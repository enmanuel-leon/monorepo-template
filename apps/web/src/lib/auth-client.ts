import { createAuthClient } from 'better-auth/react';
import { organizationClient, adminClient, emailOTPClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || '',
  basePath: '/api/v1/auth',
  plugins: [organizationClient(), passkeyClient(), adminClient(), emailOTPClient()],
});
