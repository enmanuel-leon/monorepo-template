import { useTranslation } from 'react-i18next';
import { useHomePage } from './use-home-page';

export function HomePage() {
  const { t } = useTranslation();
  const { user, organization } = useHomePage();

  let userDisplay = t('home.anonymous');
  if (user?.name) {
    userDisplay = user.name;
  } else if (user?.email) {
    userDisplay = user.email;
  }

  let orgDisplay = t('home.noActiveOrg');
  if (organization?.name) {
    orgDisplay = organization.name;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101216] p-8 shadow-sm space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('common.welcome')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('home.description')}</p>

        <div className="pt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#131519] p-5">
            <span className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
              {t('home.currentUser')}
            </span>
            <p className="mt-1.5 font-medium text-slate-800 dark:text-slate-200 text-sm">
              {userDisplay}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#131519] p-5">
            <span className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
              {t('home.activeOrg')}
            </span>
            <p className="mt-1.5 font-medium text-slate-800 dark:text-slate-200 text-sm">
              {orgDisplay}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
