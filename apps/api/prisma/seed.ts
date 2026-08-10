import { auth } from '../src/lib/auth.js';
import { prisma } from '../src/lib/prisma.js';

interface CountrySeed {
  code: string;
  iso3: string;
  name: string;
  flag: string;
  ianaName: string;
  displayName: string;
  gmtOffset: string;
}

const COUNTRY_DATA: CountrySeed[] = [
  {
    code: 'MX',
    iso3: 'MEX',
    name: 'Mexico',
    flag: '🇲🇽',
    ianaName: 'America/Mexico_City',
    displayName: 'Mexico City (GMT-06:00)',
    gmtOffset: 'GMT-06:00',
  },
  {
    code: 'US',
    iso3: 'USA',
    name: 'United States',
    flag: '🇺🇸',
    ianaName: 'America/New_York',
    displayName: 'New York (GMT-05:00)',
    gmtOffset: 'GMT-05:00',
  },
  {
    code: 'ES',
    iso3: 'ESP',
    name: 'Spain',
    flag: '🇪🇸',
    ianaName: 'Europe/Madrid',
    displayName: 'Madrid (GMT+01:00)',
    gmtOffset: 'GMT+01:00',
  },
  {
    code: 'CO',
    iso3: 'COL',
    name: 'Colombia',
    flag: '🇨🇴',
    ianaName: 'America/Bogota',
    displayName: 'Bogota (GMT-05:00)',
    gmtOffset: 'GMT-05:00',
  },
  {
    code: 'AR',
    iso3: 'ARG',
    name: 'Argentina',
    flag: '🇦🇷',
    ianaName: 'America/Buenos_Aires',
    displayName: 'Buenos Aires (GMT-03:00)',
    gmtOffset: 'GMT-03:00',
  },
  {
    code: 'CL',
    iso3: 'CHL',
    name: 'Chile',
    flag: '🇨🇱',
    ianaName: 'America/Santiago',
    displayName: 'Santiago (GMT-03:00)',
    gmtOffset: 'GMT-03:00',
  },
  {
    code: 'PE',
    iso3: 'PER',
    name: 'Peru',
    flag: '🇵🇪',
    ianaName: 'America/Lima',
    displayName: 'Lima (GMT-05:00)',
    gmtOffset: 'GMT-05:00',
  },
  {
    code: 'EC',
    iso3: 'ECU',
    name: 'Ecuador',
    flag: '🇪🇨',
    ianaName: 'America/Guayaquil',
    displayName: 'Guayaquil (GMT-05:00)',
    gmtOffset: 'GMT-05:00',
  },
  {
    code: 'VE',
    iso3: 'VEN',
    name: 'Venezuela',
    flag: '🇻🇪',
    ianaName: 'America/Caracas',
    displayName: 'Caracas (GMT-04:00)',
    gmtOffset: 'GMT-04:00',
  },
  {
    code: 'BR',
    iso3: 'BRA',
    name: 'Brazil',
    flag: '🇧🇷',
    ianaName: 'America/Sao_Paulo',
    displayName: 'Sao Paulo (GMT-03:00)',
    gmtOffset: 'GMT-03:00',
  },
  {
    code: 'GB',
    iso3: 'GBR',
    name: 'United Kingdom',
    flag: '🇬🇧',
    ianaName: 'Europe/London',
    displayName: 'London (GMT+00:00)',
    gmtOffset: 'GMT+00:00',
  },
  {
    code: 'DE',
    iso3: 'DEU',
    name: 'Germany',
    flag: '🇩🇪',
    ianaName: 'Europe/Berlin',
    displayName: 'Berlin (GMT+01:00)',
    gmtOffset: 'GMT+01:00',
  },
  {
    code: 'FR',
    iso3: 'FRA',
    name: 'France',
    flag: '🇫🇷',
    ianaName: 'Europe/Paris',
    displayName: 'Paris (GMT+01:00)',
    gmtOffset: 'GMT+01:00',
  },
];

async function seedReferenceData() {
  console.log('Seeding countries and timezones...');
  for (const item of COUNTRY_DATA) {
    const country = await prisma.country.upsert({
      where: { code: item.code },
      update: { name: item.name, iso3: item.iso3, flag: item.flag },
      create: { code: item.code, iso3: item.iso3, name: item.name, flag: item.flag },
    });

    await prisma.timezone.upsert({
      where: { ianaName: item.ianaName },
      update: {
        displayName: item.displayName,
        gmtOffset: item.gmtOffset,
        countryCode: country.code,
      },
      create: {
        ianaName: item.ianaName,
        displayName: item.displayName,
        gmtOffset: item.gmtOffset,
        countryCode: country.code,
      },
    });
  }
}

async function main() {
  console.log('Seeding initial data...');
  await seedReferenceData();

  const defaultMxTz = await prisma.timezone.findUnique({
    where: { ianaName: 'America/Mexico_City' },
  });

  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  });

  if (!existingAdmin) {
    const res = await auth.api.signUpEmail({
      body: {
        email: 'admin@example.com',
        password: 'AdminPassword123!',
        name: 'Admin User',
      },
    });

    if (res && res.user) {
      const adminId = res.user.id;

      await prisma.user.update({
        where: { id: adminId },
        data: {
          emailVerified: true,
          role: 'admin',
          countryCode: 'MX',
          timezoneId: defaultMxTz?.id,
        },
      });

      const defaultOrg = await prisma.organization.create({
        data: {
          name: 'Default Organization',
          slug: 'default-org',
          members: {
            create: {
              userId: adminId,
              role: 'owner',
            },
          },
        },
      });

      await prisma.item.create({
        data: {
          title: 'Welcome Sample Item',
          description: 'This is a sample item created by the seed script.',
          userId: adminId,
          organizationId: defaultOrg.id,
        },
      });
    }

    console.log('Seed completed successfully. Admin created: admin@example.com');
  } else {
    console.log('Admin user already exists.');
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
