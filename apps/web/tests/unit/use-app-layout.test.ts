import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { toast } from 'sonner';
import { renderHook, createTestQueryClient } from '../test-utils';
import { useAppLayout } from '../../src/layouts/app-layout/use-app-layout';
import { authClient } from '../../src/lib/auth-client';
import * as apiClient from '../../src/lib/api-client';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      let result = key;
      if (options?.orgName) {
        result = `${key}:${options.orgName}`;
      }
      return result;
    },
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockUseSession = vi.fn();
const mockUseActiveOrganization = vi.fn();
const mockUseListOrganizations = vi.fn();
const mockSignOut = vi.fn();
const mockSetActive = vi.fn();
const mockRefetchUserOrgs = vi.fn();
const mockRefetchActiveOrg = vi.fn();

vi.mock('../../src/lib/auth-client', () => ({
  authClient: {
    useSession: () => mockUseSession(),
    useActiveOrganization: () => mockUseActiveOrganization(),
    useListOrganizations: () => mockUseListOrganizations(),
    signOut: () => mockSignOut(),
    organization: {
      setActive: (args: unknown) => mockSetActive(args),
    },
  },
}));

const mockSetLocale = vi.fn();
const mockSetTheme = vi.fn();
const mockToggleTheme = vi.fn();
let mockLocale = 'es';
let mockTheme = 'light';

vi.mock('../../src/stores/locale.store', () => ({
  useLocaleStore: () => ({
    locale: mockLocale,
    setLocale: mockSetLocale,
  }),
}));

vi.mock('../../src/stores/theme.store', () => ({
  useThemeStore: () => ({
    theme: mockTheme,
    toggleTheme: mockToggleTheme,
    setTheme: mockSetTheme,
  }),
}));

function renderAppLayoutHook(initialProfileData?: unknown) {
  const queryClient = createTestQueryClient();
  if (initialProfileData !== undefined) {
    queryClient.setQueryData(['current-user-profile'], initialProfileData);
  }
  const hookResult = renderHook(() => useAppLayout(), queryClient);
  return {
    hook: hookResult,
    queryClient,
  };
}

