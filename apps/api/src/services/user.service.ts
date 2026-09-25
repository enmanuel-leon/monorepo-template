import { prisma } from '../lib/prisma.js';

export interface UpdateUserProfileInput {
  name?: string;
  countryCode?: string;
  timezoneId?: string;
  locale?: string;
  theme?: string;
  hasSeenTour?: boolean;
  hasCompletedOnboarding?: boolean;
}

export async function getUserProfileWithRelations(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      country: true,
      timezone: true,
      members: {
        include: {
          organization: true,
        },
      },
    },
  });
}

export async function updateUserProfile(userId: string, input: Readonly<UpdateUserProfileInput>) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      countryCode: input.countryCode,
      timezoneId: input.timezoneId,
      locale: input.locale,
      theme: input.theme,
      hasSeenTour: input.hasSeenTour,
      hasCompletedOnboarding: input.hasCompletedOnboarding,
    },
    include: {
      country: true,
      timezone: true,
      members: {
        include: {
          organization: true,
        },
      },
    },
  });
}
