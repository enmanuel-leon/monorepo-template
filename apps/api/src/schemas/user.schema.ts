export const userSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', nullable: true },
            image: { type: 'string', nullable: true },
            countryCode: { type: 'string', nullable: true },
            timezoneId: { type: 'string', nullable: true },
            locale: { type: 'string', nullable: true },
            theme: { type: 'string', nullable: true },
            hasSeenTour: { type: 'boolean' },
            hasCompletedOnboarding: { type: 'boolean' },
            country: {
              type: 'object',
              nullable: true,
              properties: {
                code: { type: 'string' },
                iso3: { type: 'string', nullable: true },
                name: { type: 'string' },
                flag: { type: 'string', nullable: true },
              },
            },
            timezone: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                ianaName: { type: 'string' },
                displayName: { type: 'string' },
                gmtOffset: { type: 'string' },
                countryCode: { type: 'string' },
              },
            },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  organizationId: { type: 'string' },
                  role: { type: 'string' },
                  organization: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      slug: { type: 'string', nullable: true },
                      logo: { type: 'string', nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
