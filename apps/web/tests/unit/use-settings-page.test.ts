import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import type React from 'react';
import { renderHook, createTestQueryClient } from '../test-utils';
import { useSettingsPage, type OrgMemberItem } from '../../src/pages/settings/use-settings-page';
import { authClient } from '../../src/lib/auth-client';
import * as apiClient from '../../src/lib/api-client';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockNavigate = vi.fn();
let mockTabParam: string | undefined = undefined;

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ tab: mockTabParam }),
  };
});

const mockUseSession = vi.fn();
const mockUseActiveOrganization = vi.fn();
const mockUseListOrganizations = vi.fn();
const mockUseListPasskeys = vi.fn();
const mockRefetchPasskeys = vi.fn();
const mockListMembers = vi.fn();
const mockListInvitations = vi.fn();
const mockCreateOrg = vi.fn();
const mockSetActive = vi.fn();
const mockInviteMember = vi.fn();
const mockRemoveMember = vi.fn();
const mockCancelInvitation = vi.fn();
const mockAddPasskey = vi.fn();
const mockUpdatePasskey = vi.fn();
const mockDeletePasskey = vi.fn();

vi.mock('../../src/lib/auth-client', () => ({
  authClient: {
    useSession: () => mockUseSession(),
    useActiveOrganization: () => mockUseActiveOrganization(),
    useListOrganizations: () => mockUseListOrganizations(),
    useListPasskeys: () => mockUseListPasskeys(),
    organization: {
      listMembers: (args: unknown) => mockListMembers(args),
      listInvitations: (args: unknown) => mockListInvitations(args),
      create: (args: unknown) => mockCreateOrg(args),
      setActive: (args: unknown) => mockSetActive(args),
      inviteMember: (args: unknown) => mockInviteMember(args),
      removeMember: (args: unknown) => mockRemoveMember(args),
      cancelInvitation: (args: unknown) => mockCancelInvitation(args),
    },
    passkey: {
      addPasskey: (args: unknown) => mockAddPasskey(args),
      updatePasskey: (args: unknown) => mockUpdatePasskey(args),
      deletePasskey: (args: unknown) => mockDeletePasskey(args),
    },
  },
}));

function createMockSubmitEvent(): React.SyntheticEvent<HTMLFormElement> {
  return {
    preventDefault: vi.fn(),
  } as unknown as React.SyntheticEvent<HTMLFormElement>;
}

const mockCountriesData = [
  {
    code: 'MX',
    name: 'Mexico',
    timezones: [
      {
        id: 'tz-mx-1',
        ianaName: 'America/Mexico_City',
        displayName: 'Mexico City (GMT-06:00)',
        gmtOffset: 'GMT-06:00',
        countryCode: 'MX',
      },
    ],
  },
  {
    code: 'US',
    name: 'United States',
    timezones: [
      {
        id: 'tz-us-1',
        ianaName: 'America/New_York',
        displayName: 'New York (GMT-05:00)',
        gmtOffset: 'GMT-05:00',
        countryCode: 'US',
      },
    ],
  },
  {
    code: 'CA',
    name: 'Canada',
    timezones: [],
  },
];

