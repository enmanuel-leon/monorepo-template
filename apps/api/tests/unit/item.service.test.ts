import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { listItems, createItem, deleteItem } from '../../src/services/item.service.js';

describe('Item Service Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('listItems queries by organizationId when organizationId is provided', async () => {
    const mockItems = [
      { id: 'item-1', title: 'Org Item', organizationId: 'org-1', userId: 'user-1' },
    ];
    const findManySpy = vi
      .spyOn(prisma.item, 'findMany')
      .mockResolvedValue(mockItems as unknown as Awaited<ReturnType<typeof prisma.item.findMany>>);

    const result = await listItems('user-1', 'org-1');

    expect(findManySpy).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(mockItems);
  });

  it('listItems queries by userId when organizationId is omitted', async () => {
    const mockItems = [
      { id: 'item-2', title: 'Personal Item', organizationId: null, userId: 'user-1' },
    ];
    const findManySpy = vi
      .spyOn(prisma.item, 'findMany')
      .mockResolvedValue(mockItems as unknown as Awaited<ReturnType<typeof prisma.item.findMany>>);

    const result = await listItems('user-1');

    expect(findManySpy).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(mockItems);
  });

  it('createItem creates an item with the provided inputs', async () => {
    const mockCreated = {
      id: 'item-3',
      title: 'New Item',
      description: 'Desc',
      userId: 'user-1',
      organizationId: 'org-1',
    };
    const createSpy = vi
      .spyOn(prisma.item, 'create')
      .mockResolvedValue(mockCreated as unknown as Awaited<ReturnType<typeof prisma.item.create>>);

    const result = await createItem({
      title: 'New Item',
      description: 'Desc',
      userId: 'user-1',
      organizationId: 'org-1',
    });

    expect(createSpy).toHaveBeenCalledWith({
      data: {
        title: 'New Item',
        description: 'Desc',
        userId: 'user-1',
        organizationId: 'org-1',
      },
    });
    expect(result).toEqual(mockCreated);
  });

  it('deleteItem deletes an item strictly enforcing id and owner userId', async () => {
    const deleteManySpy = vi.spyOn(prisma.item, 'deleteMany').mockResolvedValue({ count: 1 });

    const result = await deleteItem('item-3', 'user-1');

    expect(deleteManySpy).toHaveBeenCalledWith({
      where: { id: 'item-3', userId: 'user-1' },
    });
    expect(result).toEqual({ count: 1 });
  });
});
