import { prisma } from '../lib/prisma.js';

export interface UpdateUserProfileInput {
  name?: string;
  countryCode?: string;
  timezoneId?: string;
}

export async function getUserProfileWithRelations(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      country: true,
      timezone: true,
    },
  });
}

export async function updateUserProfile(userId: string, input: UpdateUserProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      countryCode: input.countryCode,
      timezoneId: input.timezoneId,
    },
    include: {
      country: true,
      timezone: true,
    },
  });
}
