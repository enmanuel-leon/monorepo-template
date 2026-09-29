export const listNotificationsSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
      unreadOnly: { type: 'boolean' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              type: { type: 'string' },
              title: { type: 'string' },
              message: { type: 'string' },
              read: { type: 'boolean' },
              metadata: {
                type: 'object',
                additionalProperties: true,
                nullable: true,
              },
              createdAt: { type: 'string' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            pageSize: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
        unreadCount: { type: 'number' },
      },
    },
  },
} as const;

export const markNotificationReadSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            type: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            read: { type: 'boolean' },
            metadata: {
              type: 'object',
              additionalProperties: true,
              nullable: true,
            },
            createdAt: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

export const markAllReadSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        count: { type: 'number' },
      },
    },
  },
} as const;

export const unreadCountSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        unreadCount: { type: 'number' },
      },
    },
  },
} as const;
