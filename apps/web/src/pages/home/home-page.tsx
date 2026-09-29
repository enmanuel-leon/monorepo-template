import type React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Users,
  KeyRound,
  Crown,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useHomePage, type MetricsSummary, type RecentItem } from './use-home-page';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

interface QuickActionCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
}

function QuickActionCard({ to, icon, title }: Readonly<QuickActionCardProps>) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101216] hover:border-slate-300 dark:hover:border-white/20 hover:shadow-sm transition-all group"
    >
      <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 group-hover:bg-[#7B6CF6]/10 group-hover:text-[#7B6CF6] transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#7B6CF6] transition-colors">
          {title}
        </span>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#7B6CF6] group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

function getItemStatusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'active') {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  }
  if (normalized === 'pending') {
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  }
  if (normalized === 'archived' || normalized === 'deleted') {
    return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
  }
  return 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 border-slate-200 dark:border-white/10';
}

function getItemStatusLabel(status: string, t: (key: string) => string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'active') {
    return t('home.statusActive');
  }
  if (normalized === 'pending') {
    return t('home.statusPending');
  }
  if (normalized === 'archived' || normalized === 'deleted') {
    return t('home.statusArchived');
  }
  return status;
}

interface RecentItemRowProps {
  item: RecentItem;
}

function RecentItemRow({ item }: Readonly<RecentItemRowProps>) {
  const { t } = useTranslation();
  const statusBadgeClass = getItemStatusBadgeClass(item.status);
  const statusLabel = getItemStatusLabel(item.status, t);
  const formattedDate = new Date(item.createdAt).toLocaleDateString();
  const hasDescription = Boolean(item.description && item.description.trim() !== '');

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#131519] hover:bg-slate-100/60 dark:hover:bg-[#181b20] transition-colors">
      <div className="min-w-0 flex-1 pr-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {item.title}
          </p>
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border flex-none',
              statusBadgeClass,
            )}
          >
            {statusLabel}
          </span>
        </div>
        {hasDescription && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
            {item.description}
          </p>
        )}
      </div>
      <div className="flex-none text-right">
        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
          {formattedDate}
        </span>
      </div>
    </div>
  );
}

interface RoleConfig {
  icon: typeof Crown;
  iconClassName: string;
  label: string;
}

function getRoleConfig(role: string | null | undefined, t: (key: string) => string): RoleConfig {
  if (!role) {
    return {
      icon: Users,
      iconClassName: 'w-5 h-5 text-slate-500',
      label: t('home.rolePersonal'),
    };
  }
  const normalized = role.toLowerCase();
  if (normalized === 'owner') {
    return {
      icon: Crown,
      iconClassName: 'w-5 h-5 text-amber-500',
      label: t('home.roleOwner'),
    };
  }
  if (normalized === 'admin') {
    return {
      icon: ShieldCheck,
      iconClassName: 'w-5 h-5 text-violet-500',
      label: t('home.roleAdmin'),
    };
  }
  if (normalized === 'member') {
    return {
      icon: Users,
      iconClassName: 'w-5 h-5 text-blue-500',
      label: t('home.roleMember'),
    };
  }
  return {
    icon: Users,
    iconClassName: 'w-5 h-5 text-slate-500',
    label: t('home.rolePersonal'),
  };
}

function extractPasskeysCount(metrics: MetricsSummary | null): number {
  if (!metrics?.security) {
    return 0;
  }
  const sec = metrics.security as { passkeysCount?: number; passkeyCount?: number };
  if (typeof sec.passkeysCount === 'number') {
    return sec.passkeysCount;
  }
  if (typeof sec.passkeyCount === 'number') {
    return sec.passkeyCount;
  }
  return 0;
}

function getPasskeysText(
  count: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (count === 1) {
    return t('home.passkeysCount', { count });
  }
  return t('home.passkeysCountPlural', { count });
}

interface BadgeConfig {
  label: string;
  className: string;
}

function getTwoFactorBadgeConfig(
  twoFactorEnabled: boolean | undefined,
  t: (key: string) => string,
): BadgeConfig {
  if (twoFactorEnabled) {
    return {
      label: t('home.twoFactorActive'),
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    };
  }
  return {
    label: t('home.twoFactorInactive'),
    className:
      'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 border-slate-200 dark:border-white/10',
  };
}

function getProfileBadgeConfig(
  isComplete: boolean | undefined,
  t: (key: string) => string,
): BadgeConfig {
  if (isComplete) {
    return {
      label: t('home.profileComplete'),
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    };
  }
  return {
    label: t('home.profilePending'),
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  };
}

