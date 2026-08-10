export const listItemSchema = {
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          createdAt: { type: 'string' },
        },
      },
    },
  },
} as const;

export const createItemSchema = {
  body: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      organizationId: { type: 'string' },
    },
  },
} as const;
