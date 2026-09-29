const BASE_URL = import.meta.env.VITE_API_URL || '';

export function getApiUrl(path: string): string {
  if (path.startsWith('http')) {
    return path;
  }
  return `${BASE_URL}${path}`;
}

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const url = getApiUrl(path);

  const requestHeaders: Record<string, string> = {};
  if (init?.body !== undefined && init?.body !== null) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (init?.headers) {
    if (Array.isArray(init.headers)) {
      for (const [key, value] of init.headers) {
        requestHeaders[key] = value;
      }
    } else if (typeof (init.headers as Headers).forEach === 'function') {
      (init.headers as Headers).forEach((value, key) => {
        requestHeaders[key] = value;
      });
    } else {
      Object.assign(requestHeaders, init.headers);
    }
  }

  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: requestHeaders,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    let errorMessage = `HTTP error ${response.status}`;
    if (errorBody.message) {
      errorMessage = errorBody.message;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
