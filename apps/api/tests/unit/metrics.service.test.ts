import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { getMetricsSummary } from '../../src/services/metrics.service.js';
import { AUTH_ERROR_CODES, INVITATION_STATUS } from '../../src/constants/auth.constants.js';

describe('Metrics Service Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('with organizationId', () => {
    it('throws FORBIDDEN_ORGANIZATION_ACCESS when user is not a member', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null);

      await expect(
        getMetricsSummary({
          userId: 'user-outsider',
          organizationId: 'org-forbidden',
        }),
      ).rejects.toThrow(AUTH_ERROR_CODES.FORBIDDEN_ORGANIZATION_ACCESS);
    });

    it('aggregates metrics properly when user is a member', async () => {
      const mockItems = [
        {
          id: 'item-1',
          title: 'Item 1',
          description: 'Desc 1',
          status: 'active',
          userId: 'user-1',
          organizationId: 'org-1',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ];

      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue({
        id: 'member-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const itemCountSpy = vi.spyOn(prisma.item, 'count').mockResolvedValue(12);
      const itemFindManySpy = vi
        .spyOn(prisma.item, 'findMany')
        .mockResolvedValue(
          mockItems as unknown as Awaited<ReturnType<typeof prisma.item.findMany>>,
        );
      const orgFindUniqueSpy = vi.spyOn(prisma.organization, 'findUnique').mockResolvedValue({
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        logo: 'https://example.com/logo.png',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const memberCountSpy = vi.spyOn(prisma.member, 'count').mockResolvedValue(4);
      const invitationCountSpy = vi.spyOn(prisma.invitation, 'count').mockResolvedValue(2);
      const passkeyCountSpy = vi.spyOn(prisma.passkey, 'count').mockResolvedValue(3);
      const userFindUniqueSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        twoFactorEnabled: true,
        countryCode: 'US',
        timezoneId: 'tz-uuid-1',
      } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);

      const result = await getMetricsSummary({
        userId: 'user-1',
        organizationId: 'org-1',
      });

      expect(itemCountSpy).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
      expect(itemFindManySpy).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      expect(orgFindUniqueSpy).toHaveBeenCalledWith({
        where: { id: 'org-1' },
      });
      expect(memberCountSpy).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
      expect(invitationCountSpy).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          status: INVITATION_STATUS.PENDING,
        },
      });
      expect(passkeyCountSpy).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(userFindUniqueSpy).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });

      expect(result.items.total).toBe(12);
      expect(result.items.count).toBe(12);
      expect(result.items.recent).toEqual(mockItems);

      expect(result.organization).toEqual({
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        logo: 'https://example.com/logo.png',
        memberCount: 4,
        membersCount: 4,
        pendingInvitationCount: 2,
        pendingInvitationsCount: 2,
        userRole: 'admin',
        role: 'admin',
      });

      expect(result.security).toEqual({
        passkeyCount: 3,
        twoFactorEnabled: true,
      });

      expect(result.profile).toEqual({
        name: 'Jane Doe',
        email: 'jane@example.com',
        isComplete: true,
      });
    });

    it('handles incomplete profile and null org details gracefully', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue({
        id: 'member-2',
        organizationId: 'org-2',
        userId: 'user-2',
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(prisma.item, 'count').mockResolvedValue(0);
      vi.spyOn(prisma.item, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.organization, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.member, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.invitation, 'count').mockResolvedValue(0);
      vi.spyOn(prisma.passkey, 'count').mockResolvedValue(0);
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user-2',
        name: null,
        email: 'incomplete@example.com',
        twoFactorEnabled: null,
        countryCode: null,
        timezoneId: 'tz-1',
      } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);

      const result = await getMetricsSummary({
        userId: 'user-2',
        organizationId: 'org-2',
      });

      expect(result.organization).toEqual({
        id: 'org-2',
        name: '',
        slug: null,
        logo: null,
        memberCount: 1,
        membersCount: 1,
        pendingInvitationCount: 0,
        pendingInvitationsCount: 0,
        userRole: 'member',
        role: 'member',
      });

      expect(result.security.twoFactorEnabled).toBe(false);
      expect(result.security.passkeyCount).toBe(0);
      expect(result.profile.name).toBe('');
      expect(result.profile.email).toBe('incomplete@example.com');
      expect(result.profile.isComplete).toBe(false);
    });
  });

  describe('without organizationId (personal workspace)', () => {
    it('aggregates personal items, security, and profile metrics with organization as null', async () => {
      const mockPersonalItems = [
        {
          id: 'item-personal-1',
          title: 'Personal Item 1',
          description: null,
          status: 'active',
          userId: 'user-me',
          organizationId: null,
          createdAt: new Date('2026-02-01'),
          updatedAt: new Date('2026-02-01'),
        },
      ];

      const memberFindFirstSpy = vi.spyOn(prisma.member, 'findFirst');
      const orgFindUniqueSpy = vi.spyOn(prisma.organization, 'findUnique');
      const invitationCountSpy = vi.spyOn(prisma.invitation, 'count');

      const itemCountSpy = vi.spyOn(prisma.item, 'count').mockResolvedValue(1);
      const itemFindManySpy = vi
        .spyOn(prisma.item, 'findMany')
        .mockResolvedValue(
          mockPersonalItems as unknown as Awaited<ReturnType<typeof prisma.item.findMany>>,
        );
      const passkeyCountSpy = vi.spyOn(prisma.passkey, 'count').mockResolvedValue(1);
      const userFindUniqueSpy = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user-me',
        name: 'Personal User',
        email: 'me@example.com',
        twoFactorEnabled: false,
        countryCode: 'CA',
        timezoneId: 'tz-canada',
      } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);

      const result = await getMetricsSummary({
        userId: 'user-me',
      });

      expect(memberFindFirstSpy).not.toHaveBeenCalled();
      expect(orgFindUniqueSpy).not.toHaveBeenCalled();
      expect(invitationCountSpy).not.toHaveBeenCalled();

      expect(itemCountSpy).toHaveBeenCalledWith({
        where: { userId: 'user-me' },
      });
      expect(itemFindManySpy).toHaveBeenCalledWith({
        where: { userId: 'user-me' },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      expect(passkeyCountSpy).toHaveBeenCalledWith({
        where: { userId: 'user-me' },
      });
      expect(userFindUniqueSpy).toHaveBeenCalledWith({
        where: { id: 'user-me' },
      });

      expect(result.items.total).toBe(1);
      expect(result.items.count).toBe(1);
      expect(result.items.recent).toEqual(mockPersonalItems);
      expect(result.organization).toBeNull();
      expect(result.security).toEqual({
        passkeyCount: 1,
        twoFactorEnabled: false,
      });
      expect(result.profile).toEqual({
        name: 'Personal User',
        email: 'me@example.com',
        isComplete: true,
      });
    });

    it('handles null user safely in personal workspace', async () => {
      vi.spyOn(prisma.item, 'count').mockResolvedValue(0);
      vi.spyOn(prisma.item, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.passkey, 'count').mockResolvedValue(0);
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const result = await getMetricsSummary({
        userId: 'user-missing',
      });

      expect(result.organization).toBeNull();
      expect(result.security.passkeyCount).toBe(0);
      expect(result.security.twoFactorEnabled).toBe(false);
      expect(result.profile.name).toBe('');
      expect(result.profile.email).toBe('');
      expect(result.profile.isComplete).toBe(false);
    });
  });
});
