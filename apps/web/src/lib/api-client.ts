const BASE_URL = import.meta.env.VITE_API_URL || '';

export function getApiUrl(path: string): string {
  if (path.startsWith('http')) {
    return path;
  }
  return `${BASE_URL}${path}`;
}

function buildRequestHeaders(init?: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {};
  if (init?.body !== undefined && init?.body !== null) {
    headers['Content-Type'] = 'application/json';
  }
  if (init?.headers) {
    if (Array.isArray(init.headers)) {
      for (const [key, value] of init.headers) {
        headers[key] = value;
      }
    } else if (typeof (init.headers as Headers).forEach === 'function') {
      (init.headers as Headers).forEach((value, key) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, init.headers);
    }
  }
  return headers;
}

function extractNestedDetails(errorObj: unknown): { nestedCode?: string; nestedMessage?: string } {
  if (!errorObj || typeof errorObj !== 'object') {
    return {};
  }
  const nested = errorObj as Record<string, unknown>;
  let nestedCode: string | undefined = undefined;
  let nestedMessage: string | undefined = undefined;

  if (typeof nested.code === 'string') {
    nestedCode = nested.code;
  }
  if (typeof nested.message === 'string') {
    nestedMessage = nested.message;
  }
  return { nestedCode, nestedMessage };
}

function extractErrorDetails(
  errorBody: unknown,
  status: number,
): { message: string; code?: string } {
  if (!errorBody || typeof errorBody !== 'object') {
    return { message: `HTTP error ${status}` };
  }

  const payload = errorBody as Record<string, unknown>;
  let message = `HTTP error ${status}`;
  let code: string | undefined = undefined;

  if (typeof payload.code === 'string') {
    code = payload.code;
  }
  if (typeof payload.message === 'string') {
    message = payload.message;
  }

  const { nestedCode, nestedMessage } = extractNestedDetails(payload.error);
  if (!code && nestedCode) {
    code = nestedCode;
  }
  if (nestedMessage) {
    message = nestedMessage;
  }

  return { message, code };
}

function isForbiddenOrganization(status: number, message: string, code?: string): boolean {
  if (code === 'FORBIDDEN_ORGANIZATION_ACCESS') {
    return true;
  }
  if (message.includes('FORBIDDEN_ORGANIZATION_ACCESS')) {
    return true;
  }
  if (
    status === 403 &&
    message.toLowerCase().includes('not a member of the specified organization')
  ) {
    return true;
  }
  return false;
}

function notifyForbiddenOrganization(status: number, message: string, code?: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (isForbiddenOrganization(status, message, code)) {
    const detail: { status: number; message: string; code?: string } = { status, message };
    if (code !== undefined) {
      detail.code = code;
    }
    window.dispatchEvent(
      new CustomEvent('auth:forbidden-organization', {
        detail,
      }),
    );
  }
}

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const url = getApiUrl(path);
  const requestHeaders = buildRequestHeaders(init);

  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: requestHeaders,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const { message, code } = extractErrorDetails(errorBody, response.status);
    notifyForbiddenOrganization(response.status, message, code);
    throw new Error(message);
  }

  return response.json();
}