describe('useAppLayout Hook Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale = 'es';
    mockTheme = 'light';
    mockNavigate.mockReset();
    mockSignOut.mockResolvedValue({});
    mockSetActive.mockResolvedValue({});
    mockRefetchUserOrgs.mockResolvedValue({});
    mockRefetchActiveOrg.mockResolvedValue({});
    vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({});

    mockUseSession.mockReturnValue({
      data: { user: { id: 'u-1', name: 'John Doe', email: 'john@example.com' } },
      isPending: false,
    });

    mockUseActiveOrganization.mockReturnValue({
      data: { id: 'org-1', name: 'Active Org', slug: 'active-org' },
      isPending: false,
      refetch: mockRefetchActiveOrg,
    });

    mockUseListOrganizations.mockReturnValue({
      data: [
        { id: 'org-1', name: 'Active Org', slug: 'active-org' },
        { id: 'org-2', name: 'Second Org', slug: 'second-org' },
      ],
      isPending: false,
      refetch: mockRefetchUserOrgs,
    });
  });

  it('returns active organization when activeOrg.data is present', () => {
    const { hook } = renderAppLayoutHook();

    expect(hook.current.user?.name).toBe('John Doe');
    expect(hook.current.organization?.name).toBe('Active Org');
    expect(hook.current.organizations).toHaveLength(2);
    expect(hook.current.locale).toBe('es');
    expect(hook.current.theme).toBe('light');
    hook.unmount();
  });

  it('falls back to first user organization when activeOrg.data is null', () => {
    mockUseActiveOrganization.mockReturnValue({
      data: null,
      isPending: false,
      refetch: mockRefetchActiveOrg,
    });

    const { hook } = renderAppLayoutHook();

    expect(hook.current.organization?.name).toBe('Active Org');
    hook.unmount();
  });

  it('returns null organization when activeOrg is null and userOrgs is empty', () => {
    mockUseActiveOrganization.mockReturnValue({
      data: null,
      isPending: false,
      refetch: mockRefetchActiveOrg,
    });
    mockUseListOrganizations.mockReturnValue({
      data: [],
      isPending: false,
      refetch: mockRefetchUserOrgs,
    });

    const { hook } = renderAppLayoutHook();

    expect(hook.current.organization).toBeNull();
    expect(hook.current.organizations).toHaveLength(0);
    hook.unmount();
  });

  it('falls back to empty array when userOrgs.data is undefined', () => {
    mockUseActiveOrganization.mockReturnValue({
      data: null,
      isPending: false,
      refetch: mockRefetchActiveOrg,
    });
    mockUseListOrganizations.mockReturnValue({
      data: undefined,
      isPending: false,
      refetch: mockRefetchUserOrgs,
    });

    const { hook } = renderAppLayoutHook();

    expect(hook.current.organization).toBeNull();
    expect(hook.current.organizations).toHaveLength(0);
    hook.unmount();
  });

  it('identifies user as owner of any organization when role is owner', () => {
    const { hook } = renderAppLayoutHook({
      user: {
        id: 'u-1',
        members: [{ id: 'm-1', organizationId: 'org-1', role: 'owner' }],
      },
    });

    expect(hook.current.isOwnerOfAnyOrg).toBe(true);
    hook.unmount();
  });

  it('identifies user as not owner when memberships do not include owner role', () => {
    const { hook } = renderAppLayoutHook({
      user: {
        id: 'u-1',
        members: [{ id: 'm-1', organizationId: 'org-1', role: 'member' }],
      },
    });

    expect(hook.current.isOwnerOfAnyOrg).toBe(false);
    hook.unmount();
  });

  it('handles missing memberships safely', () => {
    const { hook } = renderAppLayoutHook({
      user: {
        id: 'u-1',
      },
    });

    expect(hook.current.isOwnerOfAnyOrg).toBe(false);
    hook.unmount();
  });

  it('synchronizes locale and theme from profileUser when they differ', () => {
    mockLocale = 'es';
    mockTheme = 'light';

    const { hook } = renderAppLayoutHook({
      user: {
        id: 'u-1',
        locale: 'en',
        theme: 'dark',
      },
    });

    expect(mockSetLocale).toHaveBeenCalledWith('en', false);
    expect(mockSetTheme).toHaveBeenCalledWith('dark', false);
    hook.unmount();
  });

  it('does not synchronize locale or theme when they already match profileUser', () => {
    mockLocale = 'en';
    mockTheme = 'dark';

    const { hook } = renderAppLayoutHook({
      user: {
        id: 'u-1',
        locale: 'en',
        theme: 'dark',
      },
    });

    expect(mockSetLocale).not.toHaveBeenCalled();
    expect(mockSetTheme).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('triggers tour when profileUser hasSeenTour is false on first appearance', () => {
    const { hook } = renderAppLayoutHook({
      user: {
        id: 'u-1',
        hasSeenTour: false,
      },
    });

    expect(hook.current.isTourOpen).toBe(true);
    hook.unmount();
  });

  it('does not trigger tour when profileUser hasSeenTour is true', () => {
    const { hook } = renderAppLayoutHook({
      user: {
        id: 'u-1',
        hasSeenTour: true,
      },
    });

    expect(hook.current.isTourOpen).toBe(false);
    hook.unmount();
  });

  it('handles start tour', () => {
    const { hook } = renderAppLayoutHook();

    expect(hook.current.isTourOpen).toBe(false);

    act(() => {
      hook.current.handleStartTour();
    });

    expect(hook.current.isTourOpen).toBe(true);
    hook.unmount();
  });

  it('handles close tour successfully, sends PATCH, and invalidates query', async () => {
    const { hook, queryClient } = renderAppLayoutHook({
      user: {
        id: 'u-1',
        hasSeenTour: false,
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    expect(hook.current.isTourOpen).toBe(true);

    await act(async () => {
      await hook.current.handleCloseTour();
    });

    expect(hook.current.isTourOpen).toBe(false);
    expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({ hasSeenTour: true }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['current-user-profile'],
    });

    hook.unmount();
  });

  it('handles close tour error gracefully when API fails', async () => {
    vi.spyOn(apiClient, 'apiFetch').mockRejectedValue(new Error('Network failure'));

    const { hook } = renderAppLayoutHook({
      user: {
        id: 'u-1',
        hasSeenTour: false,
      },
    });

    expect(hook.current.isTourOpen).toBe(true);

    await act(async () => {
      await hook.current.handleCloseTour();
    });

    expect(hook.current.isTourOpen).toBe(false);
    hook.unmount();
  });

  it('opens and closes invitation modal properly', () => {
    const { hook } = renderAppLayoutHook();

    const fakeInvitation = {
      id: 'inv-1',
      organizationId: 'org-1',
      organizationName: 'Invited Workspace',
      role: 'member',
      email: 'john@example.com',
    };

    expect(hook.current.selectedInvitation).toBeNull();

    act(() => {
      hook.current.openInvitationModal(fakeInvitation);
    });

    expect(hook.current.selectedInvitation).toEqual(fakeInvitation);

    act(() => {
      hook.current.closeInvitationModal();
    });

    expect(hook.current.selectedInvitation).toBeNull();
    hook.unmount();
  });

  it('handles invitation accepted by invalidating queries and refetching organizations', async () => {
    const { hook, queryClient } = renderAppLayoutHook();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await hook.current.handleInvitationAccepted('org-1');
    });

    expect(invalidateSpy).toHaveBeenCalled();
    expect(mockRefetchUserOrgs).toHaveBeenCalled();
    expect(mockRefetchActiveOrg).toHaveBeenCalled();
    hook.unmount();
  });

  it('handles invitation declined by invalidating queries', async () => {
    const { hook, queryClient } = renderAppLayoutHook();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await hook.current.handleInvitationDeclined('inv-1');
    });

    expect(invalidateSpy).toHaveBeenCalled();
    hook.unmount();
  });

  it('handles sign out by clearing queries, signing out, and navigating to /login', async () => {
    const { hook, queryClient } = renderAppLayoutHook();
    const clearSpy = vi.spyOn(queryClient, 'clear');

    await act(async () => {
      await hook.current.handleSignOut();
    });

    expect(clearSpy).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    hook.unmount();
  });

  it('handles select organization by clearing queryClient, setting active org, and invalidating queries', async () => {
    const { hook, queryClient } = renderAppLayoutHook();
    const clearSpy = vi.spyOn(queryClient, 'clear');
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await hook.current.handleSelectOrg('org-switch-target');
    });

    expect(clearSpy).toHaveBeenCalled();
    expect(mockSetActive).toHaveBeenCalledWith({
      organizationId: 'org-switch-target',
    });
    expect(invalidateSpy).toHaveBeenCalled();
    hook.unmount();
  });

  it('toggles language from Spanish to English', () => {
    mockLocale = 'es';
    const { hook } = renderAppLayoutHook();

    act(() => {
      hook.current.handleLanguageToggle();
    });

    expect(mockSetLocale).toHaveBeenCalledWith('en', true);
    hook.unmount();
  });

  it('toggles language from English to Spanish', () => {
    mockLocale = 'en';
    const { hook } = renderAppLayoutHook();

    act(() => {
      hook.current.handleLanguageToggle();
    });

    expect(mockSetLocale).toHaveBeenCalledWith('es', true);
    hook.unmount();
  });

  it('toggles theme when handleThemeToggle is invoked', () => {
    const { hook } = renderAppLayoutHook();

    act(() => {
      hook.current.handleThemeToggle();
    });

    expect(mockToggleTheme).toHaveBeenCalledWith(true);
    hook.unmount();
  });

  it('executes profile queryFn via apiFetch when session user exists', async () => {
    const { hook } = renderAppLayoutHook();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/v1/me');
    hook.unmount();
  });

  it('detects reactive membership loss, resets active organization, invalidates queries, and shows toast', async () => {
    mockUseActiveOrganization.mockReturnValue({
      data: { id: 'org-removed', name: 'Removed Org', slug: 'removed-org' },
      isPending: false,
      refetch: mockRefetchActiveOrg,
    });
    mockUseListOrganizations.mockReturnValue({
      data: [{ id: 'org-other', name: 'Other Org', slug: 'other-org' }],
      isPending: false,
      refetch: mockRefetchUserOrgs,
    });

    const { hook, queryClient } = renderAppLayoutHook();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSetActive).toHaveBeenCalledWith({ organizationId: null });
    expect(invalidateSpy).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('notifications.removedFromOrgToast:Removed Org');
    hook.unmount();
  });

  it('resets active organization and shows toast on auth:forbidden-organization event', async () => {
    mockUseActiveOrganization.mockReturnValue({
      data: { id: 'org-1', name: 'Active Org', slug: 'active-org' },
      isPending: false,
      refetch: mockRefetchActiveOrg,
    });
    mockUseListOrganizations.mockReturnValue({
      data: [{ id: 'org-1', name: 'Active Org', slug: 'active-org' }],
      isPending: false,
      refetch: mockRefetchUserOrgs,
    });

    const { hook, queryClient } = renderAppLayoutHook();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('auth:forbidden-organization', {
          detail: { status: 403, message: 'FORBIDDEN_ORGANIZATION_ACCESS' },
        }),
      );
    });

    expect(mockSetActive).toHaveBeenCalledWith({ organizationId: null });
    expect(invalidateSpy).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('notifications.removedFromOrgToast:Active Org');
    hook.unmount();
  });

  it('shows memberRemovedToast on auth:forbidden-organization event when activeOrg has no name', async () => {
    mockUseActiveOrganization.mockReturnValue({
      data: null,
      isPending: false,
      refetch: mockRefetchActiveOrg,
    });
    mockUseListOrganizations.mockReturnValue({
      data: [],
      isPending: false,
      refetch: mockRefetchUserOrgs,
    });

    const { hook, queryClient } = renderAppLayoutHook();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('auth:forbidden-organization', {
          detail: { status: 403, message: 'FORBIDDEN_ORGANIZATION_ACCESS' },
        }),
      );
    });

    expect(mockSetActive).toHaveBeenCalledWith({ organizationId: null });
    expect(invalidateSpy).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('notifications.memberRemovedToast');
    hook.unmount();
  });

  it('cleans up auth:forbidden-organization event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { hook } = renderAppLayoutHook();

    hook.unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'auth:forbidden-organization',
      expect.any(Function),
    );
  });
});
