import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { listItems, createItem, deleteItem } from '../../src/services/item.service.js';

describe('Item Service Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('listItems queries by organizationId when user is member of organization', async () => {
    const mockItems = [
      { id: 'item-1', title: 'Org Item', organizationId: 'org-1', userId: 'user-1' },
    ];
    vi.spyOn(prisma.member, 'findFirst').mockResolvedValue({
      id: 'm-1',
      organizationId: 'org-1',
      userId: 'user-1',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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

  it('listItems returns empty array when user is not member of specified organization', async () => {
    vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null);
    const findManySpy = vi.spyOn(prisma.item, 'findMany');

    const result = await listItems('user-outsider', 'org-private');

    expect(result).toEqual([]);
    expect(findManySpy).not.toHaveBeenCalled();
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

  it('createItem creates an organization item when user is member', async () => {
    const mockCreated = {
      id: 'item-3',
      title: 'New Item',
      description: 'Desc',
      userId: 'user-1',
      organizationId: 'org-1',
    };
    vi.spyOn(prisma.member, 'findFirst').mockResolvedValue({
      id: 'm-1',
      organizationId: 'org-1',
      userId: 'user-1',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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

  it('createItem throws forbidden error when user is not member of target organization', async () => {
    vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null);

    await expect(
      createItem({
        title: 'Unauthorized Item',
        userId: 'user-outsider',
        organizationId: 'org-forbidden',
      }),
    ).rejects.toThrow('FORBIDDEN_ORGANIZATION_ACCESS');
  });

  it('createItem creates personal item when organizationId is omitted', async () => {
    const mockPersonal = {
      id: 'item-personal',
      title: 'My Item',
      description: undefined,
      userId: 'user-1',
      organizationId: undefined,
    };
    vi.spyOn(prisma.item, 'create').mockResolvedValue(
      mockPersonal as unknown as Awaited<ReturnType<typeof prisma.item.create>>,
    );

    const result = await createItem({
      title: 'My Item',
      userId: 'user-1',
    });

    expect(result).toEqual(mockPersonal);
  });

  it('deleteItem returns notFound when item does not exist', async () => {
    vi.spyOn(prisma.item, 'findUnique').mockResolvedValue(null);

    const result = await deleteItem('non-existent', 'user-1');
    expect(result).toEqual({ success: false, notFound: true });
  });

  it('deleteItem returns forbidden when personal item is owned by another user', async () => {
    vi.spyOn(prisma.item, 'findUnique').mockResolvedValue({
      id: 'item-other',
      title: 'Other User Item',
      description: null,
      status: 'active',
      userId: 'user-owner',
      organizationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await deleteItem('item-other', 'user-intruder');
    expect(result).toEqual({ success: false, forbidden: true });
  });

  it('deleteItem deletes personal item when caller is the owner', async () => {
    vi.spyOn(prisma.item, 'findUnique').mockResolvedValue({
      id: 'item-mine',
      title: 'My Item',
      description: null,
      status: 'active',
      userId: 'user-1',
      organizationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const deleteSpy = vi.spyOn(prisma.item, 'delete').mockResolvedValue({} as any);

    const result = await deleteItem('item-mine', 'user-1');

    expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 'item-mine' } });
    expect(result).toEqual({ success: true });
  });

  it('deleteItem deletes organization item when caller is a member of that organization', async () => {
    vi.spyOn(prisma.item, 'findUnique').mockResolvedValue({
      id: 'item-org',
      title: 'Org Item',
      description: null,
      status: 'active',
      userId: 'user-creator',
      organizationId: 'org-shared',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.spyOn(prisma.member, 'findFirst').mockResolvedValue({
      id: 'm-2',
      organizationId: 'org-shared',
      userId: 'user-teammate',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const deleteSpy = vi.spyOn(prisma.item, 'delete').mockResolvedValue({} as any);

    const result = await deleteItem('item-org', 'user-teammate');

    expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 'item-org' } });
    expect(result).toEqual({ success: true });
  });

  it('deleteItem returns forbidden when organization item caller is not in that organization', async () => {
    vi.spyOn(prisma.item, 'findUnique').mockResolvedValue({
      id: 'item-org',
      title: 'Org Item',
      description: null,
      status: 'active',
      userId: 'user-creator',
      organizationId: 'org-private',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null);

    const result = await deleteItem('item-org', 'user-outsider');
    expect(result).toEqual({ success: false, forbidden: true });
  });
});
