export const getMetricsSummarySchema = {
  querystring: {
    type: 'object',
    properties: {
      organizationId: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        metrics: {
          type: 'object',
          properties: {
            items: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                count: { type: 'number' },
                recent: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      description: { type: 'string', nullable: true },
                      status: { type: 'string' },
                      userId: { type: 'string' },
                      organizationId: { type: 'string', nullable: true },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                    },
                  },
                },
              },
            },
            organization: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string', nullable: true },
                logo: { type: 'string', nullable: true },
                memberCount: { type: 'number' },
                membersCount: { type: 'number' },
                pendingInvitationCount: { type: 'number' },
                pendingInvitationsCount: { type: 'number' },
                userRole: { type: 'string' },
                role: { type: 'string' },
              },
            },
            security: {
              type: 'object',
              properties: {
                passkeyCount: { type: 'number' },
                twoFactorEnabled: { type: 'boolean' },
              },
            },
            profile: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
                isComplete: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  },
} as const;
