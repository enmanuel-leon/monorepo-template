import { authClient } from '../../lib/auth-client';

interface OrgSummary {
  id: string;
  name: string;
  slug?: string | null;
  logo?: string | null;
}

export function useHomePage() {
  const session = authClient.useSession();
  const activeOrg = authClient.useActiveOrganization();
  const userOrgs = authClient.useListOrganizations();

  let organization: OrgSummary | null = null;
  if (activeOrg.data) {
    organization = activeOrg.data;
  } else if (userOrgs.data && userOrgs.data.length > 0) {
    organization = userOrgs.data[0];
  }

  return {
    user: session.data?.user,
    organization,
  };
}
