import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppLayout } from './use-app-layout';
import { OrgSwitcher } from '../../components/ui/org-switcher';
import { GuidedTour, type TourStep } from '../../components/ui/guided-tour';
import { Home, Settings, Package, LogOut, Sun, Moon, Globe, Sparkles, Layers } from 'lucide-react';

export function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [isTourOpen, setIsTourOpen] = useState(false);

  const {
    user,
    organization,
    organizations,
    locale,
    theme,
    handleSignOut,
    handleSelectOrg,
    handleLanguageToggle,
    toggleTheme,
  } = useAppLayout();

  let themeIcon = <Moon className="h-4 w-4" />;
  if (theme === 'dark') {
    themeIcon = <Sun className="h-4 w-4" />;
  }

  const tourSteps: TourStep[] = [
    {
      targetSelector: '[data-tour="org-switcher"]',
      title: t('tour.orgSwitcherTitle'),
      description: t('tour.orgSwitcherDesc'),
    },
    {
      targetSelector: '[data-tour="nav-items"]',
      title: t('tour.itemsTitle'),
      description: t('tour.itemsDesc'),
    },
    {
      targetSelector: '[data-tour="nav-settings"]',
      title: t('tour.settingsTitle'),
      description: t('tour.settingsDesc'),
    },
    {
      targetSelector: '[data-tour="header-controls"]',
      title: t('tour.headerTitle'),
      description: t('tour.headerDesc'),
    },
  ];

  const getNavClass = (path: string) => {
    let isActive = false;
    if (location.pathname === path) {
      isActive = true;
    }

    if (isActive) {
      return 'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold bg-[#7B6CF6]/15 text-[#7B6CF6] border border-[#7B6CF6]/30 dark:text-white';
    }
    return 'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5 transition-colors';
  };

  const getMobileNavClass = (path: string) => {
    let isActive = false;
    if (location.pathname === path) {
      isActive = true;
    }

    if (isActive) {
      return 'flex-1 flex flex-col items-center gap-1 py-2 text-[10.5px] font-semibold text-[#7B6CF6]';
    }
    return 'flex-1 flex flex-col items-center gap-1 py-2 text-[10.5px] font-semibold text-slate-500 hover:text-slate-300';
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-[#08090B] dark:text-slate-100 antialiased transition-colors duration-200">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 bg-white p-5 dark:border-white/5 dark:bg-[#0A0B0D] flex-col justify-between sticky top-0 h-screen flex-none">
        <div>
          <div className="flex items-center gap-3 px-2 pb-5 border-b border-slate-200 dark:border-white/5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-[#7B6CF6] to-[#4FB0FF] flex items-center justify-center font-bold text-white text-base shadow-md shadow-indigo-500/20 flex-none">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-slate-900 dark:text-white text-sm tracking-tight truncate">
                App Template
              </h1>
            </div>
          </div>

          {/* Tenant / Organization Switcher */}
          <div className="mb-6" data-tour="org-switcher">
            <OrgSwitcher
              currentOrg={organization}
              organizations={organizations}
              onSelectOrg={handleSelectOrg}
            />
          </div>

          <div className="text-[10.5px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500 px-2 mb-2">
            Navigation
          </div>

          <nav className="space-y-1">
            <Link to="/" className={getNavClass('/')} data-tour="nav-dashboard">
              <Home className="h-4 w-4" />
              {t('common.dashboard')}
            </Link>
            <Link to="/items" className={getNavClass('/items')} data-tour="nav-items">
              <Package className="h-4 w-4" />
              {t('common.items')}
            </Link>
            <Link to="/settings" className={getNavClass('/settings')} data-tour="nav-settings">
              <Settings className="h-4 w-4" />
              {t('common.settings')}
            </Link>
          </nav>
        </div>

        {/* Bottom User Badge */}
        <div className="pt-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-400 to-sky-400 flex items-center justify-center font-semibold text-[#08090B] text-xs flex-none">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {user?.name || 'User'}
              </div>
              <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            title={t('common.logout')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-[#08090B]/80 border-b border-slate-200 dark:border-white/5 h-16 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-[#7B6CF6] to-[#4FB0FF] flex md:hidden items-center justify-center font-bold text-white text-xs mr-1">
              <Layers className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <div className="flex items-center gap-2.5" data-tour="header-controls">
            <button
              type="button"
              onClick={() => setIsTourOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#7B6CF6]/40 bg-[#7B6CF6]/10 px-2.5 py-1.5 text-xs font-semibold text-[#7B6CF6] hover:bg-[#7B6CF6]/20 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tour</span>
            </button>

            <button
              type="button"
              onClick={handleLanguageToggle}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              {locale.toUpperCase()}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 p-1.5 text-slate-700 dark:text-slate-300 transition-colors"
            >
              {themeIcon}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center bg-white/95 dark:bg-[#0A0B0D]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 px-2 py-1">
        <Link to="/" className={getMobileNavClass('/')}>
          <Home className="h-4 w-4" />
          <span>{t('common.dashboard')}</span>
        </Link>
        <Link to="/items" className={getMobileNavClass('/items')}>
          <Package className="h-4 w-4" />
          <span>{t('common.items')}</span>
        </Link>
        <Link to="/settings" className={getMobileNavClass('/settings')}>
          <Settings className="h-4 w-4" />
          <span>{t('common.settings')}</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex-1 flex flex-col items-center gap-1 py-2 text-[10.5px] font-semibold text-slate-500 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('common.logout')}</span>
        </button>
      </nav>

      {/* Interactive Guided Tour Modal */}
      <GuidedTour isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} steps={tourSteps} />
    </div>
  );
}
