import { prisma } from '../lib/prisma.js';

export interface CreateItemInput {
  title: string;
  description?: string;
  userId: string;
  organizationId?: string;
}

export async function listItems(userId: string, organizationId?: string) {
  if (organizationId) {
    return prisma.item.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  return prisma.item.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function createItem(input: CreateItemInput) {
  return prisma.item.create({
    data: {
      title: input.title,
      description: input.description,
      userId: input.userId,
      organizationId: input.organizationId,
    },
  });
}

export async function deleteItem(id: string, userId: string) {
  return prisma.item.deleteMany({
    where: {
      id,
      userId,
    },
  });
}
