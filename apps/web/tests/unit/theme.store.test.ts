import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useThemeStore } from '../../src/stores/theme.store';
import { THEMES } from '../../src/constants/theme.constants';

describe('Theme Store: useThemeStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useThemeStore.setState({ theme: THEMES.DARK });
  });

  it('initializes with default dark theme', () => {
    const state = useThemeStore.getState();
    expect(state.theme).toBe(THEMES.DARK);
  });

  it('updates theme to light via setTheme', () => {
    const { setTheme } = useThemeStore.getState();
    setTheme(THEMES.LIGHT);
    expect(useThemeStore.getState().theme).toBe(THEMES.LIGHT);
  });

  it('toggles theme alternatively from dark to light and back to dark', () => {
    const { toggleTheme } = useThemeStore.getState();

    toggleTheme();
    expect(useThemeStore.getState().theme).toBe(THEMES.LIGHT);

    toggleTheme();
    expect(useThemeStore.getState().theme).toBe(THEMES.DARK);
  });

  it('syncs theme change to background API when syncWithBackend is true', () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { toggleTheme } = useThemeStore.getState();
    toggleTheme(true);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, fetchOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain('/api/v1/me');
    expect(fetchOptions.method).toBe('PATCH');
    expect(JSON.parse(fetchOptions.body as string)).toEqual({ theme: 'light' });
  });
});
