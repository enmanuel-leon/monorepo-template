import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLocaleStore } from '../../src/stores/locale.store';
import { LOCALES } from '../../src/constants/locale.constants';

describe('Locale Store: useLocaleStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});
