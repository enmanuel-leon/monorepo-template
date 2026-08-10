import { useTranslation } from 'react-i18next';
import { useHomePage } from './use-home-page';

export function HomePage() {
  const { t } = useTranslation();
  const { user, organization } = useHomePage();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101216] p-8 shadow-sm space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('common.welcome')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Production-ready Fastify 5 + React 19 Fullstack Monorepo Starter.
        </p>

        <div className="pt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#131519] p-5">
            <span className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
              Current User
            </span>
            <p className="mt-1.5 font-medium text-slate-800 dark:text-slate-200 text-sm">
              {user?.name || user?.email || 'Anonymous'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#131519] p-5">
            <span className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
              Active Organization
            </span>
            <p className="mt-1.5 font-medium text-slate-800 dark:text-slate-200 text-sm">
              {organization?.name || 'No active organization selected'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
