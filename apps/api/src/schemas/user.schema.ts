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
          },
        },
      },
    },
  },
} as const;
