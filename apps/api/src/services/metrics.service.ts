import { prisma } from '../lib/prisma.js';
import { AUTH_ERROR_CODES, INVITATION_STATUS } from '../constants/auth.constants.js';

export interface GetMetricsSummaryParams {
  userId: string;
  organizationId?: string;
}

interface SecurityMetrics {
  passkeyCount: number;
  twoFactorEnabled: boolean;
}

interface ProfileMetrics {
  name: string;
  email: string;
  isComplete: boolean;
}

interface OrganizationMetrics {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  memberCount: number;
  membersCount: number;
  pendingInvitationCount: number;
  pendingInvitationsCount: number;
  userRole: string;
  role: string;
}

interface ItemsMetrics {
  total: number;
  count: number;
  recent: Awaited<ReturnType<typeof prisma.item.findMany>>;
}

export interface MetricsSummaryResult {
  items: ItemsMetrics;
  organization: OrganizationMetrics | null;
  security: SecurityMetrics;
  profile: ProfileMetrics;
}

interface UserProfileSource {
  name?: string | null;
  email?: string | null;
  countryCode?: string | null;
  timezoneId?: string | null;
  twoFactorEnabled?: boolean | null;
}

function buildSecurityMetrics(
  user: Readonly<UserProfileSource> | null,
  passkeyCount: number,
): SecurityMetrics {
  let twoFactorEnabled = false;
  if (user?.twoFactorEnabled) {
    twoFactorEnabled = true;
  }
  return {
    passkeyCount,
    twoFactorEnabled,
  };
}

function buildProfileMetrics(user: Readonly<UserProfileSource> | null): ProfileMetrics {
  let isComplete = false;
  if (user?.countryCode && user?.timezoneId) {
    isComplete = true;
  }

  let name = '';
  if (user?.name) {
    name = user.name;
  }

  let email = '';
  if (user?.email) {
    email = user.email;
  }

  return {
    name,
    email,
    isComplete,
  };
}

function buildOrganizationMetrics(
  org: { id: string; name: string; slug: string | null; logo: string | null } | null,
  organizationId: string,
  memberCount: number,
  pendingInvitationCount: number,
  userRole: string,
): OrganizationMetrics {
  let orgName = '';
  if (org?.name) {
    orgName = org.name;
  }

  let orgSlug: string | null = null;
  if (org?.slug) {
    orgSlug = org.slug;
  }

  let orgLogo: string | null = null;
  if (org?.logo) {
    orgLogo = org.logo;
  }

  return {
    id: organizationId,
    name: orgName,
    slug: orgSlug,
    logo: orgLogo,
    memberCount,
    membersCount: memberCount,
    pendingInvitationCount,
    pendingInvitationsCount: pendingInvitationCount,
    userRole,
    role: userRole,
  };
}

export async function getMetricsSummary(
  params: Readonly<GetMetricsSummaryParams>,
): Promise<MetricsSummaryResult> {
  if (params.organizationId) {
    const membership = await prisma.member.findFirst({
      where: {
        organizationId: params.organizationId,
        userId: params.userId,
      },
    });

    if (!membership) {
      throw new Error(AUTH_ERROR_CODES.FORBIDDEN_ORGANIZATION_ACCESS);
    }

    const [itemCount, recentItems, org, memberCount, pendingInvitationCount, passkeyCount, user] =
      await Promise.all([
        prisma.item.count({
          where: { organizationId: params.organizationId },
        }),
        prisma.item.findMany({
          where: { organizationId: params.organizationId },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.organization.findUnique({
          where: { id: params.organizationId },
        }),
        prisma.member.count({
          where: { organizationId: params.organizationId },
        }),
        prisma.invitation.count({
          where: {
            organizationId: params.organizationId,
            status: INVITATION_STATUS.PENDING,
          },
        }),
        prisma.passkey.count({
          where: { userId: params.userId },
        }),
        prisma.user.findUnique({
          where: { id: params.userId },
        }),
      ]);

    const orgMetrics = buildOrganizationMetrics(
      org,
      params.organizationId,
      memberCount,
      pendingInvitationCount,
      membership.role,
    );
    const security = buildSecurityMetrics(user, passkeyCount);
    const profile = buildProfileMetrics(user);

    return {
      items: {
        total: itemCount,
        count: itemCount,
        recent: recentItems,
      },
      organization: orgMetrics,
      security,
      profile,
    };
  }

  const [itemCount, recentItems, passkeyCount, user] = await Promise.all([
    prisma.item.count({
      where: { userId: params.userId },
    }),
    prisma.item.findMany({
      where: { userId: params.userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.passkey.count({
      where: { userId: params.userId },
    }),
    prisma.user.findUnique({
      where: { id: params.userId },
    }),
  ]);

  const security = buildSecurityMetrics(user, passkeyCount);
  const profile = buildProfileMetrics(user);

  return {
    items: {
      total: itemCount,
      count: itemCount,
      recent: recentItems,
    },
    organization: null,
    security,
    profile,
  };
}
