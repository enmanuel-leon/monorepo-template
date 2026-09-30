import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { renderHook, createTestQueryClient } from '../test-utils';
import { useHomePage, type MetricsSummary } from '../../src/pages/home/use-home-page';
import { authClient } from '../../src/lib/auth-client';
import * as apiClient from '../../src/lib/api-client';

vi.mock('../../src/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(),
    useActiveOrganization: vi.fn(),
    useListOrganizations: vi.fn(),
  },
}));

const mockMetrics: MetricsSummary = {
  items: {
    total: 5,
    recent: [
      {
        id: 'item-1',
        title: 'Item 1',
        description: 'First item description',
        status: 'active',
        createdAt: '2026-09-01T12:00:00Z',
      },
      {
        id: 'item-2',
        title: 'Item 2',
        description: null,
        status: 'pending',
        createdAt: '2026-09-02T12:00:00Z',
      },
    ],
  },
  organization: {
    id: 'org-active-1',
    name: 'Active Org',
    role: 'owner',
    memberCount: 3,
    pendingInvitationsCount: 1,
  },
  security: {
    passkeysCount: 2,
    twoFactorEnabled: true,
  },
  profile: {
    name: 'John Doe',
    email: 'john@example.com',
    isComplete: true,
  },
};

const mockPersonalMetrics: MetricsSummary = {
  items: {
    total: 2,
    recent: [
      {
        id: 'item-3',
        title: 'Personal Item',
        description: 'Personal note',
        status: 'active',
        createdAt: '2026-09-03T12:00:00Z',
      },
    ],
  },
  organization: null,
  security: {
    passkeysCount: 1,
    twoFactorEnabled: false,
  },
  profile: {
    name: 'Personal User',
    email: 'personal@example.com',
    isComplete: false,
  },
};

describe('useHomePage Hook Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches metrics for personal workspace when no organization is active or listed', async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: 'u-1', name: 'John Doe', email: 'john@example.com' } },
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useSession>);

    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: null,
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useActiveOrganization>);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useListOrganizations>);

    const fetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
      metrics: mockPersonalMetrics,
    });

    const hook = renderHook(() => useHomePage(), createTestQueryClient());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/metrics/summary');
    expect(hook.current.user?.name).toBe('John Doe');
    expect(hook.current.organization).toBeNull();
    expect(hook.current.metrics).toEqual(mockPersonalMetrics);
    expect(hook.current.isLoading).toBe(false);
    expect(hook.current.isRefetching).toBe(false);

    hook.unmount();
  });

  it('fetches metrics for active organization workspace when activeOrg is present', async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: 'u-1', name: 'John Doe', email: 'john@example.com' } },
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useSession>);

    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: { id: 'org-active-1', name: 'Active Org', slug: 'active-org' },
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useActiveOrganization>);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [{ id: 'org-active-1', name: 'Active Org', slug: 'active-org' }],
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useListOrganizations>);

    const fetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
      metrics: mockMetrics,
    });

    const hook = renderHook(() => useHomePage(), createTestQueryClient());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/metrics/summary?organizationId=org-active-1');
    expect(hook.current.organization?.name).toBe('Active Org');
    expect(hook.current.metrics).toEqual(mockMetrics);
    expect(hook.current.isLoading).toBe(false);

    hook.unmount();
  });

  it('falls back to first user organization when activeOrg.data is null', async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: 'u-1', name: 'John Doe', email: 'john@example.com' } },
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useSession>);

    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: null,
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useActiveOrganization>);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [{ id: 'org-fallback-1', name: 'Fallback Org', slug: 'fallback-org' }],
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useListOrganizations>);

    const fetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
      metrics: mockMetrics,
    });

    const hook = renderHook(() => useHomePage(), createTestQueryClient());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/metrics/summary?organizationId=org-fallback-1');
    expect(hook.current.organization?.name).toBe('Fallback Org');
    expect(hook.current.organization?.id).toBe('org-fallback-1');
    expect(hook.current.metrics).toEqual(mockMetrics);

    hook.unmount();
  });

  it('falls back to sessionActiveOrgId when activeOrg.data is null and matches user organization', async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: {
        user: { id: 'u-1', name: 'John Doe', email: 'john@example.com' },
        session: { activeOrganizationId: 'org-session-2' },
      },
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useSession>);

    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: null,
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useActiveOrganization>);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [
        { id: 'org-fallback-1', name: 'Fallback Org', slug: 'fallback-org' },
        { id: 'org-session-2', name: 'Session Org', slug: 'session-org' },
      ],
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useListOrganizations>);

    const fetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
      metrics: mockMetrics,
    });

    const hook = renderHook(() => useHomePage(), createTestQueryClient());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/metrics/summary?organizationId=org-session-2');
    expect(hook.current.organization?.name).toBe('Session Org');
    expect(hook.current.organization?.id).toBe('org-session-2');
    expect(hook.current.metrics).toEqual(mockMetrics);

    hook.unmount();
  });

  it('handles handleRefresh and refetches metrics', async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: 'u-1', name: 'John Doe', email: 'john@example.com' } },
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useSession>);

    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: { id: 'org-active-1', name: 'Active Org', slug: 'active-org' },
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useActiveOrganization>);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [{ id: 'org-active-1', name: 'Active Org', slug: 'active-org' }],
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useListOrganizations>);

    const fetchSpy = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
      metrics: mockMetrics,
    });

    const hook = renderHook(() => useHomePage(), createTestQueryClient());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      await hook.current.handleRefresh();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);

    hook.unmount();
  });

  it('indicates loading state initially while metrics query is pending', () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: 'u-1', name: 'John Doe', email: 'john@example.com' } },
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useSession>);

    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: null,
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useActiveOrganization>);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useListOrganizations>);

    vi.spyOn(apiClient, 'apiFetch').mockImplementation(() => new Promise(() => {}));

    const hook = renderHook(() => useHomePage(), createTestQueryClient());

    expect(hook.current.isLoading).toBe(true);
    expect(hook.current.metrics).toBeNull();

    hook.unmount();
  });

  it('handles error state when metrics fetch fails', async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: 'u-1', name: 'John Doe', email: 'john@example.com' } },
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useSession>);

    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: null,
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useActiveOrganization>);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useListOrganizations>);

    vi.spyOn(apiClient, 'apiFetch').mockRejectedValue(new Error('Network error'));

    const hook = renderHook(() => useHomePage(), createTestQueryClient());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });

    expect(hook.current.isLoading).toBe(false);
    expect(hook.current.metrics).toBeNull();

    hook.unmount();
  });
});
