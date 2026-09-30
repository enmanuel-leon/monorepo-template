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

  it('apiFetch omits Content-Type header when body is not provided', async () => {
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
    expect(fetchOptions.headers).toEqual({});
  });

  it('apiFetch sets Content-Type application/json when body is provided', async () => {
    const mockCreated = { id: 'item-1', title: 'New Item' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => mockCreated,
    });
    vi.stubGlobal('fetch', mockFetch);

    const bodyPayload = JSON.stringify({ title: 'New Item' });
    const result = await apiFetch('/api/v1/items', {
      method: 'POST',
      body: bodyPayload,
    });

    expect(result).toEqual(mockCreated);
    const callArgs = mockFetch.mock.calls[0];
    const fetchOptions = callArgs[1] as RequestInit;
    expect(fetchOptions.headers).toEqual({
      'Content-Type': 'application/json',
    });
  });

  it('apiFetch preserves and merges custom headers (Headers instance, Array, Record)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const headersInstance = new Headers();
    headersInstance.set('X-Custom-One', 'value-1');

    await apiFetch('/api/v1/items', {
      headers: headersInstance,
    });

    const call1 = mockFetch.mock.calls[0][1] as RequestInit;
    expect((call1.headers as Record<string, string>)['X-Custom-One']).toBe('value-1');

    await apiFetch('/api/v1/items', {
      headers: [['X-Custom-Two', 'value-2']],
    });

    const call2 = mockFetch.mock.calls[1][1] as RequestInit;
    expect((call2.headers as Record<string, string>)['X-Custom-Two']).toBe('value-2');

    await apiFetch('/api/v1/items', {
      headers: { 'X-Custom-Three': 'value-3' },
    });

    const call3 = mockFetch.mock.calls[2][1] as RequestInit;
    expect((call3.headers as Record<string, string>)['X-Custom-Three']).toBe('value-3');
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

  it('does not dispatch auth:forbidden-organization event on regular 403 without FORBIDDEN_ORGANIZATION_ACCESS', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Access denied' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiFetch('/api/v1/items')).rejects.toThrow('Access denied');
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('dispatches auth:forbidden-organization event when errorMessage contains FORBIDDEN_ORGANIZATION_ACCESS', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'FORBIDDEN_ORGANIZATION_ACCESS' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiFetch('/api/v1/items')).rejects.toThrow('FORBIDDEN_ORGANIZATION_ACCESS');
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth:forbidden-organization',
        detail: { status: 400, message: 'FORBIDDEN_ORGANIZATION_ACCESS' },
      }),
    );
  });

  it('dispatches auth:forbidden-organization when nested error has code FORBIDDEN_ORGANIZATION_ACCESS', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          code: 'FORBIDDEN_ORGANIZATION_ACCESS',
          message: 'You are not a member of the specified organization.',
          statusCode: 403,
        },
        code: 'FORBIDDEN_ORGANIZATION_ACCESS',
        message: 'You are not a member of the specified organization.',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiFetch('/api/v1/items')).rejects.toThrow(
      'You are not a member of the specified organization.',
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth:forbidden-organization',
        detail: {
          status: 403,
          message: 'You are not a member of the specified organization.',
          code: 'FORBIDDEN_ORGANIZATION_ACCESS',
        },
      }),
    );
  });

  it('dispatches auth:forbidden-organization on 403 with membership error message in nested error object', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          code: 'FORBIDDEN',
          message: 'You are not a member of the specified organization.',
          statusCode: 403,
        },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiFetch('/api/v1/items')).rejects.toThrow(
      'You are not a member of the specified organization.',
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth:forbidden-organization',
        detail: {
          status: 403,
          message: 'You are not a member of the specified organization.',
          code: 'FORBIDDEN',
        },
      }),
    );
  });
});
