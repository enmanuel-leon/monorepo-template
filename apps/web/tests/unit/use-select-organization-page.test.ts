import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { renderHook } from '../test-utils';
import { useSelectOrganizationPage } from '../../src/pages/select-organization/use-select-organization-page';
import { authClient } from '../../src/lib/auth-client';
import * as apiClient from '../../src/lib/api-client';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../src/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(() => ({ data: { user: { id: 'u-1' } }, isPending: false })),
    useListOrganizations: vi.fn(() => ({ data: [], isPending: false, refetch: vi.fn() })),
    organization: {
      setActive: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ data: { id: 'org-created-1' } }),
      listUserInvitations: vi.fn().mockResolvedValue({ data: [] }),
    },
    getSession: vi.fn().mockResolvedValue({}),
    signOut: vi.fn().mockResolvedValue({}),
  },
}));

describe('useSelectOrganizationPage Hook Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('initializes with default modal states and handles open/close', () => {
    vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({
      user: {
        id: 'u-1',
        members: [{ id: 'm-1', organizationId: 'org-1', role: 'member' }],
      },
    });

    const hook = renderHook(() => useSelectOrganizationPage());

    expect(hook.current.isModalOpen).toBe(false);
    expect(hook.current.newOrgName).toBe('');
    expect(hook.current.selectedInvitation).toBeNull();
    expect(hook.current.isOwnerOfAnyOrg).toBe(false);

    act(() => {
      hook.current.setIsModalOpen(true);
      hook.current.setNewOrgName('New Workspace');
    });

    expect(hook.current.isModalOpen).toBe(true);
    expect(hook.current.newOrgName).toBe('New Workspace');

    hook.unmount();
  });

  it('handleSelectOrg sets active organization and navigates to home', async () => {
    vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({ user: { id: 'u-1', members: [] } });

    const hook = renderHook(() => useSelectOrganizationPage());

    await act(async () => {
      await hook.current.handleSelectOrg('org-test-1');
    });

    expect(authClient.organization.setActive).toHaveBeenCalledWith({
      organizationId: 'org-test-1',
    });
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    hook.unmount();
  });

  it('opens and closes invitation modal properly', () => {
    vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({ user: { id: 'u-1', members: [] } });
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
});
