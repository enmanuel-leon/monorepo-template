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
  console.log('Seeding reference data...');
  await seedReferenceData();
  console.log('Reference data seed completed successfully.');
}

try {
  await main();
} catch (e) {
  console.error('Seed error:', e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
