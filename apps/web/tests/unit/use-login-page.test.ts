import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import type React from 'react';
import { renderHook } from '../test-utils';
import { useLoginPage } from '../../src/pages/login/use-login-page';
import { authClient } from '../../src/lib/auth-client';
import { LOCALES } from '../../src/constants/locale.constants';

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockUseSession = vi.fn();
const mockSignInEmail = vi.fn();
const mockSignInPasskey = vi.fn();
const mockSignUpEmail = vi.fn();
const mockSendVerificationOtp = vi.fn();
const mockVerifyEmail = vi.fn();

vi.mock('../../src/lib/auth-client', () => ({
  authClient: {
    useSession: () => mockUseSession(),
    signIn: {
      email: (params: unknown) => mockSignInEmail(params),
      passkey: () => mockSignInPasskey(),
    },
    signUp: {
      email: (params: unknown, options: unknown) => mockSignUpEmail(params, options),
    },
    emailOtp: {
      sendVerificationOtp: (params: unknown, options: unknown) =>
        mockSendVerificationOtp(params, options),
      verifyEmail: (params: unknown) => mockVerifyEmail(params),
    },
  },
}));

const mockSetLocale = vi.fn();
let currentLocale = LOCALES.SPANISH as string;

vi.mock('../../src/stores/locale.store', () => ({
  useLocaleStore: () => ({
    locale: currentLocale,
    setLocale: (lang: string) => mockSetLocale(lang),
  }),
}));

function createMockSubmitEvent(): React.SyntheticEvent<HTMLFormElement> {
  return {
    preventDefault: vi.fn(),
  } as unknown as React.SyntheticEvent<HTMLFormElement>;
}

