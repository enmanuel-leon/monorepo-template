import { prisma } from '../lib/prisma.js';
import { MEMBER_ROLES } from '../constants/auth.constants.js';

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
