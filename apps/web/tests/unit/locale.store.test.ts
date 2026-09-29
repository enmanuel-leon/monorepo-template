import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLocaleStore } from '../../src/stores/locale.store';
import { LOCALES } from '../../src/constants/locale.constants';

describe('Locale Store: useLocaleStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    useLocaleStore.setState({ locale: LOCALES.SPANISH });
  });

  it('initializes with default locale Spanish', () => {
    const state = useLocaleStore.getState();
    expect(state.locale).toBe(LOCALES.SPANISH);
  });

  it('updates locale to English when valid locale is passed', () => {
    const { setLocale } = useLocaleStore.getState();
    setLocale(LOCALES.ENGLISH);
    expect(useLocaleStore.getState().locale).toBe(LOCALES.ENGLISH);
    expect(localStorage.getItem('locale')).toBe(LOCALES.ENGLISH);
  });

  it('ignores invalid locale codes without modifying store', () => {
    const { setLocale } = useLocaleStore.getState();
    setLocale('fr');
    expect(useLocaleStore.getState().locale).toBe(LOCALES.SPANISH);
  });

  it('dispatches background sync fetch when syncWithBackend is true', () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { setLocale } = useLocaleStore.getState();
    setLocale(LOCALES.ENGLISH, true);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, fetchOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain('/api/v1/me');
    expect(fetchOptions.method).toBe('PATCH');
    expect(JSON.parse(fetchOptions.body as string)).toEqual({ locale: 'en' });
  });

  it('does not dispatch fetch when syncWithBackend is false or omitted', () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const { setLocale } = useLocaleStore.getState();
    setLocale(LOCALES.ENGLISH, false);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles fetch promise rejection in syncPreferenceToApi gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const { setLocale } = useLocaleStore.getState();
    expect(() => setLocale(LOCALES.ENGLISH, true)).not.toThrow();
  });

  it('handles synchronous fetch exception in syncPreferenceToApi gracefully', () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      throw new Error('Sync fail');
    });
    vi.stubGlobal('fetch', mockFetch);

    const { setLocale } = useLocaleStore.getState();
    expect(() => setLocale(LOCALES.ENGLISH, true)).not.toThrow();
  });

  it('initializes from localStorage when stored locale is English', async () => {
    localStorage.setItem('locale', LOCALES.ENGLISH);
    vi.resetModules();
    const { useLocaleStore: isolatedStore } = await import('../../src/stores/locale.store');
    expect(isolatedStore.getState().locale).toBe(LOCALES.ENGLISH);
  });

  it('initializes from localStorage when stored locale is Spanish', async () => {
    localStorage.setItem('locale', LOCALES.SPANISH);
    vi.resetModules();
    const { useLocaleStore: isolatedStore } = await import('../../src/stores/locale.store');
    expect(isolatedStore.getState().locale).toBe(LOCALES.SPANISH);
  });

  it('falls back to default locale when stored locale is invalid', async () => {
    localStorage.setItem('locale', 'invalid-locale');
    vi.resetModules();
    const { useLocaleStore: isolatedStore } = await import('../../src/stores/locale.store');
    expect(isolatedStore.getState().locale).toBe(LOCALES.SPANISH);
  });

  it('handles environment when localStorage is undefined', async () => {
    vi.stubGlobal('localStorage', undefined);
    vi.resetModules();
    const { useLocaleStore: isolatedStore } = await import('../../src/stores/locale.store');
    expect(isolatedStore.getState().locale).toBe(LOCALES.SPANISH);
    isolatedStore.getState().setLocale(LOCALES.ENGLISH);
  });
});
