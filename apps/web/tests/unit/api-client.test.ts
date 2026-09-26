import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getApiUrl, apiFetch } from '../../src/lib/api-client';

describe('Frontend API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getApiUrl returns absolute URLs as-is', () => {
    const url = 'https://api.example.com/v1/health';
    expect(getApiUrl(url)).toBe(url);
  });

  it('getApiUrl returns relative path without modification when VITE_API_URL is empty', () => {
    const path = '/api/v1/me';
    expect(getApiUrl(path)).toBe('/api/v1/me');
  });

  it('apiFetch performs request with credentials include and returns JSON on success', async () => {
    const mockData = { id: 'user-1', name: 'Test User' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await apiFetch<typeof mockData>('/api/v1/me');

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    const fetchOptions = callArgs[1] as RequestInit;
    expect(fetchOptions.credentials).toBe('include');
    expect(fetchOptions.headers).toEqual({
      'Content-Type': 'application/json',
    });
  });

  it('apiFetch throws structured error when response status is not ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized session' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiFetch('/api/v1/me')).rejects.toThrow('Unauthorized session');
  });

  it('apiFetch throws fallback error when error response body cannot be parsed as JSON', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Not JSON');
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiFetch('/api/v1/items')).rejects.toThrow('HTTP error 500');
  });
});
