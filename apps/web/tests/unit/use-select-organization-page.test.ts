import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import type React from 'react';
import { renderHook, createTestQueryClient } from '../test-utils';
import { useSelectOrganizationPage } from '../../src/pages/select-organization/use-select-organization-page';
import { authClient } from '../../src/lib/auth-client';
import * as apiClient from '../../src/lib/api-client';
import { toast } from 'sonner';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

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

const mockUseSession = vi.fn();
const mockUseListOrganizations = vi.fn();
const mockRefetchUserOrgs = vi.fn();
const mockSetActive = vi.fn();
const mockCreateOrg = vi.fn();
const mockListUserInvitations = vi.fn();
const mockGetSession = vi.fn();
const mockSignOut = vi.fn();

vi.mock('../../src/lib/auth-client', () => ({
  authClient: {
    useSession: () => mockUseSession(),
    useListOrganizations: () => mockUseListOrganizations(),
    organization: {
      setActive: (args: unknown) => mockSetActive(args),
      create: (args: unknown) => mockCreateOrg(args),
      listUserInvitations: () => mockListUserInvitations(),
    },
    getSession: (args: unknown) => mockGetSession(args),
    signOut: () => mockSignOut(),
  },
}));

function createMockSubmitEvent(): React.SyntheticEvent<HTMLFormElement> {
  return {
    preventDefault: vi.fn(),
  } as unknown as React.SyntheticEvent<HTMLFormElement>;
}

