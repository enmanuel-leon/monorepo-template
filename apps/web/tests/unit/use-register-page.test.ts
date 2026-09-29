import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import type React from 'react';
import { renderHook } from '../test-utils';
import { useRegisterPage } from '../../src/pages/register/use-register-page';
import { authClient } from '../../src/lib/auth-client';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockUseSession = vi.fn();
const mockSignUpEmail = vi.fn();
const mockCreateOrg = vi.fn();

vi.mock('../../src/lib/auth-client', () => ({
  authClient: {
    useSession: () => mockUseSession(),
    signUp: {
      email: (params: unknown, options: unknown) => mockSignUpEmail(params, options),
    },
    organization: {
      create: (params: unknown) => mockCreateOrg(params),
    },
  },
}));

vi.mock('../../src/stores/locale.store', () => ({
  useLocaleStore: () => ({
    locale: 'es',
  }),
}));

function createMockSubmitEvent(): React.SyntheticEvent<HTMLFormElement> {
  return {
    preventDefault: vi.fn(),
  } as unknown as React.SyntheticEvent<HTMLFormElement>;
}

describe('useRegisterPage Hook Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    mockSignUpEmail.mockResolvedValue({ data: null, error: null });
    mockCreateOrg.mockResolvedValue({ data: null });
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    });
  });

  it('initializes with default empty values and not loading', () => {
    const hook = renderHook(() => useRegisterPage());

    expect(hook.current.name).toBe('');
    expect(hook.current.email).toBe('');
    expect(hook.current.password).toBe('');
    expect(hook.current.organizationName).toBe('');
    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBeNull();
    hook.unmount();
  });

  it('updates form field state values', () => {
    const hook = renderHook(() => useRegisterPage());

    act(() => {
      hook.current.setName('Alice Smith');
      hook.current.setEmail('alice@example.com');
      hook.current.setPassword('StrongPass123!');
      hook.current.setOrganizationName('Acme Global');
    });

    expect(hook.current.name).toBe('Alice Smith');
    expect(hook.current.email).toBe('alice@example.com');
    expect(hook.current.password).toBe('StrongPass123!');
    expect(hook.current.organizationName).toBe('Acme Global');
    hook.unmount();
  });

  it('redirects to home if user is already authenticated in session', () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u-1', email: 'alice@example.com' } },
      isPending: false,
    });

    const hook = renderHook(() => useRegisterPage());

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    hook.unmount();
  });

  it('does not redirect if session has no user', () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    });

    const hook = renderHook(() => useRegisterPage());

    expect(mockNavigate).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('rejects password that does not satisfy requirements and sets error', async () => {
    const hook = renderHook(() => useRegisterPage());

    act(() => {
      hook.current.setPassword('short');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleSubmit(fakeEvent);
    });

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(hook.current.error).toBe('auth.passwordRequirements');
    expect(hook.current.loading).toBe(false);
    expect(mockSignUpEmail).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('successfully registers without organization and navigates to home', async () => {
    mockSignUpEmail.mockResolvedValue({
      data: { user: { id: 'u-new-1' } },
      error: null,
    });

    const hook = renderHook(() => useRegisterPage());

    act(() => {
      hook.current.setName('Jane Doe');
      hook.current.setEmail('jane@example.com');
      hook.current.setPassword('SecurePassword123!');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleSubmit(fakeEvent);
    });

    expect(mockSignUpEmail).toHaveBeenCalledWith(
      {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'SecurePassword123!',
      },
      {
        headers: {
          'x-app-locale': 'es',
        },
      },
    );
    expect(mockCreateOrg).not.toHaveBeenCalled();
    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/');
    hook.unmount();
  });

  it('successfully registers with organization, creates org with slug, and navigates', async () => {
    mockSignUpEmail.mockResolvedValue({
      data: { user: { id: 'u-new-2' } },
      error: null,
    });
    mockCreateOrg.mockResolvedValue({ data: { id: 'org-created-1' } });

    const hook = renderHook(() => useRegisterPage());

    act(() => {
      hook.current.setName('Jane Doe');
      hook.current.setEmail('jane@example.com');
      hook.current.setPassword('SecurePassword123!');
      hook.current.setOrganizationName('Acme Corp & Co');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleSubmit(fakeEvent);
    });

    expect(mockCreateOrg).toHaveBeenCalledWith({
      name: 'Acme Corp & Co',
      slug: 'acme-corp-co',
    });
    expect(hook.current.loading).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith('/');
    hook.unmount();
  });

  it('does not create organization if organizationName is only whitespace', async () => {
    mockSignUpEmail.mockResolvedValue({
      data: { user: { id: 'u-new-3' } },
      error: null,
    });

    const hook = renderHook(() => useRegisterPage());

    act(() => {
      hook.current.setName('Jane Doe');
      hook.current.setEmail('jane@example.com');
      hook.current.setPassword('SecurePassword123!');
      hook.current.setOrganizationName('     ');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleSubmit(fakeEvent);
    });

    expect(mockCreateOrg).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
    hook.unmount();
  });

  it('does not create organization if signUpData.user is null despite org name provided', async () => {
    mockSignUpEmail.mockResolvedValue({
      data: null,
      error: null,
    });

    const hook = renderHook(() => useRegisterPage());

    act(() => {
      hook.current.setName('Jane Doe');
      hook.current.setEmail('jane@example.com');
      hook.current.setPassword('SecurePassword123!');
      hook.current.setOrganizationName('Acme Corp');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleSubmit(fakeEvent);
    });

    expect(mockCreateOrg).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
    hook.unmount();
  });

  it('handles 401 error with auth.invalidCredentials', async () => {
    mockSignUpEmail.mockResolvedValue({
      data: null,
      error: { status: 401, message: 'Unauthorized' },
    });

    const hook = renderHook(() => useRegisterPage());

    act(() => {
      hook.current.setPassword('SecurePassword123!');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleSubmit(fakeEvent);
    });

    expect(hook.current.error).toBe('auth.invalidCredentials');
    expect(hook.current.loading).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
    hook.unmount();
  });

  it.each([
    {
      description: 'invalid email or password message',
      errorMessage: 'Invalid email or password',
      expectedError: 'auth.invalidCredentials',
    },
    {
      description: 'custom error message from backend',
      errorMessage: 'Domain not allowed for registration',
      expectedError: 'Domain not allowed for registration',
    },
    {
      description: 'empty error message fallback',
      errorMessage: '',
      expectedError: 'auth.invalidCredentials',
    },
  ])('handles signup error with ', async ({ errorMessage, expectedError }) => {
    mockSignUpEmail.mockResolvedValue({
      data: null,
      error: { message: errorMessage },
    });

    const hook = renderHook(() => useRegisterPage());

    act(() => {
      hook.current.setPassword('SecurePassword123!');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleSubmit(fakeEvent);
    });

    expect(hook.current.error).toBe(expectedError);
    expect(hook.current.loading).toBe(false);
    hook.unmount();
  });
});
