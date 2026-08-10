import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRegisterPage } from './use-register-page';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

export function RegisterPage() {
  const { t } = useTranslation();
  const {
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
  } = useRegisterPage();

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {t('auth.signUpTitle')}
        </h2>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-xs text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('auth.name')}
          type="text"
          value={name}
          placeholder="Jane Doe"
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label={t('auth.email')}
          type="email"
          value={email}
          placeholder="user@example.com"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label={t('auth.password')}
          type="password"
          value={password}
          placeholder="••••••••••"
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          label={t('settings.orgName') + ' (Optional)'}
          type="text"
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          placeholder="e.g. Example Corp"
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t('common.loading') : t('common.register')}
        </Button>
      </form>

      <div className="text-center text-xs text-slate-500">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:underline">
          {t('common.login')}
        </Link>
      </div>
    </div>
  );
}