describe('useSelectOrganizationPage Hook Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    mockRefetchUserOrgs.mockResolvedValue({});
    mockSetActive.mockResolvedValue({ data: {}, error: null });
    mockCreateOrg.mockResolvedValue({ data: { id: 'org-created-1' }, error: null });
    mockListUserInvitations.mockResolvedValue({ data: [], error: null });
    mockGetSession.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });
    mockSignOut.mockResolvedValue({});

    mockUseSession.mockReturnValue({
      data: { user: { id: 'u-1', name: 'John Doe', email: 'john@example.com' } },
      isPending: false,
    });

    mockUseListOrganizations.mockReturnValue({
      data: [
        { id: 'org-1', name: 'Workspace Alpha', slug: 'workspace-alpha' },
        { id: 'org-2', name: 'Workspace Beta', slug: 'workspace-beta' },
      ],
      isPending: false,
      refetch: mockRefetchUserOrgs,
    });

    vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
      user: {
        id: 'u-1',
        name: 'John Doe',
        email: 'john@example.com',
        members: [{ id: 'm-1', organizationId: 'org-1', role: 'member' }],
      },
    });
  });

  it('initializes with default modal states and handles open/close', () => {
    const hook = renderHook(() => useSelectOrganizationPage());

    expect(hook.current.isModalOpen).toBe(false);
    expect(hook.current.newOrgName).toBe('');
    expect(hook.current.selectedInvitation).toBeNull();
    expect(hook.current.isOwnerOfAnyOrg).toBe(false);
    expect(hook.current.organizations).toHaveLength(2);

    act(() => {
      hook.current.setIsModalOpen(true);
      hook.current.setNewOrgName('New Workspace');
    });

    expect(hook.current.isModalOpen).toBe(true);
    expect(hook.current.newOrgName).toBe('New Workspace');

    hook.unmount();
  });

  it('handleSelectOrg sets active organization, invalidates queries, and navigates to home', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const hook = renderHook(() => useSelectOrganizationPage(), queryClient);

    await act(async () => {
      await hook.current.handleSelectOrg('org-test-1');
    });

    expect(mockSetActive).toHaveBeenCalledWith({
      organizationId: 'org-test-1',
    });
    expect(mockGetSession).toHaveBeenCalledWith({
      query: { disableCookieCache: true },
    });
    expect(invalidateSpy).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    expect(hook.current.selectingOrgId).toBe('org-test-1');
    hook.unmount();
  });

  it('handleSelectOrg handles setActive error by displaying toast error and resetting selectingOrgId', async () => {
    mockSetActive.mockResolvedValueOnce({
      error: { message: 'Organization not found' },
    });

    const hook = renderHook(() => useSelectOrganizationPage());

    await act(async () => {
      await hook.current.handleSelectOrg('org-bad');
    });

    expect(toast.error).toHaveBeenCalledWith('settings.organizationSelectError');
    expect(hook.current.selectingOrgId).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handleSelectOrg handles exception thrown by setActive or getSession gracefully', async () => {
    mockSetActive.mockRejectedValueOnce(new Error('Network error'));

    const hook = renderHook(() => useSelectOrganizationPage());

    await act(async () => {
      await hook.current.handleSelectOrg('org-throw');
    });

    expect(toast.error).toHaveBeenCalledWith('settings.organizationSelectError');
    expect(hook.current.selectingOrgId).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handleCreateOrganization returns early when newOrgName is empty or only whitespace', async () => {
    const hook = renderHook(() => useSelectOrganizationPage());
    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleCreateOrganization(fakeEvent);
    });

    expect(mockCreateOrg).not.toHaveBeenCalled();

    act(() => {
      hook.current.setNewOrgName('   ');
    });

    await act(async () => {
      await hook.current.handleCreateOrganization(fakeEvent);
    });

    expect(mockCreateOrg).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handleCreateOrganization displays error toast if user is already an owner of any organization', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['current-user-profile'], {
      user: {
        id: 'u-1',
        members: [{ id: 'm-1', organizationId: 'org-1', role: 'owner' }],
      },
    });

    const hook = renderHook(() => useSelectOrganizationPage(), queryClient);

    act(() => {
      hook.current.setNewOrgName('Another Company');
    });

    const fakeEvent = createMockSubmitEvent();
    await act(async () => {
      await hook.current.handleCreateOrganization(fakeEvent);
    });

    expect(mockCreateOrg).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('selectOrg.ownerLimitReached');
    hook.unmount();
  });

  it('handleCreateOrganization successfully creates organization, sets active, invalidates queries, and navigates', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const hook = renderHook(() => useSelectOrganizationPage(), queryClient);

    act(() => {
      hook.current.setNewOrgName('Acme Innovation Inc');
      hook.current.setIsModalOpen(true);
    });

    const fakeEvent = createMockSubmitEvent();
    await act(async () => {
      await hook.current.handleCreateOrganization(fakeEvent);
    });

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(mockCreateOrg).toHaveBeenCalledWith({
      name: 'Acme Innovation Inc',
      slug: 'acme-innovation-inc',
    });
    expect(mockSetActive).toHaveBeenCalledWith({
      organizationId: 'org-created-1',
    });
    expect(mockGetSession).toHaveBeenCalledWith({
      query: { disableCookieCache: true },
    });
    expect(invalidateSpy).toHaveBeenCalled();
    expect(hook.current.isSubmitting).toBe(false);
    expect(hook.current.isModalOpen).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('settings.organizationCreated');
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    hook.unmount();
  });

  it('handleCreateOrganization handles creation failure when result contains error', async () => {
    mockCreateOrg.mockResolvedValueOnce({
      error: { message: 'Slug unavailable' },
      data: null,
    });

    const hook = renderHook(() => useSelectOrganizationPage());

    act(() => {
      hook.current.setNewOrgName('Conflict Organization');
    });

    const fakeEvent = createMockSubmitEvent();
    await act(async () => {
      await hook.current.handleCreateOrganization(fakeEvent);
    });

    expect(toast.error).toHaveBeenCalledWith('settings.organizationCreateError');
    expect(hook.current.isSubmitting).toBe(false);
    expect(mockSetActive).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handleCreateOrganization handles creation failure when result data is null without error', async () => {
    mockCreateOrg.mockResolvedValueOnce({
      error: null,
      data: null,
    });

    const hook = renderHook(() => useSelectOrganizationPage());

    act(() => {
      hook.current.setNewOrgName('Null Data Org');
    });

    const fakeEvent = createMockSubmitEvent();
    await act(async () => {
      await hook.current.handleCreateOrganization(fakeEvent);
    });

    expect(toast.error).toHaveBeenCalledWith('settings.organizationCreateError');
    expect(hook.current.isSubmitting).toBe(false);
    expect(mockSetActive).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('opens and closes invitation modal properly', () => {
    const hook = renderHook(() => useSelectOrganizationPage());

    const fakeInv = {
      id: 'inv-1',
      organizationId: 'org-2',
      organizationName: 'Invited Org',
      role: 'member',
      email: 'user@example.com',
    };

    act(() => {
      hook.current.openInvitationModal(fakeInv);
    });

    expect(hook.current.selectedInvitation).toEqual(fakeInv);

    act(() => {
      hook.current.closeInvitationModal();
    });

    expect(hook.current.selectedInvitation).toBeNull();
    hook.unmount();
  });

  it('handleModalAccepted invalidates queries, refetches orgs and invitations, and navigates to /', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const hook = renderHook(() => useSelectOrganizationPage(), queryClient);

    await act(async () => {
      await hook.current.handleModalAccepted('org-2');
    });

    expect(invalidateSpy).toHaveBeenCalled();
    expect(mockRefetchUserOrgs).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    hook.unmount();
  });

  it('handleModalDeclined invalidates queries and refetches invitations', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const hook = renderHook(() => useSelectOrganizationPage(), queryClient);

    await act(async () => {
      await hook.current.handleModalDeclined('inv-1');
    });

    expect(invalidateSpy).toHaveBeenCalled();
    hook.unmount();
  });

  it('handleSignOut clears query client, signs out via authClient, and navigates to /login', async () => {
    const queryClient = createTestQueryClient();
    const clearSpy = vi.spyOn(queryClient, 'clear');
    const hook = renderHook(() => useSelectOrganizationPage(), queryClient);

    await act(async () => {
      await hook.current.handleSignOut();
    });

    expect(clearSpy).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    hook.unmount();
  });

  it('correctly maps roleByOrgId and determines isOwnerOfAnyOrg as true when owner', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['current-user-profile'], {
      user: {
        id: 'u-1',
        members: [
          { id: 'm-1', organizationId: 'org-1', role: 'owner' },
          { id: 'm-2', organizationId: 'org-2', role: 'admin' },
        ],
      },
    });

    const hook = renderHook(() => useSelectOrganizationPage(), queryClient);

    expect(hook.current.isOwnerOfAnyOrg).toBe(true);
    expect(hook.current.roleByOrgId.get('org-1')).toBe('owner');
    expect(hook.current.roleByOrgId.get('org-2')).toBe('admin');
    hook.unmount();
  });

  it('determines isOwnerOfAnyOrg as false when memberships have no owner role', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['current-user-profile'], {
      user: {
        id: 'u-1',
        members: [{ id: 'm-2', organizationId: 'org-2', role: 'admin' }],
      },
    });

    const hook = renderHook(() => useSelectOrganizationPage(), queryClient);

    expect(hook.current.isOwnerOfAnyOrg).toBe(false);
    expect(hook.current.roleByOrgId.get('org-2')).toBe('admin');
    hook.unmount();
  });

  it('invitationsQuery queryFn returns user invitations on success and empty array on error', async () => {
    mockListUserInvitations.mockResolvedValueOnce({
      data: [
        {
          id: 'inv-1',
          organizationId: 'org-1',
          organizationName: 'Org 1',
          email: 'john@example.com',
          role: 'member',
          status: 'pending',
        },
      ],
      error: null,
    });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useSelectOrganizationPage(), queryClient);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(hook.current.invitations).toHaveLength(1);
    expect(hook.current.invitations[0].id).toBe('inv-1');
    hook.unmount();

    mockListUserInvitations.mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to fetch invitations' },
    });

    const queryClientError = createTestQueryClient();
    const hookError = renderHook(() => useSelectOrganizationPage(), queryClientError);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(hookError.current.invitations).toEqual([]);
    hookError.unmount();
  });

  it('handles empty organizations fallback when orgsQuery data is null', () => {
    mockUseListOrganizations.mockReturnValue({
      data: null,
      isPending: false,
    });

    const hook = renderHook(() => useSelectOrganizationPage());

    expect(hook.current.organizations).toEqual([]);
    hook.unmount();
  });

  it('profileQuery queryFn executes apiFetch for /api/v1/me', async () => {
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useSelectOrganizationPage(), queryClient);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/v1/me');
    hook.unmount();
  });
});
