import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { getUserProfileWithRelations, updateUserProfile } from '../../src/services/user.service.js';

describe('User Service Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getUserProfileWithRelations queries prisma.user.findUnique with correct relations', async () => {
    const mockUser = {
      id: 'user-uuid-1',
      name: 'John Doe',
      email: 'john@example.com',
      country: { code: 'MX', name: 'Mexico' },
      timezone: { ianaName: 'America/Mexico_City' },
      members: [
        {
          id: 'member-1',
          role: 'owner',
          organization: { id: 'org-1', name: 'Acme Corp' },
        },
      ],
    };

    const findUniqueSpy = vi
      .spyOn(prisma.user, 'findUnique')
      .mockResolvedValue(mockUser as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);

    const result = await getUserProfileWithRelations('user-uuid-1');

    expect(findUniqueSpy).toHaveBeenCalledTimes(1);
    expect(findUniqueSpy).toHaveBeenCalledWith({
      where: { id: 'user-uuid-1' },
      include: {
        country: true,
        timezone: true,
        members: {
          include: {
            organization: true,
          },
        },
      },
    });
    expect(result).toEqual(mockUser);
  });

  it('updateUserProfile updates name, preferences and tour flags properly', async () => {
    const mockUpdated = {
      id: 'user-uuid-1',
      name: 'Jane Doe',
      locale: 'en',
      theme: 'light',
      hasSeenTour: true,
      hasCompletedOnboarding: true,
    };

    const updateSpy = vi
      .spyOn(prisma.user, 'update')
      .mockResolvedValue(mockUpdated as unknown as Awaited<ReturnType<typeof prisma.user.update>>);

    const result = await updateUserProfile('user-uuid-1', {
      name: 'Jane Doe',
      locale: 'en',
      theme: 'light',
      hasSeenTour: true,
      hasCompletedOnboarding: true,
    });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'user-uuid-1' },
      data: {
        name: 'Jane Doe',
        countryCode: undefined,
        timezoneId: undefined,
        locale: 'en',
        theme: 'light',
        hasSeenTour: true,
        hasCompletedOnboarding: true,
      },
      include: {
        country: true,
        timezone: true,
        members: {
          include: {
            organization: true,
          },
        },
      },
    });
    expect(result).toEqual(mockUpdated);
  });
});
