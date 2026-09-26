import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';

describe('Organization Ownership Rule Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  async function canUserCreateOrganization(userId: string): Promise<boolean> {
    const existingOwnerMembership = await prisma.member.findFirst({
      where: {
        userId,
        role: 'owner',
      },
    });
    if (existingOwnerMembership) {
      return false;
    }
    return true;
  }

  it('rejects organization creation if user is already an owner of an organization', async () => {
    vi.spyOn(prisma.member, 'findFirst').mockResolvedValue({
      id: 'member-1',
      organizationId: 'org-1',
      userId: 'user-1',
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const allowed = await canUserCreateOrganization('user-1');
    expect(allowed).toBe(false);
  });

  it('allows organization creation if user is not an owner of any organization', async () => {
    vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null);

    const allowed = await canUserCreateOrganization('user-2');
    expect(allowed).toBe(true);
  });
});
