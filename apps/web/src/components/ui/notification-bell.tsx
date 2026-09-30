import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  RotateCw,
  Mail,
  ArrowRight,
  CheckCircle2,
  CheckCheck,
  UserMinus,
  Check,
} from 'lucide-react';
import { authClient } from '../../lib/auth-client';
import { apiFetch } from '../../lib/api-client';
import type { InvitationData } from './invitation-modal';

interface SystemNotificationDto {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

interface NotificationsResponse {
  data: SystemNotificationDto[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
  unreadCount: number;
}

interface UserInvitationDto {
  id: string;
  organizationId: string;
  organizationName?: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | string;
  createdAt: Date | string;
}

export interface NotificationBellProps {
  onOpenInvitation: (invitation: InvitationData) => void;
}

type FilterTab = 'all' | 'invitations' | 'alerts';

interface UnifiedItem {
  kind: 'invitation' | 'system';
  id: string;
  timestamp: number;
  invitation?: UserInvitationDto;
  notification?: SystemNotificationDto;
}

interface InvitationItemProps {
  invitation: UserInvitationDto;
  onReview: (invitation: UserInvitationDto) => void;
}

interface SystemNotificationItemProps {
  notification: SystemNotificationDto;
  onMarkAsRead: (id: string) => void;
}

function InvitationItem({ invitation, onReview }: Readonly<InvitationItemProps>) {
  const { t } = useTranslation();
  let orgName = t('selectOrg.unknownOrganization');
  if (invitation.organizationName) {
    orgName = invitation.organizationName;
  }

  let roleName = t('settings.memberRoleMember');
  if (invitation.role === 'admin') {
    roleName = t('settings.memberRoleAdmin');
  } else if (invitation.role === 'owner') {
    roleName = t('settings.memberRoleOwner');
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#131519] p-3 space-y-2.5 transition-colors hover:border-[#7B6CF6]/40">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#7B6CF6]/15 text-[#7B6CF6] flex items-center justify-center flex-none mt-0.5">
          <Mail className="w-4 h-4 text-[#7B6CF6]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {t('notifications.invitationSubject')}
            </span>
            <span className="text-[9.5px] font-semibold text-[#7B6CF6] bg-[#7B6CF6]/10 px-1.5 py-0.5 rounded-full">
              {t('notifications.newBadge')}
            </span>
          </div>
          <p className="text-[11.5px] text-slate-600 dark:text-slate-400 mt-0.5">
            {t('notifications.invitationBody', { orgName, role: roleName })}
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={() => onReview(invitation)}
          className="flex items-center gap-1 text-xs font-semibold text-[#7B6CF6] hover:text-[#6a5bf0] transition-colors"
        >
          <span>{t('notifications.reviewBtn')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function SystemNotificationItem({
  notification,
  onMarkAsRead,
}: Readonly<SystemNotificationItemProps>) {
  const { t } = useTranslation();

  let iconContainerClass =
    'w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-none mt-0.5';
  let iconElement = <Bell className="w-4 h-4 text-blue-500" />;

  if (notification.type === 'ORGANIZATION_MEMBER_REMOVED') {
    iconContainerClass =
      'w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-none mt-0.5';
    iconElement = <UserMinus className="w-4 h-4 text-red-500" />;
  }

  let containerClass =
    'rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#131519] p-3 space-y-2 transition-colors hover:border-[#7B6CF6]/40';
  if (notification.read) {
    containerClass =
      'rounded-xl border border-slate-200/60 dark:border-white/5 bg-slate-50/60 dark:bg-[#131519]/60 p-3 space-y-2 transition-colors opacity-75';
  }

  const formattedDate = new Date(notification.createdAt).toLocaleDateString();

  return (
    <div className={containerClass}>
      <div className="flex items-start gap-2.5">
        <div className={iconContainerClass}>{iconElement}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {notification.title}
            </span>
            {!notification.read && (
              <span className="text-[9.5px] font-semibold text-[#7B6CF6] bg-[#7B6CF6]/10 px-1.5 py-0.5 rounded-full">
                {t('notifications.newBadge')}
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-slate-600 dark:text-slate-400 mt-0.5">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/60 dark:border-white/5">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{formattedDate}</span>
            {!notification.read && (
              <button
                type="button"
                onClick={() => onMarkAsRead(notification.id)}
                title={t('notifications.markAsRead')}
                aria-label={t('notifications.markAsRead')}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-[#7B6CF6] dark:hover:text-[#7B6CF6] transition-colors"
              >
                <Check className="w-3 h-3" />
                <span>{t('notifications.markAsRead')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell({ onOpenInvitation }: Readonly<NotificationBellProps>) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    data: invitations = [],
    isRefetching: isRefetchingInvitations,
    refetch: refetchInvitations,
  } = useQuery<UserInvitationDto[]>({
    queryKey: ['user-invitations'],
    queryFn: async () => {
      try {
        const res = await authClient.organization.listUserInvitations();
        if (res.error || !res.data || !Array.isArray(res.data)) {
          return [];
        }
        return res.data as unknown as UserInvitationDto[];
      } catch {
        return [];
      }
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const notificationsQuery = useQuery<NotificationsResponse>({
    queryKey: ['user-system-notifications'],
    queryFn: async () => {
      try {
        return await apiFetch<NotificationsResponse>('/api/v1/notifications?pageSize=20');
      } catch {
        return {
          data: [],
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 1 },
          unreadCount: 0,
        };
      }
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  let safeInvitations: UserInvitationDto[] = [];
  if (Array.isArray(invitations)) {
    safeInvitations = invitations;
  }

  let safeNotifications: SystemNotificationDto[] = [];
  if (notificationsQuery.data?.data && Array.isArray(notificationsQuery.data.data)) {
    safeNotifications = notificationsQuery.data.data;
  }

  let systemUnread = 0;
  if (notificationsQuery.data?.unreadCount) {
    systemUnread = notificationsQuery.data.unreadCount;
  }
  const totalUnread = safeInvitations.length + systemUnread;
  const hasUnread = totalUnread > 0;
  const countLabel = totalUnread.toString();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  async function handleRefresh() {
    await Promise.all([refetchInvitations(), notificationsQuery.refetch()]);
  }

  async function handleMarkAllAsRead() {
    try {
      await apiFetch('/api/v1/notifications/read-all', { method: 'PATCH' });
      await notificationsQuery.refetch();
    } catch {
      // Ignored
    }
  }

  async function handleMarkAsRead(id: string) {
    try {
      await apiFetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      await notificationsQuery.refetch();
    } catch {
      // Ignored
    }
  }

  function handleReviewClick(inv: UserInvitationDto) {
    setIsOpen(false);
    onOpenInvitation({
      id: inv.id,
      organizationId: inv.organizationId,
      organizationName: inv.organizationName,
      role: inv.role,
      email: inv.email,
    });
  }

  const isRefreshing = isRefetchingInvitations || notificationsQuery.isRefetching;
  let refreshSpinClass = 'h-3.5 w-3.5 text-slate-500';
  if (isRefreshing) {
    refreshSpinClass = 'h-3.5 w-3.5 text-[#7B6CF6] animate-spin';
  }

  let allTabClass = 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
  if (activeTab === 'all') {
    allTabClass =
      'bg-white dark:bg-[#1c1f26] text-slate-900 dark:text-white shadow-xs font-semibold';
  }

  let invitationsTabClass =
    'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
  if (activeTab === 'invitations') {
    invitationsTabClass =
      'bg-white dark:bg-[#1c1f26] text-slate-900 dark:text-white shadow-xs font-semibold';
  }

  let alertsTabClass =
    'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
  if (activeTab === 'alerts') {
    alertsTabClass =
      'bg-white dark:bg-[#1c1f26] text-slate-900 dark:text-white shadow-xs font-semibold';
  }

  const displayItems: UnifiedItem[] = [];

  if (activeTab === 'all' || activeTab === 'invitations') {
    for (const inv of safeInvitations) {
      displayItems.push({
        kind: 'invitation',
        id: `inv-${inv.id}`,
        timestamp: new Date(inv.createdAt).getTime(),
        invitation: inv,
      });
    }
  }

  if (activeTab === 'all' || activeTab === 'alerts') {
    for (const notif of safeNotifications) {
      displayItems.push({
        kind: 'system',
        id: `notif-${notif.id}`,
        timestamp: new Date(notif.createdAt).getTime(),
        notification: notif,
      });
    }
  }

  displayItems.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('notifications.title')}
        aria-expanded={isOpen}
        className="relative flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 p-2 text-slate-700 dark:text-slate-300 transition-colors"
      >
        <Bell className="h-4 w-4" />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7B6CF6] px-1 text-[10px] font-bold text-white shadow-xs">
            {countLabel}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-white/10 dark:bg-[#101216]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                {t('notifications.title')}
              </span>
              {hasUnread && (
                <span className="text-[10px] font-semibold text-[#7B6CF6] bg-[#7B6CF6]/10 px-2 py-0.5 rounded-full border border-[#7B6CF6]/20">
                  {t('notifications.unreadCount', { count: totalUnread })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {systemUnread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  title={t('notifications.markAllAsRead')}
                  aria-label={t('notifications.markAllAsRead')}
                  className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleRefresh}
                title={t('notifications.refresh')}
                aria-label={t('notifications.refresh')}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <RotateCw className={refreshSpinClass} />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-lg my-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${allTabClass}`}
            >
              {t('notifications.allTab')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invitations')}
              className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${invitationsTabClass}`}
            >
              {t('notifications.invitationsTab')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${alertsTabClass}`}
            >
              {t('notifications.systemAlertsTab')}
            </button>
          </div>

          {/* Notifications List */}
          <div className="py-1 max-h-80 overflow-y-auto space-y-2">
            {displayItems.length === 0 && (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-500/80 mx-auto" />
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {t('notifications.empty')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto px-4">
                  {t('notifications.emptyDesc')}
                </p>
              </div>
            )}

            {displayItems.map((item) => {
              if (item.kind === 'invitation' && item.invitation) {
                return (
                  <InvitationItem
                    key={item.id}
                    invitation={item.invitation}
                    onReview={handleReviewClick}
                  />
                );
              }
              if (item.kind === 'system' && item.notification) {
                return (
                  <SystemNotificationItem
                    key={item.id}
                    notification={item.notification}
                    onMarkAsRead={handleMarkAsRead}
                  />
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
