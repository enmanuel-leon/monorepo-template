import { useState, useEffect, type SyntheticEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authClient } from '../../lib/auth-client';
import { useLocaleStore } from '../../stores/locale.store';
import { LOCALES } from '../../constants/locale.constants';

function navigateToHome(navigate: (path: string) => void): void {
  if (typeof window !== 'undefined' && window.location && process.env.NODE_ENV !== 'test') {
    window.location.href = '/';
  } else {
    navigate('/');
  }
}

export function useLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const session = authClient.useSession();
  const { locale, setLocale } = useLocaleStore();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUserAlreadyExistsError, setIsUserAlreadyExistsError] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (session.data?.user?.emailVerified) {
      navigate('/', { replace: true });
    }
  }, [session.data?.user, navigate]);

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setSuccessNotice(t('auth.emailVerifiedSuccess'));
    }
  }, [searchParams, t]);

  function normalizeErrorMessage(err: { message?: string; status?: number } | null): string {
    if (!err) {
      return t('auth.invalidCredentials');
    }
    const rawMsg = (err.message || '').toLowerCase();
    if (
      rawMsg.includes('already exists') ||
      rawMsg.includes('already in use') ||
      rawMsg.includes('user already')
    ) {
      return t('auth.userAlreadyExists');
    }
    if (rawMsg.includes('invalid email or password') || err.status === 401) {
      return t('auth.invalidCredentials');
    }
    return err.message || t('auth.invalidCredentials');
  }

  function handleTabSelect(newTab: 'signin' | 'signup') {
    setError(null);
    setSuccessNotice(null);
    setIsUserAlreadyExistsError(false);
    setShowOtpStep(false);
    setTab(newTab);
  }

  function handleSwitchToSignin() {
    setError(null);
    setSuccessNotice(null);
    setIsUserAlreadyExistsError(false);
    setTab('signin');
  }

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessNotice(null);
    setIsUserAlreadyExistsError(false);

    if (tab === 'signup') {
      const { data: signUpData, error: err } = await authClient.signUp.email(
        {
          name,
          email,
          password,
        },
        {
          headers: {
            'x-app-locale': locale,
          },
        },
      );

      if (err) {
        const rawMsg = (err.message || '').toLowerCase();
        const rawCode = (((err as Record<string, unknown>).code as string) || '').toLowerCase();
        let isAlreadyExists = false;
        if (
          rawMsg.includes('already exists') ||
          rawMsg.includes('already in use') ||
          rawMsg.includes('user already') ||
          rawCode.includes('user_already_exists')
        ) {
          isAlreadyExists = true;
        }

        if (isAlreadyExists) {
          setIsUserAlreadyExistsError(true);
        } else {
          setIsUserAlreadyExistsError(false);
          setError(normalizeErrorMessage(err));
        }
        setLoading(false);
        return;
      }

      // If user is returned and account is already verified
      if (signUpData?.user?.emailVerified) {
        setIsUserAlreadyExistsError(true);
        setLoading(false);
        return;
      }

      // Automatically send OTP and transition to 6-digit PIN verification step
      await authClient.emailOtp.sendVerificationOtp(
        {
          email,
          type: 'email-verification',
        },
        {
          headers: {
            'x-app-locale': locale,
          },
        },
      );

      setSuccessNotice(t('auth.emailVerificationSent'));
      setShowOtpStep(true);
      setLoading(false);
      return;
    }

    const { error: err } = await authClient.signIn.email({
      email,
      password,
    });

    if (err) {
      setError(normalizeErrorMessage(err));
      setLoading(false);
      return;
    }

    setLoading(false);
    navigateToHome(navigate);
  }

  async function handleVerifyOtp(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!otpCode.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessNotice(null);

    const { error: err } = await authClient.emailOtp.verifyEmail({
      email,
      otp: otpCode.trim(),
    });

    if (err) {
      setError(t('auth.invalidOtp'));
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccessNotice(t('auth.emailVerifiedSuccess'));
    setShowOtpStep(false);
    setTab('signin');
  }

  async function handleResendOtp() {
    setLoading(true);
    setError(null);
    setSuccessNotice(null);

    const { error: err } = await authClient.emailOtp.sendVerificationOtp(
      {
        email,
        type: 'email-verification',
      },
      {
        headers: {
          'x-app-locale': locale,
        },
      },
    );

    setLoading(false);
    if (err) {
      setError(normalizeErrorMessage(err));
      return;
    }
    setSuccessNotice(t('auth.emailVerificationSent'));
  }

  async function handlePasskeySignIn() {
    setLoading(true);
    setError(null);
    setSuccessNotice(null);
    const { error: err } = await authClient.signIn.passkey();
    if (err) {
      setError(normalizeErrorMessage(err));
      setLoading(false);
      return;
    }
    setLoading(false);
    navigate('/');
  }

  function handleLanguageToggle() {
    let nextLang = LOCALES.SPANISH as string;
    if (locale === LOCALES.SPANISH) {
      nextLang = LOCALES.ENGLISH;
    }
    setLocale(nextLang);
  }

  function handleStartSignup() {
    setError(null);
    setSuccessNotice(null);
    setIsUserAlreadyExistsError(false);
    setShowOtpStep(false);
    setTab('signup');
  }

  return {
    tab,
    setTab,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    otpCode,
    setOtpCode,
    showOtpStep,
    setShowOtpStep,
    loading,
    error,
    isUserAlreadyExistsError,
    successNotice,
    locale,
    handleTabSelect,
    handleSwitchToSignin,
    handleSubmit,
    handleVerifyOtp,
    handleResendOtp,
    handlePasskeySignIn,
    handleLanguageToggle,
    handleStartSignup,
  };
}
