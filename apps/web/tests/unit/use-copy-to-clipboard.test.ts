import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { renderHook } from '../test-utils';
import { useCopyToClipboard } from '../../src/hooks/use-copy-to-clipboard';

describe('useCopyToClipboard Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with isCopied false', () => {
    const hook = renderHook(() => useCopyToClipboard());
    expect(hook.current.isCopied).toBe(false);
    expect(typeof hook.current.copyToClipboard).toBe('function');
    hook.unmount();
  });

  it('returns false and triggers error toast when navigator.clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    const hook = renderHook(() => useCopyToClipboard());
    let success = true;
    await act(async () => {
      success = await hook.current.copyToClipboard('test-text');
    });
    expect(success).toBe(false);
    hook.unmount();
  });

  it('copies text using navigator.clipboard.writeText and updates isCopied', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const hook = renderHook(() => useCopyToClipboard());
    let success = false;
    await act(async () => {
      success = await hook.current.copyToClipboard('sample-text');
    });

    expect(success).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('sample-text');
    expect(hook.current.isCopied).toBe(true);
    hook.unmount();
  });
});
