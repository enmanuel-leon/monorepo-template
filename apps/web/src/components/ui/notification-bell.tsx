import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Bell, RotateCw, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authClient } from '../../lib/auth-client';
import type { InvitationData } from './invitation-modal';

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

export function NotificationBell({ onOpenInvitation }: Readonly<NotificationBellProps>) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    data: invitations = [],
    isRefetching,
    refetch,
  } = useQuery<UserInvitationDto[]>({
    queryKey: ['user-invitations'],
    queryFn: async () => {
      const res = await authClient.organization.listUserInvitations();
      if (res.error || !res.data) {
        return [];
      }
      return res.data as unknown as UserInvitationDto[];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

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

  const hasUnread = invitations.length > 0;
  const countLabel = invitations.length.toString();

  let refreshSpinClass = 'h-3.5 w-3.5 text-slate-500';
  if (isRefetching) {
    refreshSpinClass = 'h-3.5 w-3.5 text-[#7B6CF6] animate-spin';
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
                  {t('notifications.unreadCount', { count: invitations.length })}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              title={t('notifications.refresh')}
              aria-label={t('notifications.refresh')}
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <RotateCw className={refreshSpinClass} />
            </button>
          </div>

          {/* Notifications List */}
          <div className="py-2 max-h-80 overflow-y-auto space-y-2">
            {!hasUnread && (
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

            {invitations.map((inv) => {
              const orgName = inv.organizationName || t('selectOrg.unknownOrganization');
              let roleName = t('settings.memberRoleMember');
              if (inv.role === 'admin') {
                roleName = t('settings.memberRoleAdmin');
              } else if (inv.role === 'owner') {
                roleName = t('settings.memberRoleOwner');
              }

              return (
                <div
                  key={inv.id}
                  className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#131519] p-3 space-y-2.5 transition-colors hover:border-[#7B6CF6]/40"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#7B6CF6]/15 text-[#7B6CF6] flex items-center justify-center flex-none mt-0.5">
                      <Mail className="w-4 h-4" />
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
                      onClick={() => handleReviewClick(inv)}
                      className="flex items-center gap-1 text-xs font-semibold text-[#7B6CF6] hover:text-[#6a5bf0] transition-colors"
                    >
                      <span>{t('notifications.reviewBtn')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
