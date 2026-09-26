import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { renderHook } from '../test-utils';
import { useItemsPage } from '../../src/pages/items/use-items-page';
import * as apiClient from '../../src/lib/api-client';

describe('useItemsPage Hook Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default form values and handles modal state', () => {
    vi.spyOn(apiClient, 'apiFetch').mockResolvedValue([]);
    const hook = renderHook(() => useItemsPage());

    expect(hook.current.title).toBe('');
    expect(hook.current.description).toBe('');
    expect(hook.current.isModalOpen).toBe(false);

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
    const mockPost = vi
      .spyOn(apiClient, 'apiFetch')
      .mockResolvedValue({ id: 'item-1', title: 'New Item' });
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

    expect(mockPost).toHaveBeenCalledWith(
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

  it('handleDelete calls DELETE /api/v1/items/:id', async () => {
    const mockDelete = vi.spyOn(apiClient, 'apiFetch').mockResolvedValue({ success: true });
    const hook = renderHook(() => useItemsPage());

    await act(async () => {
      await hook.current.handleDelete('item-123');
    });

    expect(mockDelete).toHaveBeenCalledWith(
      '/api/v1/items/item-123',
      expect.objectContaining({
        method: 'DELETE',
      }),
    );
    hook.unmount();
  });
});