describe('useLoginPage Hook Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    mockSearchParams = new URLSearchParams();
    currentLocale = LOCALES.SPANISH;

    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    });

    mockSignInEmail.mockResolvedValue({ error: null });
    mockSignInPasskey.mockResolvedValue({ error: null });
    mockSignUpEmail.mockResolvedValue({ data: null, error: null });
    mockSendVerificationOtp.mockResolvedValue({ error: null });
    mockVerifyEmail.mockResolvedValue({ error: null });
  });

  it('initializes with default signin tab and empty state', () => {
    const hook = renderHook(() => useLoginPage());

    expect(hook.current.tab).toBe('signin');
    expect(hook.current.name).toBe('');
    expect(hook.current.email).toBe('');
    expect(hook.current.password).toBe('');
    expect(hook.current.otpCode).toBe('');
    expect(hook.current.showOtpStep).toBe(false);
    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBeNull();
    expect(hook.current.isUserAlreadyExistsError).toBe(false);
    expect(hook.current.successNotice).toBeNull();
    expect(hook.current.locale).toBe(LOCALES.SPANISH);
    hook.unmount();
  });

  it('allows updating fields directly via state setters', () => {
    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.setName('Alice');
      hook.current.setEmail('alice@example.com');
      hook.current.setPassword('Secret123!');
      hook.current.setOtpCode('123456');
      hook.current.setShowOtpStep(true);
      hook.current.setTab('signup');
    });

    expect(hook.current.name).toBe('Alice');
    expect(hook.current.email).toBe('alice@example.com');
    expect(hook.current.password).toBe('Secret123!');
    expect(hook.current.otpCode).toBe('123456');
    expect(hook.current.showOtpStep).toBe(true);
    expect(hook.current.tab).toBe('signup');
    hook.unmount();
  });

  it('redirects to home if user is already authenticated with emailVerified', () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u-1', emailVerified: true } },
      isPending: false,
    });

    const hook = renderHook(() => useLoginPage());

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    hook.unmount();
  });

  it('does not redirect if user is authenticated but emailVerified is false', () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u-1', emailVerified: false } },
      isPending: false,
    });

    const hook = renderHook(() => useLoginPage());

    expect(mockNavigate).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('sets success notice when verified=true is present in searchParams', () => {
    mockSearchParams = new URLSearchParams('verified=true');

    const hook = renderHook(() => useLoginPage());

    expect(hook.current.successNotice).toBe('auth.emailVerifiedSuccess');
    hook.unmount();
  });

  it('handles tab switching and resets notices and errors', () => {
    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.handleTabSelect('signup');
    });

    expect(hook.current.tab).toBe('signup');
    expect(hook.current.error).toBeNull();
    expect(hook.current.successNotice).toBeNull();
    expect(hook.current.isUserAlreadyExistsError).toBe(false);
    expect(hook.current.showOtpStep).toBe(false);

    act(() => {
      hook.current.handleSwitchToSignin();
    });

    expect(hook.current.tab).toBe('signin');
    expect(hook.current.error).toBeNull();
    expect(hook.current.isUserAlreadyExistsError).toBe(false);

    act(() => {
      hook.current.handleStartSignup();
    });

    expect(hook.current.tab).toBe('signup');
    expect(hook.current.showOtpStep).toBe(false);
    hook.unmount();
  });

  it('submits signin successfully and navigates to home', async () => {
    mockSignInEmail.mockResolvedValue({ error: null });

    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.setEmail('user@example.com');
      hook.current.setPassword('Secret123!');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleSubmit(fakeEvent);
    });

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(mockSignInEmail).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Secret123!',
    });
    expect(hook.current.loading).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith('/');
    hook.unmount();
  });

  it('handles signin failure with 401 error', async () => {
    mockSignInEmail.mockResolvedValue({
      error: { status: 401, message: 'Unauthorized' },
    });

    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.setEmail('user@example.com');
      hook.current.setPassword('WrongPass');
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

  it('handles signin failure with invalid email or password message', async () => {
    mockSignInEmail.mockResolvedValue({
      error: { message: 'Invalid email or password' },
    });

    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.setEmail('user@example.com');
      hook.current.setPassword('WrongPass');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleSubmit(fakeEvent);
    });

    expect(hook.current.error).toBe('auth.invalidCredentials');
    hook.unmount();
  });

  it.each([
    {
      description: 'user already exists message',
      errorMessage: 'User already exists in system',
      expectedError: 'auth.userAlreadyExists',
    },
    {
      description: 'email already in use message',
      errorMessage: 'This email is already in use',
      expectedError: 'auth.userAlreadyExists',
    },
    {
      description: 'custom error message',
      errorMessage: 'Account locked due to too many attempts',
      expectedError: 'Account locked due to too many attempts',
    },
    {
      description: 'empty error message',
      errorMessage: '',
      expectedError: 'auth.invalidCredentials',
    },
  ])('handles signin failure with ', async ({ errorMessage, expectedError }) => {
    mockSignInEmail.mockResolvedValue({
      error: { message: errorMessage },
    });

    const hook = renderHook(() => useLoginPage());
    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleSubmit(fakeEvent);
    });

    expect(hook.current.error).toBe(expectedError);
    hook.unmount();
  });

  it('handles signup flow when new user is created and triggers OTP verification', async () => {
    mockSignUpEmail.mockResolvedValue({
      data: { user: { id: 'u-1', emailVerified: false } },
      error: null,
    });
    mockSendVerificationOtp.mockResolvedValue({ error: null });

    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.handleTabSelect('signup');
      hook.current.setName('Bob Dylan');
      hook.current.setEmail('bob@example.com');
      hook.current.setPassword('Secret123!');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleSubmit(fakeEvent);
    });

    expect(mockSignUpEmail).toHaveBeenCalledWith(
      {
        name: 'Bob Dylan',
        email: 'bob@example.com',
        password: 'Secret123!',
      },
      {
        headers: {
          'x-app-locale': LOCALES.SPANISH,
        },
      },
    );
    expect(mockSendVerificationOtp).toHaveBeenCalledWith(
      {
        email: 'bob@example.com',
        type: 'email-verification',
      },
      {
        headers: {
          'x-app-locale': LOCALES.SPANISH,
        },
      },
    );
    expect(hook.current.successNotice).toBe('auth.emailVerificationSent');
    expect(hook.current.showOtpStep).toBe(true);
    expect(hook.current.loading).toBe(false);
    hook.unmount();
  });

  it('handles signup flow when user returned is already email verified', async () => {
    mockSignUpEmail.mockResolvedValue({
      data: { user: { id: 'u-1', emailVerified: true } },
      error: null,
    });

    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.handleTabSelect('signup');
      hook.current.setEmail('bob@example.com');
      hook.current.setPassword('Secret123!');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleSubmit(fakeEvent);
    });

    expect(hook.current.isUserAlreadyExistsError).toBe(true);
    expect(hook.current.loading).toBe(false);
    expect(mockSendVerificationOtp).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handles signup error with user_already_exists code', async () => {
    mockSignUpEmail.mockResolvedValue({
      data: null,
      error: { code: 'user_already_exists', message: 'User already exists' },
    });

    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.handleTabSelect('signup');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleSubmit(fakeEvent);
    });

    expect(hook.current.isUserAlreadyExistsError).toBe(true);
    expect(hook.current.loading).toBe(false);
    hook.unmount();
  });

  it('handles signup error with generic message', async () => {
    mockSignUpEmail.mockResolvedValue({
      data: null,
      error: { message: 'Password does not meet complexity' },
    });

    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.handleTabSelect('signup');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleSubmit(fakeEvent);
    });

    expect(hook.current.isUserAlreadyExistsError).toBe(false);
    expect(hook.current.error).toBe('Password does not meet complexity');
    expect(hook.current.loading).toBe(false);
    hook.unmount();
  });

  it('handles verify OTP returning early when otpCode is empty', async () => {
    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.setOtpCode('    ');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleVerifyOtp(fakeEvent);
    });

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(mockVerifyEmail).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handles verify OTP success', async () => {
    mockVerifyEmail.mockResolvedValue({ error: null });

    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.setEmail('bob@example.com');
      hook.current.setOtpCode('654321');
      hook.current.setShowOtpStep(true);
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleVerifyOtp(fakeEvent);
    });

    expect(mockVerifyEmail).toHaveBeenCalledWith({
      email: 'bob@example.com',
      otp: '654321',
    });
    expect(hook.current.loading).toBe(false);
    expect(hook.current.successNotice).toBe('auth.emailVerifiedSuccess');
    expect(hook.current.showOtpStep).toBe(false);
    expect(hook.current.tab).toBe('signin');
    hook.unmount();
  });

  it('handles verify OTP failure', async () => {
    mockVerifyEmail.mockResolvedValue({
      error: { message: 'Invalid OTP provided' },
    });

    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.setEmail('bob@example.com');
      hook.current.setOtpCode('000000');
    });

    const fakeEvent = createMockSubmitEvent();

    await act(async () => {
      await hook.current.handleVerifyOtp(fakeEvent);
    });

    expect(hook.current.error).toBe('auth.invalidOtp');
    expect(hook.current.loading).toBe(false);
    hook.unmount();
  });

  it('handles resend OTP success', async () => {
    mockSendVerificationOtp.mockResolvedValue({ error: null });

    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.setEmail('bob@example.com');
    });

    await act(async () => {
      await hook.current.handleResendOtp();
    });

    expect(mockSendVerificationOtp).toHaveBeenCalledWith(
      {
        email: 'bob@example.com',
        type: 'email-verification',
      },
      {
        headers: {
          'x-app-locale': LOCALES.SPANISH,
        },
      },
    );
    expect(hook.current.loading).toBe(false);
    expect(hook.current.successNotice).toBe('auth.emailVerificationSent');
    hook.unmount();
  });

  it('handles resend OTP failure', async () => {
    mockSendVerificationOtp.mockResolvedValue({
      error: { message: 'Too many requests' },
    });

    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.setEmail('bob@example.com');
    });

    await act(async () => {
      await hook.current.handleResendOtp();
    });

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('Too many requests');
    hook.unmount();
  });

  it('handles passkey signin success', async () => {
    mockSignInPasskey.mockResolvedValue({ error: null });

    const hook = renderHook(() => useLoginPage());

    await act(async () => {
      await hook.current.handlePasskeySignIn();
    });

    expect(mockSignInPasskey).toHaveBeenCalled();
    expect(hook.current.loading).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith('/');
    hook.unmount();
  });

  it('handles passkey signin failure', async () => {
    mockSignInPasskey.mockResolvedValue({
      error: { message: 'Passkey cancelled by user' },
    });

    const hook = renderHook(() => useLoginPage());

    await act(async () => {
      await hook.current.handlePasskeySignIn();
    });

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('Passkey cancelled by user');
    expect(mockNavigate).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('toggles language from Spanish to English', () => {
    currentLocale = LOCALES.SPANISH;
    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.handleLanguageToggle();
    });

    expect(mockSetLocale).toHaveBeenCalledWith(LOCALES.ENGLISH);
    hook.unmount();
  });

  it('toggles language from English to Spanish', () => {
    currentLocale = LOCALES.ENGLISH;
    const hook = renderHook(() => useLoginPage());

    act(() => {
      hook.current.handleLanguageToggle();
    });

    expect(mockSetLocale).toHaveBeenCalledWith(LOCALES.SPANISH);
    hook.unmount();
  });
});
