import { auth } from '../src/lib/auth.js';
import { prisma } from '../src/lib/prisma.js';
import { SEED_DEFAULTS } from '../src/constants/seed.constants.js';
import { seedAdminEmailSchema, seedAdminPasswordSchema } from '../src/schemas/seed.schema.js';

function getSeedAdminEmail(): string {
  const configuredEmail = process.env.SEED_ADMIN_EMAIL || SEED_DEFAULTS.ADMIN_EMAIL;
  const result = seedAdminEmailSchema.safeParse(configuredEmail);
  if (!result.success) {
    throw new Error('SEED_ADMIN_EMAIL must contain a valid email address.');
  }
  return result.data;
}

function getSeedAdminPassword(): string {
  const result = seedAdminPasswordSchema.safeParse(process.env.SEED_ADMIN_PASSWORD);
  if (!result.success) {
    throw new Error('SEED_ADMIN_PASSWORD must be provided to create an admin.');
  }
  return result.data;
}

async function main(): Promise<void> {
  const seedAdminEmail = getSeedAdminEmail();
  const existingAdmin = await prisma.user.findUnique({
    where: { email: seedAdminEmail },
  });

  if (existingAdmin) {
    console.log(`Admin user already exists: ${seedAdminEmail}`);
    return;
  }

  const defaultMxTz = await prisma.timezone.findUnique({
    where: { ianaName: 'America/Mexico_City' },
  });
  const response = await auth.api.signUpEmail({
    body: {
      email: seedAdminEmail,
      password: getSeedAdminPassword(),
      name: 'Admin User',
    },
  });

  if (!response.user) {
    throw new Error('Admin user creation failed.');
  }

  const profileData: {
    emailVerified: boolean;
    role: string;
    countryCode?: string;
    timezoneId?: string;
  } = {
    emailVerified: true,
    role: 'admin',
  };
  if (defaultMxTz) {
    profileData.countryCode = 'MX';
    profileData.timezoneId = defaultMxTz.id;
  }

  await prisma.user.update({
    where: { id: response.user.id },
    data: profileData,
  });

  const defaultOrg = await prisma.organization.create({
    data: {
      name: 'Default Organization',
      slug: 'default-org',
      members: {
        create: {
          userId: response.user.id,
          role: 'owner',
        },
      },
    },
  });

  await prisma.item.create({
    data: {
      title: 'Welcome Sample Item',
      description: 'This is a sample item created by the seed script.',
      userId: response.user.id,
      organizationId: defaultOrg.id,
    },
  });

  console.log(`Admin user created successfully: ${seedAdminEmail}`);
}

try {
  await main();
} catch (error) {
  console.error('Admin seed error:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
