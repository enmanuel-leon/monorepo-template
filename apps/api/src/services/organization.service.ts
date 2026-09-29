import { prisma } from '../lib/prisma.js';
import {
  MEMBER_ROLES,
  AUTH_ERROR_CODES,
  INVITATION_STATUS_FILTERS,
} from '../constants/auth.constants.js';

export async function listUserOrganizations(userId: string) {
  return prisma.organization.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });
}

export async function createOrganizationForUser(userId: string, name: string, slug?: string) {
  return prisma.organization.create({
    data: {
      name,
      slug,
      members: {
        create: {
          userId,
          role: MEMBER_ROLES.OWNER,
        },
      },
    },
  });
}

export interface ListOrganizationInvitationsParams {
  organizationId: string;
  userId: string;
  page?: number;
  pageSize?: number;
  status?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListOrganizationInvitationsResult {
  data: Array<{
    id: string;
    organizationId: string;
    email: string;
    role: string | null;
    status: string;
    expiresAt: Date;
    inviterId: string;
    createdAt: Date;
    user?: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export async function listOrganizationInvitations(
  params: Readonly<ListOrganizationInvitationsParams>,
): Promise<ListOrganizationInvitationsResult> {
  const member = await prisma.member.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      role: { in: [MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN] },
    },
  });

  if (!member) {
    throw new Error(AUTH_ERROR_CODES.FORBIDDEN_ADMIN_ACCESS);
  }

  let page = 1;
  if (params.page !== undefined && params.page > 0) {
    page = params.page;
  }

  let pageSize = 10;
  if (params.pageSize !== undefined && params.pageSize > 0) {
    pageSize = Math.min(params.pageSize, 50);
  }

  let sortOrder: 'asc' | 'desc' = 'desc';
  if (params.sortOrder === 'asc' || params.sortOrder === 'desc') {
    sortOrder = params.sortOrder;
  }

  interface InvitationWhere {
    organizationId: string;
    status?: string;
  }

  const where: InvitationWhere = {
    organizationId: params.organizationId,
  };

  if (params.status && params.status !== INVITATION_STATUS_FILTERS.ALL) {
    where.status = params.status;
  }

  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma.invitation.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        createdAt: sortOrder,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.invitation.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
    },
  };
}
