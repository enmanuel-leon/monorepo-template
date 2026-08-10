export const listOrganizationsSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        organizations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
  },
} as const;

export const createOrganizationSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string' },
      slug: { type: 'string' },
    },
  },
} as const;
