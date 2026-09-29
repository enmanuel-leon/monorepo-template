import { prisma } from '../lib/prisma.js';

export interface CreateItemInput {
  title: string;
  description?: string;
  userId: string;
  organizationId?: string;
}

export interface DeleteItemResult {
  success: boolean;
  notFound?: boolean;
  forbidden?: boolean;
}

export async function listItems(userId: string, organizationId?: string) {
  if (organizationId) {
    const membership = await prisma.member.findFirst({
      where: {
        organizationId,
        userId,
      },
    });

    if (!membership) {
      return [];
    }

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
  if (input.organizationId) {
    const membership = await prisma.member.findFirst({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    });

    if (!membership) {
      throw new Error('FORBIDDEN_ORGANIZATION_ACCESS');
    }
  }

  return prisma.item.create({
    data: {
      title: input.title,
      description: input.description,
      userId: input.userId,
      organizationId: input.organizationId,
    },
  });
}

export async function deleteItem(id: string, userId: string): Promise<DeleteItemResult> {
  const item = await prisma.item.findUnique({
    where: { id },
  });

  if (!item) {
    return { success: false, notFound: true };
  }

  if (item.organizationId) {
    const membership = await prisma.member.findFirst({
      where: {
        organizationId: item.organizationId,
        userId,
      },
    });

    if (!membership) {
      return { success: false, forbidden: true };
    }
  } else if (item.userId !== userId) {
    return { success: false, forbidden: true };
  }

  await prisma.item.delete({
    where: { id },
  });

  return { success: true };
}
