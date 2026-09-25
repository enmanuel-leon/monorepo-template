import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Check, X, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '../../lib/auth-client';
import { Modal } from './modal';
import { Button } from './button';

export interface InvitationData {
  id: string;
  organizationId: string;
  organizationName?: string;
  role: string;
  email?: string;
}

export interface InvitationModalProps {
  isOpen: boolean;
  invitation: InvitationData | null;
  onClose: () => void;
  onAccepted?: (orgId: string) => void;
  onDeclined?: (invitationId: string) => void;
}

export function InvitationModal({
  isOpen,
  invitation,
  onClose,
  onAccepted,
  onDeclined,
}: Readonly<InvitationModalProps>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'details' | 'switch-prompt'>('details');
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  function resetState() {
    setStep('details');
    setIsAccepting(false);
    setIsDeclining(false);
    setIsSwitching(false);
    onClose();
  }

  if (!invitation) {
    return null;
  }

  const orgName = invitation.organizationName || t('selectOrg.unknownOrganization');

  async function handleAccept() {
    if (!invitation) {
      return;
    }

    setIsAccepting(true);
    const res = await authClient.organization.acceptInvitation({
      invitationId: invitation.id,
    });
    setIsAccepting(false);

    if (res.error) {
      toast.error(t('selectOrg.invitationAcceptError'));
      return;
    }

    toast.success(t('invitationModal.acceptSuccess'));
    await queryClient.invalidateQueries();
    setStep('switch-prompt');
  }

  async function handleDecline() {
    if (!invitation) {
      return;
    }

    setIsDeclining(true);
    const res = await authClient.organization.rejectInvitation({
      invitationId: invitation.id,
    });
    setIsDeclining(false);

    if (res.error) {
      toast.error(t('selectOrg.invitationRejectError'));
      return;
    }

    toast.success(t('invitationModal.declineSuccess'));
    await queryClient.invalidateQueries();
    if (onDeclined) {
      onDeclined(invitation.id);
    }
    resetState();
  }

  async function handleSwitchWorkspace() {
    if (!invitation) {
      return;
    }

    setIsSwitching(true);
    const res = await authClient.organization.setActive({
      organizationId: invitation.organizationId,
    });
    setIsSwitching(false);

    if (res.error) {
      toast.error(t('settings.organizationSelectError'));
      return;
    }

    await authClient.getSession({ query: { disableCookieCache: true } });
    await queryClient.invalidateQueries();
    toast.success(t('invitationModal.switchSuccess', { orgName }));

    if (onAccepted) {
      onAccepted(invitation.organizationId);
    }
    resetState();
  }

  function handleStayCurrent() {
    if (invitation && onAccepted) {
      onAccepted(invitation.organizationId);
    }
    resetState();
  }

  let roleLabel = t('settings.memberRoleMember');
  if (invitation.role === 'admin') {
    roleLabel = t('settings.memberRoleAdmin');
  } else if (invitation.role === 'owner') {
    roleLabel = t('settings.memberRoleOwner');
  }

  let modalTitle = t('invitationModal.switchPromptTitle');
  if (step === 'details') {
    modalTitle = t('invitationModal.title');
  }

  let roleBadgeClass = 'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300';
  if (invitation.role === 'admin') {
    roleBadgeClass = 'bg-blue-500/10 text-blue-500 border border-blue-500/30';
  } else if (invitation.role === 'owner') {
    roleBadgeClass = 'bg-[#7B6CF6]/10 text-[#7B6CF6] border border-[#7B6CF6]/30';
  }

  return (
    <Modal isOpen={isOpen} onClose={resetState} title={modalTitle}>
      {step === 'details' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#131519]">
            <div className="w-11 h-11 rounded-xl bg-[#7B6CF6]/15 text-[#7B6CF6] flex items-center justify-center flex-none font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                  {orgName}
                </h4>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${roleBadgeClass}`}
                >
                  {roleLabel}
                </span>
              </div>
              <span className="font-mono text-[10.5px] opacity-60 text-slate-500 dark:text-slate-400">
                {invitation.organizationId}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {t('invitationModal.headline')}
            </p>
            <p>{t('invitationModal.description', { orgName })}</p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={handleDecline}
              disabled={isDeclining || isAccepting}
              className="text-xs text-rose-500 hover:text-rose-600 border-rose-500/30 gap-1.5"
            >
              {isDeclining && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {!isDeclining && <X className="w-3.5 h-3.5" />}
              <span>{t('invitationModal.declineBtn')}</span>
            </Button>

            <Button
              type="button"
              onClick={handleAccept}
              disabled={isDeclining || isAccepting}
              className="bg-[#7B6CF6] text-white hover:bg-[#6a5bf0] text-xs gap-1.5"
            >
              {isAccepting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {!isAccepting && <Check className="w-3.5 h-3.5" />}
              <span>{t('invitationModal.acceptBtn')}</span>
            </Button>
          </div>
        </div>
      )}

      {step === 'switch-prompt' && (
        <div className="space-y-5">
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <p className="font-semibold text-slate-900 dark:text-white text-sm">
              {t('invitationModal.switchPromptTitle')}
            </p>
            <p>{t('invitationModal.switchPromptDesc', { orgName })}</p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={handleStayCurrent}
              disabled={isSwitching}
              className="text-xs"
            >
              {t('invitationModal.stayCurrentBtn')}
            </Button>

            <Button
              type="button"
              onClick={handleSwitchWorkspace}
              disabled={isSwitching}
              className="bg-[#7B6CF6] text-white hover:bg-[#6a5bf0] text-xs gap-1.5"
            >
              {isSwitching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {!isSwitching && (
                <>
                  <span>{t('invitationModal.switchNowBtn')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