export function HomePage() {
  const { t } = useTranslation();
  const { user, organization, metrics, isLoading, isRefetching, handleRefresh } = useHomePage();

  let headerTitle = t('common.welcome');
  if (user?.name) {
    headerTitle = `${t('common.welcome')}, ${user.name}`;
  }

  let refreshLabel = t('common.refresh');
  if (isRefetching) {
    refreshLabel = t('home.refreshing');
  }

  let itemsCount = 0;
  if (metrics?.items?.total) {
    itemsCount = metrics.items.total;
  }

  let memberCount = 1;
  if (metrics?.organization?.memberCount) {
    memberCount = metrics.organization.memberCount;
  }

  let teamSubtext = t('home.personalWorkspace');
  if (metrics?.organization?.name) {
    teamSubtext = metrics.organization.name;
  } else if (organization?.name) {
    teamSubtext = organization.name;
  }

  let hasPendingInvites = false;
  let pendingInvitesCount = 0;
  if (metrics?.organization && metrics.organization.pendingInvitationsCount > 0) {
    hasPendingInvites = true;
    pendingInvitesCount = metrics.organization.pendingInvitationsCount;
  }

  const passkeysCount = extractPasskeysCount(metrics);
  const passkeysText = getPasskeysText(passkeysCount, t);
  const twoFactorConfig = getTwoFactorBadgeConfig(metrics?.security?.twoFactorEnabled, t);
  const roleConfig = getRoleConfig(metrics?.organization?.role, t);
  const RoleIcon = roleConfig.icon;
  const profileConfig = getProfileBadgeConfig(metrics?.profile?.isComplete, t);

  let recentItems: RecentItem[] = [];
  if (metrics?.items?.recent) {
    recentItems = metrics.items.recent;
  }
  const hasRecentItems = recentItems.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {headerTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('home.description')}</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isLoading || isRefetching}
          className="border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', isRefetching && 'animate-spin')} />
          {refreshLabel}
        </Button>
      </div>

      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Items */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101216] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('home.itemsTitle')}
              </span>
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <Package className="w-5 h-5 text-indigo-500" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {itemsCount}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
            <Link
              to="/items"
              className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 group"
            >
              {t('home.viewCatalogAction')}
              <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* KPI 2: Team / Org */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101216] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('home.teamTitle')}
              </span>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {memberCount}
              </span>
              {hasPendingInvites && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {t('home.pendingInvitesCount', { count: pendingInvitesCount })}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
              {teamSubtext}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
            <Link
              to="/settings/organizations"
              className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 group"
            >
              {t('home.manageTeamAction')}
              <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* KPI 3: Security */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101216] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('home.securityTitle')}
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <KeyRound className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {passkeysCount}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
              {passkeysText}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
                twoFactorConfig.className,
              )}
            >
              {twoFactorConfig.label}
            </span>
            <Link
              to="/settings/security"
              className="inline-flex items-center text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 group"
            >
              <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* KPI 4: Access Role */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101216] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('home.roleTitle')}
              </span>
              <div className="p-2 rounded-lg bg-slate-500/10">
                <RoleIcon className={roleConfig.iconClassName} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {roleConfig.label}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
                profileConfig.className,
              )}
            >
              {profileConfig.label}
            </span>
            <Link
              to="/settings/profile"
              className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 group"
            >
              <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
          {t('home.quickActionsTitle')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickActionCard
            to="/items"
            icon={<Plus className="w-5 h-5 text-indigo-500" />}
            title={t('home.createItemAction')}
          />
          <QuickActionCard
            to="/settings/organizations"
            icon={<Users className="w-5 h-5 text-blue-500" />}
            title={t('home.inviteMemberAction')}
          />
          <QuickActionCard
            to="/settings/security"
            icon={<KeyRound className="w-5 h-5 text-emerald-500" />}
            title={t('home.securitySettingsAction')}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            {t('home.recentActivityTitle')}
          </h2>
          {hasRecentItems && (
            <Link
              to="/items"
              className="inline-flex items-center text-xs font-medium text-[#7B6CF6] hover:text-[#6a5bf0] group"
            >
              {t('home.viewAllItems')}
              <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        {hasRecentItems && (
          <div className="space-y-2">
            {recentItems.map((item) => (
              <RecentItemRow key={item.id} item={item} />
            ))}
          </div>
        )}

        {!hasRecentItems && (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-8 text-center bg-slate-50/50 dark:bg-[#131519]/50">
            <Package className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('home.noRecentActivity')}
            </p>
            <div className="mt-4">
              <Link to="/items">
                <Button size="sm">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {t('home.createItemAction')}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
