import { prisma } from '../lib/prisma.js';

export async function listCountriesFromDb() {
  return prisma.country.findMany({
    include: {
      timezones: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

export async function listTimezonesFromDb(countryCode?: string) {
  if (countryCode) {
    return prisma.timezone.findMany({
      where: { countryCode },
      include: {
        country: true,
      },
      orderBy: {
        displayName: 'asc',
      },
    });
  }

  return prisma.timezone.findMany({
    include: {
      country: true,
    },
    orderBy: {
      displayName: 'asc',
    },
  });
}
