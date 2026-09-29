import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { renderHook } from '../test-utils';
import { useItemsPage } from '../../src/pages/items/use-items-page';
import * as apiClient from '../../src/lib/api-client';
import { authClient } from '../../src/lib/auth-client';

vi.mock('../../src/lib/auth-client', () => ({
  authClient: {
    useActiveOrganization: vi.fn(),
  },
}));

describe('useItemsPage Hook Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: null,
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useActiveOrganization>);
  });

  it('initializes with default form values and handles modal state', () => {
    vi.spyOn(apiClient, 'apiFetch').mockResolvedValue([]);
    const hook = renderHook(() => useItemsPage());

    expect(hook.current.title).toBe('');
    expect(hook.current.description).toBe('');
    expect(hook.current.isModalOpen).toBe(false);
    expect(hook.current.itemToDeleteId).toBeNull();

    act(() => {
      hook.current.setIsModalOpen(true);
      hook.current.setTitle('My Test Item');
      hook.current.setDescription('My Test Description');
    });

    expect(hook.current.isModalOpen).toBe(true);
    expect(hook.current.title).toBe('My Test Item');
    expect(hook.current.description).toBe('My Test Description');

    hook.unmount();
  });

  it('handleCreate creates item via API and resets modal', async () => {
    const mockApi = vi.spyOn(apiClient, 'apiFetch').mockImplementation(async (_path, options) => {
      if (options?.method === 'POST') {
        return { id: 'item-1', title: 'Created Item' };
      }
      return [];
    });
    const hook = renderHook(() => useItemsPage());

    act(() => {
      hook.current.setTitle('Created Item');
      hook.current.setDescription('Created Description');
      hook.current.setIsModalOpen(true);
    });

    const fakeEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.SyntheticEvent<HTMLFormElement>;
    await act(async () => {
      await hook.current.handleCreate(fakeEvent);
    });

    expect(mockApi).toHaveBeenCalledWith(
      '/api/v1/items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'Created Item',
          description: 'Created Description',
          organizationId: undefined,
        }),
      }),
    );

    expect(hook.current.isModalOpen).toBe(false);
    expect(hook.current.title).toBe('');
    hook.unmount();
  });

  it('handleCreate returns early when title is empty or whitespace', async () => {
    const mockApi = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue([]);
    const hook = renderHook(() => useItemsPage());

    act(() => {
      hook.current.setTitle('   ');
    });

    const fakeEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.SyntheticEvent<HTMLFormElement>;
    await act(async () => {
      await hook.current.handleCreate(fakeEvent);
    });

    expect(mockApi).not.toHaveBeenCalledWith(
      '/api/v1/items',
      expect.objectContaining({ method: 'POST' }),
    );
    hook.unmount();
  });

  it('handles delete modal lifecycle and confirms deletion', async () => {
    const mockApi = vi.spyOn(apiClient, 'apiFetch').mockImplementation(async (_path, options) => {
      if (options?.method === 'DELETE') {
        return { success: true };
      }
      return [];
    });
    const hook = renderHook(() => useItemsPage());

    act(() => {
      hook.current.openDeleteModal('item-123');
    });

    expect(hook.current.itemToDeleteId).toBe('item-123');

    await act(async () => {
      await hook.current.handleConfirmDelete();
    });

    expect(mockApi).toHaveBeenCalledWith(
      '/api/v1/items/item-123',
      expect.objectContaining({
        method: 'DELETE',
      }),
    );
    expect(hook.current.itemToDeleteId).toBeNull();
    hook.unmount();
  });

  it('closeDeleteModal resets itemToDeleteId without calling delete API', () => {
    const mockApi = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue([]);
    const hook = renderHook(() => useItemsPage());

    act(() => {
      hook.current.openDeleteModal('item-456');
    });
    expect(hook.current.itemToDeleteId).toBe('item-456');

    act(() => {
      hook.current.closeDeleteModal();
    });
    expect(hook.current.itemToDeleteId).toBeNull();
    expect(mockApi).not.toHaveBeenCalledWith(
      '/api/v1/items/item-456',
      expect.objectContaining({ method: 'DELETE' }),
    );

    hook.unmount();
  });

  it('handleConfirmDelete returns early when itemToDeleteId is null', async () => {
    const mockApi = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue([]);
    const hook = renderHook(() => useItemsPage());

    await act(async () => {
      await hook.current.handleConfirmDelete();
    });

    expect(mockApi).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/items/'),
      expect.objectContaining({ method: 'DELETE' }),
    );
    hook.unmount();
  });

  it('handles item creation failure and deletion failure gracefully', async () => {
    vi.spyOn(apiClient, 'apiFetch').mockImplementation(async (_path, options) => {
      if (options?.method === 'POST' || options?.method === 'DELETE') {
        throw new Error('Action failed');
      }
      return [];
    });
    const hook = renderHook(() => useItemsPage());

    act(() => {
      hook.current.setTitle('Fail Item');
    });

    const fakeEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.SyntheticEvent<HTMLFormElement>;
    await act(async () => {
      await hook.current.handleCreate(fakeEvent);
    });

    act(() => {
      hook.current.openDeleteModal('fail-id');
    });

    await act(async () => {
      try {
        await hook.current.handleConfirmDelete();
      } catch {
        // Ignored
      }
    });

    expect(hook.current.itemToDeleteId).toBe('fail-id');
    hook.unmount();
  });

  it('queries items with organizationId when activeOrg is present and handles non-array', async () => {
    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: { id: 'org-test-99', name: 'Test Org', slug: 'test-org' },
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useActiveOrganization>);

    const mockApi = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({ notAnArray: true });
    const hook = renderHook(() => useItemsPage());

    expect(mockApi).toHaveBeenCalledWith('/api/v1/items?organizationId=org-test-99');

    await act(async () => {
      const res = await hook.current.handleRefresh();
      expect(res).toBeDefined();
    });

    expect(mockApi.mock.calls.length).toBeGreaterThanOrEqual(1);
    hook.unmount();
  });
});
