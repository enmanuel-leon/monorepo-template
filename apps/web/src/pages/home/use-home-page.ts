import { authClient } from '../../lib/auth-client';

export function useHomePage() {
  const session = authClient.useSession();
  const activeOrg = authClient.useActiveOrganization();

  return {
    user: session.data?.user,
    organization: activeOrg.data,
  };
}
