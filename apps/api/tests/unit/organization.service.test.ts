import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import {
  listUserOrganizations,
  createOrganizationForUser,
  listOrganizationInvitations,
} from '../../src/services/organization.service.js';
import { MEMBER_ROLES, AUTH_ERROR_CODES } from '../../src/constants/auth.constants.js';

describe('Organization Service Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('listUserOrganizations', () => {
    it('returns organizations the user is a member of', async () => {
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Org 1',
          slug: 'org-1',
          members: [
            {
              id: 'm-1',
              role: 'owner',
              user: {
                id: 'u-1',
                name: 'User 1',
                email: 'user1@example.com',
                image: null,
              },
            },
          ],
        },
      ];

      const findManySpy = vi
        .spyOn(prisma.organization, 'findMany')
        .mockResolvedValue(
          mockOrgs as unknown as Awaited<ReturnType<typeof prisma.organization.findMany>>,
        );

      const result = await listUserOrganizations('u-1');

      expect(findManySpy).toHaveBeenCalledWith({
        where: {
          members: {
            some: {
              userId: 'u-1',
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      });
      expect(result).toEqual(mockOrgs);
    });
  });

  describe('createOrganizationForUser', () => {
    it('creates an organization and assigns owner membership', async () => {
      const mockCreated = {
        id: 'org-new',
        name: 'New Org',
        slug: 'new-org',
        logo: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createSpy = vi
        .spyOn(prisma.organization, 'create')
        .mockResolvedValue(
          mockCreated as unknown as Awaited<ReturnType<typeof prisma.organization.create>>,
        );

      const result = await createOrganizationForUser('u-1', 'New Org', 'new-org');

      expect(createSpy).toHaveBeenCalledWith({
        data: {
          name: 'New Org',
          slug: 'new-org',
          members: {
            create: {
              userId: 'u-1',
              role: MEMBER_ROLES.OWNER,
            },
          },
        },
      });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('listOrganizationInvitations', () => {
    it('throws FORBIDDEN_ADMIN_ACCESS when caller is not an owner or admin', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue(null);

      await expect(
        listOrganizationInvitations({
          organizationId: 'org-1',
          userId: 'user-regular',
        }),
      ).rejects.toThrow(AUTH_ERROR_CODES.FORBIDDEN_ADMIN_ACCESS);
    });

    it('returns paginated invitations with default parameters for owner', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue({
        id: 'mem-1',
        organizationId: 'org-1',
        userId: 'user-owner',
        role: MEMBER_ROLES.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockInvitations = [
        {
          id: 'inv-1',
          organizationId: 'org-1',
          email: 'invitee@example.com',
          role: 'member',
          status: 'pending',
          expiresAt: new Date('2026-10-01'),
          inviterId: 'user-owner',
          createdAt: new Date('2026-09-01'),
          user: {
            id: 'user-owner',
            name: 'Owner User',
            email: 'owner@example.com',
          },
        },
      ];

      const findManySpy = vi
        .spyOn(prisma.invitation, 'findMany')
        .mockResolvedValue(
          mockInvitations as unknown as Awaited<ReturnType<typeof prisma.invitation.findMany>>,
        );
      const countSpy = vi.spyOn(prisma.invitation, 'count').mockResolvedValue(25);

      const result = await listOrganizationInvitations({
        organizationId: 'org-1',
        userId: 'user-owner',
      });

      expect(findManySpy).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      expect(countSpy).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });

      expect(result.data).toEqual(mockInvitations);
      expect(result.pagination).toEqual({
        total: 25,
        page: 1,
        pageSize: 10,
        totalPages: 3,
      });
    });

    it('filters by status when a status other than "all" is provided', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue({
        id: 'mem-admin',
        organizationId: 'org-1',
        userId: 'user-admin',
        role: MEMBER_ROLES.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const findManySpy = vi.spyOn(prisma.invitation, 'findMany').mockResolvedValue([]);
      const countSpy = vi.spyOn(prisma.invitation, 'count').mockResolvedValue(0);

      const result = await listOrganizationInvitations({
        organizationId: 'org-1',
        userId: 'user-admin',
        status: 'pending',
      });

      expect(findManySpy).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          status: 'pending',
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      expect(countSpy).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          status: 'pending',
        },
      });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('does not filter by status when status is "all"', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue({
        id: 'mem-admin',
        organizationId: 'org-1',
        userId: 'user-admin',
        role: MEMBER_ROLES.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const findManySpy = vi.spyOn(prisma.invitation, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.invitation, 'count').mockResolvedValue(0);

      await listOrganizationInvitations({
        organizationId: 'org-1',
        userId: 'user-admin',
        status: 'all',
      });

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1' },
        }),
      );
    });

    it('handles custom pagination, sortOrder asc, and clamps pageSize to 50', async () => {
      vi.spyOn(prisma.member, 'findFirst').mockResolvedValue({
        id: 'mem-1',
        organizationId: 'org-1',
        userId: 'user-owner',
        role: MEMBER_ROLES.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const findManySpy = vi.spyOn(prisma.invitation, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.invitation, 'count').mockResolvedValue(100);

      const result = await listOrganizationInvitations({
        organizationId: 'org-1',
        userId: 'user-owner',
        page: 2,
        pageSize: 100, // Should be clamped to 50
        sortOrder: 'asc',
      });

      expect(findManySpy).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        skip: 50,
        take: 50,
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      expect(result.pagination).toEqual({
        total: 100,
        page: 2,
        pageSize: 50,
        totalPages: 2,
      });
    });
  });
});
