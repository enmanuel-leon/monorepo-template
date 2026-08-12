import { useState, useEffect, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authClient } from '../../lib/auth-client';
import { useLocaleStore } from '../../stores/locale.store';
import { registrationPasswordSchema } from '../../schemas/auth.schema';

export function useRegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const session = authClient.useSession();
  const { locale } = useLocaleStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.data?.user) {
      navigate('/', { replace: true });
    }
  }, [session.data?.user, navigate]);

  function normalizeErrorMessage(err: { message?: string; status?: number } | null): string {
    if (!err) {
      return t('auth.invalidCredentials');
    }
    const rawMsg = (err.message || '').toLowerCase();
    if (rawMsg.includes('invalid email or password') || err.status === 401) {
      return t('auth.invalidCredentials');
    }
    return err.message || t('auth.invalidCredentials');
  }

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!registrationPasswordSchema.safeParse(password).success) {
      setError(t('auth.passwordRequirements'));
      setLoading(false);
      return;
    }

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
      setError(normalizeErrorMessage(err));
      setLoading(false);
      return;
    }

    if (organizationName.trim().length > 0 && signUpData?.user) {
      const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await authClient.organization.create({
        name: organizationName,
        slug,
      });
    }

    setLoading(false);
    navigate('/');
  }

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    organizationName,
    setOrganizationName,
    loading,
    error,
    handleSubmit,
  };
}