describe('useSettingsPage Hook Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTabParam = undefined;

    mockRefetchPasskeys.mockResolvedValue({});
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u-1', email: 'user@example.com', name: 'Original Name' } },
      isPending: false,
    });

    mockUseActiveOrganization.mockReturnValue({
      data: { id: 'org-1', name: 'Active Org', slug: 'active-org' },
      isPending: false,
    });

    mockUseListOrganizations.mockReturnValue({
      data: [{ id: 'org-1', name: 'Active Org', slug: 'active-org' }],
      isPending: false,
    });

    mockUseListPasskeys.mockReturnValue({
      data: [{ id: 'pk-1', name: 'MacBook TouchID' }],
      isPending: false,
      error: null,
      refetch: mockRefetchPasskeys,
    });

    mockListMembers.mockResolvedValue({
      data: {
        members: [
          {
            id: 'mem-1',
            userId: 'u-1',
            role: 'owner',
            createdAt: '2026-01-01',
            user: { id: 'u-1', name: 'Original Name', email: 'user@example.com' },
          },
        ],
      },
      error: null,
    });

    mockListInvitations.mockResolvedValue({
      data: [
        {
          id: 'inv-1',
          email: 'pending@example.com',
          role: 'member',
          status: 'pending',
          expiresAt: '2026-12-31',
          organizationId: 'org-1',
        },
        {
          id: 'inv-2',
          email: 'accepted@example.com',
          role: 'member',
          status: 'accepted',
          expiresAt: '2026-12-31',
          organizationId: 'org-1',
        },
      ],
      error: null,
    });

    mockCreateOrg.mockResolvedValue({ data: { id: 'org-new-1' }, error: null });
    mockSetActive.mockResolvedValue({ data: {}, error: null });
    mockInviteMember.mockResolvedValue({ data: {}, error: null });
    mockRemoveMember.mockResolvedValue({ data: {}, error: null });
    mockCancelInvitation.mockResolvedValue({ data: {}, error: null });
    mockAddPasskey.mockResolvedValue({ data: {}, error: null });
    mockUpdatePasskey.mockResolvedValue({ data: {}, error: null });
    mockDeletePasskey.mockResolvedValue({ data: {}, error: null });

    vi.spyOn(apiClient, 'apiFetch').mockImplementation(async (path: string) => {
      if (path === '/api/v1/reference/countries') {
        return { countries: mockCountriesData };
      }
      if (path === '/api/v1/me') {
        return {
          user: {
            id: 'u-1',
            name: 'Original Name',
            email: 'user@example.com',
            countryCode: 'MX',
            timezoneId: 'tz-mx-1',
            country: mockCountriesData[0],
            timezone: mockCountriesData[0].timezones[0],
            members: [{ id: 'm-1', organizationId: 'org-1', role: 'owner' }],
          },
        };
      }
      if (path.startsWith('/api/v1/organizations/org-1/invitations')) {
        return {
          data: [],
          pagination: { total: 0, page: 1, pageSize: 10, totalPages: 1 },
        };
      }
      return {};
    });
  });

  it('initializes with default profile state and calculated permissions', async () => {
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useSettingsPage(), queryClient);

    expect(hook.current.email).toBe('user@example.com');
    expect(hook.current.activeOrg?.id).toBe('org-1');
    expect(hook.current.organizations).toHaveLength(1);
    expect(hook.current.passkeys).toHaveLength(1);
    expect(hook.current.isLoadingPasskeys).toBe(false);
    expect(hook.current.passkeysLoadError).toBe(false);
    expect(hook.current.isModalOpen).toBe(false);
    expect(hook.current.creatingOrg).toBe(false);
    expect(hook.current.activeTab).toBe('profile');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(hook.current.name).toBe('Original Name');
    expect(hook.current.countryCode).toBe('MX');
    expect(hook.current.isOwnerOfAnyOrg).toBe(true);
    expect(hook.current.canManageMembers).toBe(true);
    expect(hook.current.currentOrgRole).toBe('owner');
    hook.unmount();
  });

  it('calculates canManageMembers as true and currentOrgRole as admin when user is admin', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['current-user-profile'], {
      user: {
        id: 'u-1',
        name: 'Admin User',
        email: 'admin@example.com',
        members: [{ id: 'm-1', organizationId: 'org-1', role: 'admin' }],
      },
    });

    const hook = renderHook(() => useSettingsPage(), queryClient);

    expect(hook.current.isOwnerOfAnyOrg).toBe(false);
    expect(hook.current.canManageMembers).toBe(true);
    expect(hook.current.currentOrgRole).toBe('admin');
    hook.unmount();
  });

  it('calculates canManageMembers as false and currentOrgRole as member for regular member', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['current-user-profile'], {
      user: {
        id: 'u-1',
        name: 'Member User',
        email: 'member@example.com',
        members: [{ id: 'm-1', organizationId: 'org-1', role: 'member' }],
      },
    });

    const hook = renderHook(() => useSettingsPage(), queryClient);

    expect(hook.current.isOwnerOfAnyOrg).toBe(false);
    expect(hook.current.canManageMembers).toBe(false);
    expect(hook.current.currentOrgRole).toBe('member');
    hook.unmount();
  });

  it('handles email fallback from session user to profile user and to empty string', () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u-1', email: undefined } },
      isPending: false,
    });

    const queryClientWithProfile = createTestQueryClient();
    queryClientWithProfile.setQueryData(['current-user-profile'], {
      user: {
        id: 'u-1',
        email: 'profile-only@example.com',
      },
    });

    const hook1 = renderHook(() => useSettingsPage(), queryClientWithProfile);
    expect(hook1.current.email).toBe('profile-only@example.com');
    hook1.unmount();

    const queryClientEmpty = createTestQueryClient();
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    });
    const hook2 = renderHook(() => useSettingsPage(), queryClientEmpty);
    expect(hook2.current.email).toBe('');
    hook2.unmount();
  });

  it('updates form state via state setters', () => {
    const hook = renderHook(() => useSettingsPage());

    act(() => {
      hook.current.setName('Updated Name');
      hook.current.setCountryCode('US');
      hook.current.setNewOrgName('New Workspace');
      hook.current.setIsModalOpen(true);
      hook.current.setPasskeyName('Hardware Key');
      hook.current.setEditingPasskeyId('pk-1');
      hook.current.setEditingPasskeyName('Renamed Key');
      hook.current.setActiveTab('security');
      hook.current.setInviteEmail('colleague@example.com');
      hook.current.setInviteRole('admin');
      hook.current.setIsInviteModalOpen(true);
    });

    expect(hook.current.name).toBe('Updated Name');
    expect(hook.current.countryCode).toBe('US');
    expect(hook.current.newOrgName).toBe('New Workspace');
    expect(hook.current.isModalOpen).toBe(true);
    expect(hook.current.passkeyName).toBe('Hardware Key');
    expect(hook.current.editingPasskeyId).toBe('pk-1');
    expect(hook.current.editingPasskeyName).toBe('Renamed Key');
    expect(hook.current.activeTab).toBe('security');
    expect(hook.current.inviteEmail).toBe('colleague@example.com');
    expect(hook.current.inviteRole).toBe('admin');
    expect(hook.current.isInviteModalOpen).toBe(true);
    hook.unmount();
  });

  it('updates selected timezone when country code changes', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['reference-countries-full'], mockCountriesData);

    const hook = renderHook(() => useSettingsPage(), queryClient);

    act(() => {
      hook.current.setCountryCode('US');
    });

    expect(hook.current.selectedTimezone?.id).toBe('tz-us-1');

    act(() => {
      hook.current.setCountryCode('UNKNOWN');
    });

    expect(hook.current.selectedTimezone?.id).toBe('tz-mx-1');

    act(() => {
      hook.current.setCountryCode('CA');
    });

    hook.unmount();
  });

  it('handles update profile successfully, sends PATCH, and shows success toast', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['reference-countries-full'], mockCountriesData);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const hook = renderHook(() => useSettingsPage(), queryClient);

    act(() => {
      hook.current.setName('New Saved Name');
      hook.current.setCountryCode('US');
    });

    await act(async () => {
      hook.current.handleSaveProfile();
    });

    expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'New Saved Name',
        countryCode: 'US',
        timezoneId: 'tz-us-1',
      }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['current-user-profile'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['session'] });
    expect(toast.success).toHaveBeenCalledWith('settings.profileSaved');
    hook.unmount();
  });

  it('handles update profile failure and shows error toast', async () => {
    vi.spyOn(apiClient, 'apiFetch').mockImplementation(
      async (path: string, options?: RequestInit) => {
        if (path === '/api/v1/me' && options?.method === 'PATCH') {
          throw new Error('Save error');
        }
        return {};
      },
    );

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useSettingsPage(), queryClient);

    await act(async () => {
      hook.current.handleSaveProfile();
    });

    expect(toast.error).toHaveBeenCalledWith('settings.profileSaveError');
    hook.unmount();
  });

  it('handles add passkey with trimmed name and refetches list', async () => {
    const hook = renderHook(() => useSettingsPage());

    act(() => {
      hook.current.setPasskeyName('  Security Key USB  ');
    });

    await act(async () => {
      await hook.current.handleAddPasskey();
    });

    expect(mockAddPasskey).toHaveBeenCalledWith({ name: 'Security Key USB' });
    expect(mockRefetchPasskeys).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('settings.passkeyAdded');
    expect(hook.current.passkeyName).toBe('');
    hook.unmount();
  });

  it('handles add passkey with empty name falling back to undefined', async () => {
    const hook = renderHook(() => useSettingsPage());

    act(() => {
      hook.current.setPasskeyName('   ');
    });

    await act(async () => {
      await hook.current.handleAddPasskey();
    });

    expect(mockAddPasskey).toHaveBeenCalledWith({ name: undefined });
    hook.unmount();
  });

  it('shows error toast when add passkey returns error', async () => {
    mockAddPasskey.mockResolvedValue({ error: { message: 'WebAuthn cancelled' } });
    const hook = renderHook(() => useSettingsPage());

    await act(async () => {
      await hook.current.handleAddPasskey();
    });

    expect(toast.error).toHaveBeenCalledWith('settings.passkeyAddError');
    expect(mockRefetchPasskeys).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handles update passkey successfully and resets editing state', async () => {
    const hook = renderHook(() => useSettingsPage());

    act(() => {
      hook.current.setEditingPasskeyId('pk-1');
      hook.current.setEditingPasskeyName('  Renamed Key  ');
    });

    await act(async () => {
      await hook.current.handleUpdatePasskey();
    });

    expect(mockUpdatePasskey).toHaveBeenCalledWith({
      id: 'pk-1',
      name: 'Renamed Key',
    });
    expect(toast.success).toHaveBeenCalledWith('settings.passkeyUpdated');
    expect(hook.current.editingPasskeyId).toBeNull();
    expect(hook.current.editingPasskeyName).toBe('');
    expect(mockRefetchPasskeys).toHaveBeenCalled();
    hook.unmount();
  });

  it('handleUpdatePasskey returns early when passkey id or name is empty', async () => {
    const hook = renderHook(() => useSettingsPage());

    await act(async () => {
      await hook.current.handleUpdatePasskey();
    });
    expect(mockUpdatePasskey).not.toHaveBeenCalled();

    act(() => {
      hook.current.setEditingPasskeyId('pk-1');
      hook.current.setEditingPasskeyName('   ');
    });

    await act(async () => {
      await hook.current.handleUpdatePasskey();
    });
    expect(mockUpdatePasskey).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('shows error toast when update passkey fails', async () => {
    mockUpdatePasskey.mockResolvedValue({ error: { message: 'Rename failed' } });
    const hook = renderHook(() => useSettingsPage());

    act(() => {
      hook.current.setEditingPasskeyId('pk-1');
      hook.current.setEditingPasskeyName('New Name');
    });

    await act(async () => {
      await hook.current.handleUpdatePasskey();
    });

    expect(toast.error).toHaveBeenCalledWith('settings.passkeyUpdateError');
    hook.unmount();
  });

  it('handles delete passkey modal flow and confirms deletion', async () => {
    const hook = renderHook(() => useSettingsPage());

    act(() => {
      hook.current.openDeletePasskeyModal('pk-target-1');
    });
    expect(hook.current.passkeyToDeleteId).toBe('pk-target-1');

    act(() => {
      hook.current.closeDeletePasskeyModal();
    });
    expect(hook.current.passkeyToDeleteId).toBeNull();

    act(() => {
      hook.current.openDeletePasskeyModal('pk-target-1');
    });

    await act(async () => {
      await hook.current.handleConfirmDeletePasskey();
    });

    expect(mockDeletePasskey).toHaveBeenCalledWith({ id: 'pk-target-1' });
    expect(toast.success).toHaveBeenCalledWith('settings.passkeyDeleted');
    expect(hook.current.passkeyToDeleteId).toBeNull();
    expect(mockRefetchPasskeys).toHaveBeenCalled();
    hook.unmount();
  });

  it('handleConfirmDeletePasskey returns early when passkeyToDeleteId is null', async () => {
    const hook = renderHook(() => useSettingsPage());

    await act(async () => {
      await hook.current.handleConfirmDeletePasskey();
    });

    expect(mockDeletePasskey).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('shows error toast when confirm delete passkey fails', async () => {
    mockDeletePasskey.mockResolvedValue({ error: { message: 'Delete failed' } });
    const hook = renderHook(() => useSettingsPage());

    act(() => {
      hook.current.openDeletePasskeyModal('pk-error-1');
    });

    await act(async () => {
      await hook.current.handleConfirmDeletePasskey();
    });

    expect(toast.error).toHaveBeenCalledWith('settings.passkeyDeleteError');
    hook.unmount();
  });

  it('handles create organization successfully with slug and resets modal', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['current-user-profile'], {
      user: {
        id: 'u-1',
        members: [{ id: 'm-1', organizationId: 'org-1', role: 'member' }],
      },
    });

    const hook = renderHook(() => useSettingsPage(), queryClient);

    act(() => {
      hook.current.setNewOrgName('Acme & Beta Services');
      hook.current.setIsModalOpen(true);
    });

    const fakeEvent = createMockSubmitEvent();
    await act(async () => {
      await hook.current.handleCreateOrganization(fakeEvent);
    });

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(mockCreateOrg).toHaveBeenCalledWith({
      name: 'Acme & Beta Services',
      slug: 'acme-beta-services',
    });
    expect(toast.success).toHaveBeenCalledWith('settings.organizationCreated');
    expect(hook.current.newOrgName).toBe('');
    expect(hook.current.isModalOpen).toBe(false);
    expect(hook.current.creatingOrg).toBe(false);
    hook.unmount();
  });

  it('handleCreateOrganization returns early when org name is empty or whitespace', async () => {
    const hook = renderHook(() => useSettingsPage());
    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleCreateOrganization(fakeEvent);
    });

    expect(mockCreateOrg).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handleCreateOrganization prevents creation when user is already owner of an organization', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['current-user-profile'], {
      user: {
        id: 'u-1',
        members: [{ id: 'm-1', organizationId: 'org-1', role: 'owner' }],
      },
    });

    const hook = renderHook(() => useSettingsPage(), queryClient);

    act(() => {
      hook.current.setNewOrgName('Another Startup');
    });

    const fakeEvent = createMockSubmitEvent();
    await act(async () => {
      await hook.current.handleCreateOrganization(fakeEvent);
    });

    expect(mockCreateOrg).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('selectOrg.ownerLimitReached');
    hook.unmount();
  });

  it('handleCreateOrganization handles creation failure and shows error toast', async () => {
    mockCreateOrg.mockResolvedValue({ error: { message: 'Organization slug taken' } });

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['current-user-profile'], {
      user: {
        id: 'u-1',
        members: [],
      },
    });

    const hook = renderHook(() => useSettingsPage(), queryClient);

    act(() => {
      hook.current.setNewOrgName('Conflict Workspace');
    });

    const fakeEvent = createMockSubmitEvent();
    await act(async () => {
      await hook.current.handleCreateOrganization(fakeEvent);
    });

    expect(toast.error).toHaveBeenCalledWith('settings.organizationCreateError');
    expect(hook.current.creatingOrg).toBe(false);
    hook.unmount();
  });

  it('handleSelectOrg activates organization successfully and refetches related queries', async () => {
    const hook = renderHook(() => useSettingsPage());

    await act(async () => {
      await hook.current.handleSelectOrg('org-switch-target');
    });

    expect(mockSetActive).toHaveBeenCalledWith({
      organizationId: 'org-switch-target',
    });
    expect(toast.success).toHaveBeenCalledWith('settings.organizationSelected');
    hook.unmount();
  });

  it('handleSelectOrg shows error toast when setActive returns error', async () => {
    mockSetActive.mockResolvedValue({ error: { message: 'Organization not found' } });
    const hook = renderHook(() => useSettingsPage());

    await act(async () => {
      await hook.current.handleSelectOrg('org-fail');
    });

    expect(toast.error).toHaveBeenCalledWith('settings.organizationSelectError');
    hook.unmount();
  });

  it('handles member invitation flow successfully', async () => {
    const hook = renderHook(() => useSettingsPage());

    act(() => {
      hook.current.setInviteEmail('newmember@example.com');
      hook.current.setInviteRole('admin');
      hook.current.setIsInviteModalOpen(true);
    });

    const fakeEvent = createMockSubmitEvent();
    await act(async () => {
      await hook.current.handleInviteMember(fakeEvent);
    });

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(mockInviteMember).toHaveBeenCalledWith({
      email: 'newmember@example.com',
      role: 'admin',
      organizationId: 'org-1',
    });
    expect(toast.success).toHaveBeenCalledWith('settings.inviteSent');
    expect(hook.current.inviteEmail).toBe('');
    expect(hook.current.isInviteModalOpen).toBe(false);
    expect(hook.current.isInviting).toBe(false);
    hook.unmount();
  });

  it('handleInviteMember returns early when email is whitespace or active org is missing', async () => {
    const hook = renderHook(() => useSettingsPage());
    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleInviteMember(fakeEvent);
    });
    expect(mockInviteMember).not.toHaveBeenCalled();

    mockUseActiveOrganization.mockReturnValue({
      data: null,
      isPending: false,
    });
    const hookNoOrg = renderHook(() => useSettingsPage());
    act(() => {
      hookNoOrg.current.setInviteEmail('valid@example.com');
    });
    await act(async () => {
      await hookNoOrg.current.handleInviteMember(fakeEvent);
    });
    expect(mockInviteMember).not.toHaveBeenCalled();
    hookNoOrg.unmount();
    hook.unmount();
  });

  it('handleInviteMember shows error toast when inviteMember returns error', async () => {
    mockInviteMember.mockResolvedValue({ error: { message: 'Already invited' } });
    const hook = renderHook(() => useSettingsPage());

    act(() => {
      hook.current.setInviteEmail('error@example.com');
    });

    const fakeEvent = createMockSubmitEvent();
    await act(async () => {
      await hook.current.handleInviteMember(fakeEvent);
    });

    expect(toast.error).toHaveBeenCalledWith('settings.inviteError');
    expect(hook.current.isInviting).toBe(false);
    hook.unmount();
  });

  it('handles member removal modal flow and confirms removal', async () => {
    const hook = renderHook(() => useSettingsPage());

    const targetMember: OrgMemberItem = {
      id: 'mem-to-remove',
      userId: 'u-target',
      role: 'member',
      createdAt: '2026-01-01',
      user: {
        id: 'u-target',
        name: 'Target User',
        email: 'target@example.com',
      },
    };

    act(() => {
      hook.current.openRemoveMemberModal(targetMember);
    });
    expect(hook.current.memberToRemove).toEqual(targetMember);

    act(() => {
      hook.current.closeRemoveMemberModal();
    });
    expect(hook.current.memberToRemove).toBeNull();

    act(() => {
      hook.current.openRemoveMemberModal(targetMember);
    });

    await act(async () => {
      await hook.current.handleConfirmRemoveMember();
    });

    expect(mockRemoveMember).toHaveBeenCalledWith({
      memberIdOrEmail: 'mem-to-remove',
      organizationId: 'org-1',
    });
    expect(toast.success).toHaveBeenCalledWith('settings.memberRemoved');
    expect(hook.current.memberToRemove).toBeNull();
    expect(hook.current.isRemovingMember).toBe(false);
    hook.unmount();
  });

  it('handleConfirmRemoveMember returns early when memberToRemove or activeOrg is missing', async () => {
    const hook = renderHook(() => useSettingsPage());

    await act(async () => {
      await hook.current.handleConfirmRemoveMember();
    });
    expect(mockRemoveMember).not.toHaveBeenCalled();

    mockUseActiveOrganization.mockReturnValue({
      data: null,
      isPending: false,
    });
    const hookNoOrg = renderHook(() => useSettingsPage());
    act(() => {
      hookNoOrg.current.openRemoveMemberModal({
        id: 'mem-1',
        userId: 'u-1',
        role: 'member',
        createdAt: '2026-01-01',
        user: { id: 'u-1', email: 'test@example.com' },
      });
    });
    await act(async () => {
      await hookNoOrg.current.handleConfirmRemoveMember();
    });
    expect(mockRemoveMember).not.toHaveBeenCalled();
    hookNoOrg.unmount();
    hook.unmount();
  });

  it('shows error toast when confirm remove member returns error', async () => {
    mockRemoveMember.mockResolvedValue({ error: { message: 'Permission denied' } });
    const hook = renderHook(() => useSettingsPage());

    act(() => {
      hook.current.openRemoveMemberModal({
        id: 'mem-error',
        userId: 'u-error',
        role: 'member',
        createdAt: '2026-01-01',
        user: { id: 'u-error', email: 'error@example.com' },
      });
    });

    await act(async () => {
      await hook.current.handleConfirmRemoveMember();
    });

    expect(toast.error).toHaveBeenCalledWith('settings.removeMemberError');
    expect(hook.current.isRemovingMember).toBe(false);
    hook.unmount();
  });

  it('handles cancel invitation successfully and refetches sent invitations', async () => {
    const hook = renderHook(() => useSettingsPage());

    await act(async () => {
      await hook.current.handleCancelInvitation('inv-123');
    });

    expect(mockCancelInvitation).toHaveBeenCalledWith({
      invitationId: 'inv-123',
    });
    expect(toast.success).toHaveBeenCalledWith('settings.inviteCancelled');
    hook.unmount();
  });

  it('shows error toast when cancel invitation returns error', async () => {
    mockCancelInvitation.mockResolvedValue({ error: { message: 'Not found' } });
    const hook = renderHook(() => useSettingsPage());

    await act(async () => {
      await hook.current.handleCancelInvitation('inv-err');
    });

    expect(toast.error).toHaveBeenCalledWith('settings.inviteError');
    hook.unmount();
  });

  it('handles cancel invitation modal lifecycle and confirms cancellation', async () => {
    mockCancelInvitation.mockResolvedValue({ error: null });
    const hook = renderHook(() => useSettingsPage());

    const testInvitation = {
      id: 'inv-456',
      email: 'collaborator@example.com',
      role: 'member',
      status: 'pending',
      expiresAt: '2026-10-01',
      organizationId: 'org-test-1',
    };

    act(() => {
      hook.current.openCancelInvitationModal(testInvitation);
    });

    expect(hook.current.invitationToCancel).toEqual(testInvitation);

    await act(async () => {
      await hook.current.handleConfirmCancelInvitation();
    });

    expect(mockCancelInvitation).toHaveBeenCalledWith({
      invitationId: 'inv-456',
    });
    expect(toast.success).toHaveBeenCalledWith('settings.inviteCancelled');
    expect(hook.current.invitationToCancel).toBeNull();
    hook.unmount();
  });

  it('closeCancelInvitationModal resets modal state without calling cancel API', () => {
    const hook = renderHook(() => useSettingsPage());
    const testInvitation = {
      id: 'inv-789',
      email: 'user@example.com',
      role: 'member',
      status: 'pending',
      expiresAt: '2026-10-01',
      organizationId: 'org-test-1',
    };

    act(() => {
      hook.current.openCancelInvitationModal(testInvitation);
    });
    expect(hook.current.invitationToCancel).toEqual(testInvitation);

    act(() => {
      hook.current.closeCancelInvitationModal();
    });
    expect(hook.current.invitationToCancel).toBeNull();
    expect(mockCancelInvitation).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handleConfirmCancelInvitation returns early when invitationToCancel is null', async () => {
    const hook = renderHook(() => useSettingsPage());

    await act(async () => {
      await hook.current.handleConfirmCancelInvitation();
    });

    expect(mockCancelInvitation).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('shows error toast when confirm cancel invitation returns error', async () => {
    mockCancelInvitation.mockResolvedValue({ error: { message: 'Failed cancel' } });
    const hook = renderHook(() => useSettingsPage());
    const testInvitation = {
      id: 'inv-fail',
      email: 'fail@example.com',
      role: 'member',
      status: 'pending',
      expiresAt: '2026-10-01',
      organizationId: 'org-test-1',
    };

    act(() => {
      hook.current.openCancelInvitationModal(testInvitation);
    });

    await act(async () => {
      await hook.current.handleConfirmCancelInvitation();
    });

    expect(toast.error).toHaveBeenCalledWith('settings.inviteError');
    expect(hook.current.isCancellingInvitation).toBe(false);
    hook.unmount();
  });

  it('exercises membersQuery and sentInvitationsQuery query functions under edge cases', async () => {
    mockListMembers.mockResolvedValueOnce({ error: { message: 'Forbidden' }, data: null });
    mockListInvitations.mockResolvedValueOnce({ error: null, data: 'invalid-non-array' });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useSettingsPage(), queryClient);

    act(() => {
      hook.current.setActiveTab('organizations');
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(hook.current.members).toEqual([]);
    expect(hook.current.sentInvitations).toEqual([]);
    hook.unmount();
  });

  it('exercises queries when activeOrg id is absent', async () => {
    mockUseActiveOrganization.mockReturnValue({
      data: null,
      isPending: false,
    });
    mockUseListOrganizations.mockReturnValue({
      data: null,
      isPending: false,
    });
    mockUseListPasskeys.mockReturnValue({
      data: null,
      isPending: false,
      error: null,
      refetch: mockRefetchPasskeys,
    });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useSettingsPage(), queryClient);

    expect(hook.current.organizations).toEqual([]);
    expect(hook.current.passkeys).toEqual([]);
    expect(hook.current.members).toEqual([]);
    expect(hook.current.sentInvitations).toEqual([]);

    await act(async () => {
      mockSetActive.mockResolvedValueOnce({ data: {}, error: null });
      await hook.current.handleSelectOrg('org-target');
    });

    hook.unmount();
  });

  it('maps organization roles in roleByOrgId correctly', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['current-user-profile'], {
      user: {
        id: 'u-1',
        members: [
          { id: 'm-1', organizationId: 'org-1', role: 'owner' },
          { id: 'm-2', organizationId: 'org-2', role: 'member' },
        ],
      },
    });

    const hook = renderHook(() => useSettingsPage(), queryClient);

    expect(hook.current.roleByOrgId.get('org-1')).toBe('owner');
    expect(hook.current.roleByOrgId.get('org-2')).toBe('member');
    expect(hook.current.roleByOrgId.get('org-unknown')).toBeUndefined();
    hook.unmount();
  });

  it('initializes activeTab from router tab param and navigates on setActiveTab', () => {
    mockTabParam = 'organizations';
    const hook = renderHook(() => useSettingsPage());

    expect(hook.current.activeTab).toBe('organizations');

    act(() => {
      hook.current.setActiveTab('security');
    });

    expect(hook.current.activeTab).toBe('security');
    expect(mockNavigate).toHaveBeenCalledWith('/settings/security');

    act(() => {
      hook.current.setActiveTab('profile');
    });

    expect(hook.current.activeTab).toBe('profile');
    expect(mockNavigate).toHaveBeenCalledWith('/settings/profile');

    hook.unmount();
  });

  it('initializes activeTab to security when tab param is security', () => {
    mockTabParam = 'security';
    const hook = renderHook(() => useSettingsPage());

    expect(hook.current.activeTab).toBe('security');
    hook.unmount();
  });

  describe('Invitations history pagination and filtering', () => {
    function setupInvitationsTest() {
      mockTabParam = 'organizations';
      const queryClient = createTestQueryClient();
      queryClient.setQueryData(['current-user-profile'], {
        user: {
          id: 'u-1',
          name: 'Original Name',
          email: 'user@example.com',
          members: [{ id: 'm-1', organizationId: 'org-1', role: 'owner' }],
        },
      });
      return queryClient;
    }

    it('handleNextPage increments page when page < totalPages and does nothing when page === totalPages', () => {
      const queryClient = setupInvitationsTest();
      queryClient.setQueryData(['org-invitations-history', 'org-1', 1, 'all', 'desc'], {
        data: [],
        pagination: { total: 20, page: 1, pageSize: 10, totalPages: 2 },
      });
      queryClient.setQueryData(['org-invitations-history', 'org-1', 2, 'all', 'desc'], {
        data: [],
        pagination: { total: 20, page: 2, pageSize: 10, totalPages: 2 },
      });

      const hook = renderHook(() => useSettingsPage(), queryClient);

      expect(hook.current.invitationPage).toBe(1);
      expect(hook.current.invitationsPagination.totalPages).toBe(2);

      act(() => {
        hook.current.handleNextPage();
      });

      expect(hook.current.invitationPage).toBe(2);

      // When page === totalPages (2 === 2), handleNextPage should do nothing
      act(() => {
        hook.current.handleNextPage();
      });

      expect(hook.current.invitationPage).toBe(2);
      hook.unmount();
    });

    it('handleNextPage does nothing when initial totalPages is 1', () => {
      const queryClient = setupInvitationsTest();
      queryClient.setQueryData(['org-invitations-history', 'org-1', 1, 'all', 'desc'], {
        data: [],
        pagination: { total: 5, page: 1, pageSize: 10, totalPages: 1 },
      });

      const hook = renderHook(() => useSettingsPage(), queryClient);

      expect(hook.current.invitationPage).toBe(1);

      act(() => {
        hook.current.handleNextPage();
      });

      expect(hook.current.invitationPage).toBe(1);
      hook.unmount();
    });

    it('handlePrevPage decrements page when page > 1 and does nothing when page === 1', () => {
      const queryClient = setupInvitationsTest();
      queryClient.setQueryData(['org-invitations-history', 'org-1', 1, 'all', 'desc'], {
        data: [],
        pagination: { total: 20, page: 1, pageSize: 10, totalPages: 2 },
      });
      queryClient.setQueryData(['org-invitations-history', 'org-1', 2, 'all', 'desc'], {
        data: [],
        pagination: { total: 20, page: 2, pageSize: 10, totalPages: 2 },
      });

      const hook = renderHook(() => useSettingsPage(), queryClient);

      // Initially at page 1: handlePrevPage should do nothing
      expect(hook.current.invitationPage).toBe(1);
      act(() => {
        hook.current.handlePrevPage();
      });
      expect(hook.current.invitationPage).toBe(1);

      // Move to page 2 first
      act(() => {
        hook.current.handleNextPage();
      });
      expect(hook.current.invitationPage).toBe(2);

      // Decrement back to page 1
      act(() => {
        hook.current.handlePrevPage();
      });
      expect(hook.current.invitationPage).toBe(1);

      hook.unmount();
    });

    it('handleSetPage updates page when valid target page is provided', () => {
      const queryClient = setupInvitationsTest();
      queryClient.setQueryData(['org-invitations-history', 'org-1', 1, 'all', 'desc'], {
        data: [],
        pagination: { total: 30, page: 1, pageSize: 10, totalPages: 3 },
      });

      const hook = renderHook(() => useSettingsPage(), queryClient);

      expect(hook.current.invitationPage).toBe(1);

      act(() => {
        hook.current.handleSetPage(3);
      });

      expect(hook.current.invitationPage).toBe(3);

      act(() => {
        hook.current.handleSetPage(2);
      });

      expect(hook.current.invitationPage).toBe(2);

      hook.unmount();
    });

    it('handleSetPage ignores invalid target page numbers', () => {
      const queryClient = setupInvitationsTest();
      queryClient.setQueryData(['org-invitations-history', 'org-1', 1, 'all', 'desc'], {
        data: [],
        pagination: { total: 30, page: 1, pageSize: 10, totalPages: 3 },
      });

      const hook = renderHook(() => useSettingsPage(), queryClient);

      expect(hook.current.invitationPage).toBe(1);

      act(() => {
        hook.current.handleSetPage(0);
      });

      expect(hook.current.invitationPage).toBe(1);

      act(() => {
        hook.current.handleSetPage(-1);
      });

      expect(hook.current.invitationPage).toBe(1);

      act(() => {
        hook.current.handleSetPage(4);
      });

      expect(hook.current.invitationPage).toBe(1);

      hook.unmount();
    });

    it('handleStatusFilterChange updates status filter and resets invitationPage to 1', () => {
      const queryClient = setupInvitationsTest();
      queryClient.setQueryData(['org-invitations-history', 'org-1', 1, 'all', 'desc'], {
        data: [],
        pagination: { total: 20, page: 1, pageSize: 10, totalPages: 2 },
      });

      const hook = renderHook(() => useSettingsPage(), queryClient);

      act(() => {
        hook.current.handleNextPage();
      });
      expect(hook.current.invitationPage).toBe(2);

      act(() => {
        hook.current.handleStatusFilterChange('pending');
      });

      expect(hook.current.invitationStatusFilter).toBe('pending');
      expect(hook.current.invitationPage).toBe(1);

      act(() => {
        hook.current.handleStatusFilterChange('all');
      });

      expect(hook.current.invitationStatusFilter).toBe('all');
      expect(hook.current.invitationPage).toBe(1);
      hook.unmount();
    });

    it('handleSortOrderChange updates sort order and resets invitationPage to 1', () => {
      const queryClient = setupInvitationsTest();
      queryClient.setQueryData(['org-invitations-history', 'org-1', 1, 'all', 'desc'], {
        data: [],
        pagination: { total: 20, page: 1, pageSize: 10, totalPages: 2 },
      });

      const hook = renderHook(() => useSettingsPage(), queryClient);

      act(() => {
        hook.current.handleNextPage();
      });
      expect(hook.current.invitationPage).toBe(2);

      act(() => {
        hook.current.handleSortOrderChange('asc');
      });

      expect(hook.current.invitationSortOrder).toBe('asc');
      expect(hook.current.invitationPage).toBe(1);

      act(() => {
        hook.current.handleSortOrderChange('desc');
      });

      expect(hook.current.invitationSortOrder).toBe('desc');
      expect(hook.current.invitationPage).toBe(1);
      hook.unmount();
    });

    it('refetchInvitationsHistory calls query refetch and fetches latest invitations history', async () => {
      const queryClient = setupInvitationsTest();
      const hook = renderHook(() => useSettingsPage(), queryClient);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch');
      apiFetchSpy.mockClear();

      await act(async () => {
        await hook.current.refetchInvitationsHistory();
      });

      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/v1/organizations/org-1/invitations?page=1&pageSize=10&sortOrder=desc',
      );
      hook.unmount();
    });

    it('invitationsHistoryQuery queryFn executes when status filter is pending vs all', async () => {
      const queryClient = setupInvitationsTest();
      const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch');

      const hook = renderHook(() => useSettingsPage(), queryClient);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/v1/organizations/org-1/invitations?page=1&pageSize=10&sortOrder=desc',
      );

      apiFetchSpy.mockClear();

      await act(async () => {
        hook.current.handleStatusFilterChange('pending');
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/v1/organizations/org-1/invitations?page=1&pageSize=10&sortOrder=desc&status=pending',
      );

      hook.unmount();
    });
  });
});
