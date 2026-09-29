import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { authClient } from '../../lib/auth-client';
import { apiFetch } from '../../lib/api-client';

export interface RecentItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  createdAt: string;
}

export interface MetricsSummary {
  items: {
    total: number;
    recent: RecentItem[];
  };
  organization: {
    id: string;
    name: string;
    role: string | null;
    memberCount: number;
    pendingInvitationsCount: number;
  } | null;
  security: {
    passkeysCount: number;
    twoFactorEnabled: boolean;
  };
  profile: {
    name: string;
    email: string;
    isComplete: boolean;
  };
}

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

  const metricsQuery = useQuery<{ metrics: MetricsSummary }>({
    queryKey: ['home-metrics', organization?.id],
    queryFn: async () => {
      let path = '/api/v1/metrics/summary';
      if (organization?.id) {
        path = `/api/v1/metrics/summary?organizationId=${encodeURIComponent(organization.id)}`;
      }
      return apiFetch<{ metrics: MetricsSummary }>(path);
    },
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  return {
    user: session.data?.user,
    organization,
    metrics: metricsQuery.data?.metrics ?? null,
    isLoading: metricsQuery.isLoading,
    isRefetching: metricsQuery.isRefetching,
    handleRefresh: () => metricsQuery.refetch(),
  };
}
