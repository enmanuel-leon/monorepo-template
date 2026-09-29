import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useThemeStore } from '../../src/stores/theme.store';
import { THEMES } from '../../src/constants/theme.constants';

describe('Theme Store: useThemeStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    useThemeStore.setState({ theme: THEMES.DARK });
  });

  it('initializes with default dark theme', () => {
    const state = useThemeStore.getState();
    expect(state.theme).toBe(THEMES.DARK);
  });

  it('updates theme to light via setTheme without backend sync', () => {
    const { setTheme } = useThemeStore.getState();
    setTheme(THEMES.LIGHT);
    expect(useThemeStore.getState().theme).toBe(THEMES.LIGHT);
    expect(localStorage.getItem('theme')).toBe(THEMES.LIGHT);
  });

  it('updates theme to light via setTheme with backend sync', () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { setTheme } = useThemeStore.getState();
    setTheme(THEMES.LIGHT, true);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, fetchOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain('/api/v1/me');
    expect(fetchOptions.method).toBe('PATCH');
    expect(JSON.parse(fetchOptions.body as string)).toEqual({ theme: 'light' });
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

  it('handles fetch promise rejection in syncPreferenceToApi gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const { setTheme } = useThemeStore.getState();
    expect(() => setTheme(THEMES.LIGHT, true)).not.toThrow();
  });

  it('handles synchronous fetch exception in syncPreferenceToApi gracefully', () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      throw new Error('Sync fail');
    });
    vi.stubGlobal('fetch', mockFetch);

    const { setTheme } = useThemeStore.getState();
    expect(() => setTheme(THEMES.LIGHT, true)).not.toThrow();
  });

  it('initializes from localStorage when stored theme is light', async () => {
    localStorage.setItem('theme', THEMES.LIGHT);
    vi.resetModules();
    const { useThemeStore: isolatedStore } = await import('../../src/stores/theme.store');
    expect(isolatedStore.getState().theme).toBe(THEMES.LIGHT);
  });

  it('initializes from localStorage when stored theme is dark', async () => {
    localStorage.setItem('theme', THEMES.DARK);
    vi.resetModules();
    const { useThemeStore: isolatedStore } = await import('../../src/stores/theme.store');
    expect(isolatedStore.getState().theme).toBe(THEMES.DARK);
  });

  it('falls back to default dark theme when stored theme is invalid', async () => {
    localStorage.setItem('theme', 'invalid-theme');
    vi.resetModules();
    const { useThemeStore: isolatedStore } = await import('../../src/stores/theme.store');
    expect(isolatedStore.getState().theme).toBe(THEMES.DARK);
  });

  it('handles environment when localStorage is undefined', async () => {
    vi.stubGlobal('localStorage', undefined);
    vi.resetModules();
    const { useThemeStore: isolatedStore } = await import('../../src/stores/theme.store');
    expect(isolatedStore.getState().theme).toBe(THEMES.DARK);
    isolatedStore.getState().setTheme(THEMES.LIGHT);
    isolatedStore.getState().toggleTheme();
  });

  it('handles environment when document is undefined', async () => {
    vi.stubGlobal('document', undefined);
    vi.resetModules();
    const { useThemeStore: isolatedStore } = await import('../../src/stores/theme.store');
    expect(isolatedStore.getState().theme).toBe(THEMES.DARK);
    isolatedStore.getState().setTheme(THEMES.LIGHT);
  });
});
