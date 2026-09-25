const BASE_URL = import.meta.env.VITE_API_URL || '';

export function getApiUrl(path: string): string {
  if (path.startsWith('http')) {
    return path;
  }
  return `${BASE_URL}${path}`;
}

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const url = getApiUrl(path);
  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `HTTP error ${response.status}`);
  }

  return response.json();
}
