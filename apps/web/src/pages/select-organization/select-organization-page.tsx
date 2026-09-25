import { useTranslation } from 'react-i18next';
import { Building2, Plus, ArrowRight, LogOut, Mail, ShieldAlert, Loader2 } from 'lucide-react';
import {
  useSelectOrganizationPage,
  type OrgItem,
  type UserInvitation,
} from './use-select-organization-page';
import { Button } from '../../components/ui/button';
import { InvitationModal } from '../../components/ui/invitation-modal';
import { Input } from '../../components/ui/input';
import { Modal } from '../../components/ui/modal';

export function SelectOrganizationPage() {
  const { t } = useTranslation();
  const {
    user,
    organizations,
    invitations,
    roleByOrgId,
    isOwnerOfAnyOrg,
    isModalOpen,
    setIsModalOpen,
    newOrgName,
    setNewOrgName,
    isSubmitting,
    selectingOrgId,
    isLoading,
    handleSelectOrg,
    handleCreateOrganization,
    selectedInvitation,
    openInvitationModal,
    closeInvitationModal,
    handleModalAccepted,
    handleModalDeclined,
    handleSignOut,
  } = useSelectOrganizationPage();

  const userDisplayName = user?.name || user?.email || 'User';

  let submitButtonLabel = t('settings.createOrg');
  if (isSubmitting) {
    submitButtonLabel = t('common.loading');
  }

  let createButtonContent = (
    <Button
      type="button"
      onClick={() => setIsModalOpen(true)}
      className="bg-[#7B6CF6] text-white hover:bg-[#6a5bf0] text-xs gap-1.5"
    >
      <Plus className="w-4 h-4" />
      <span>{t('selectOrg.createOrgBtn')}</span>
    </Button>
  );

  if (isOwnerOfAnyOrg) {
    createButtonContent = (
      <div className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
        <ShieldAlert className="w-4 h-4 flex-none" />
        <span>{t('selectOrg.ownerLimitNotice')}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#08090B] text-slate-900 dark:text-slate-100 flex flex-col justify-between p-6">
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[#7B6CF6] to-[#4FB0FF] flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20 flex-none">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-900 dark:text-white text-base tracking-tight">
              App Template
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('selectOrg.chooseWorkspace')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t('auth.signOut')}</span>
        </button>
      </header>

      <main className="max-w-2xl w-full mx-auto my-auto py-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('selectOrg.welcomeUser', { name: userDisplayName })}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('selectOrg.selectPrompt')}
          </p>
        </div>

        {/* Organizations Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('selectOrg.yourOrganizations')} ({organizations.length})
            </h3>
            {createButtonContent}
          </div>

          {isLoading && (
            <div className="p-8 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#7B6CF6]" />
              <span>{t('common.loading')}</span>
            </div>
          )}

          {!isLoading && organizations.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-8 text-center space-y-3">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('selectOrg.noOrganizations')}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {organizations.map((org: OrgItem) => {
              const role = roleByOrgId.get(org.id) || 'member';
              let isOwnerRole = false;
              if (role === 'owner') {
                isOwnerRole = true;
              }

              let isSelecting = false;
              if (selectingOrgId === org.id) {
                isSelecting = true;
              }

              let roleName = t('settings.roleBadgeMember');
              let roleBadgeClass =
                'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400';
              if (isOwnerRole) {
                roleName = t('settings.roleBadgeOwner');
                roleBadgeClass = 'bg-[#7B6CF6]/10 text-[#7B6CF6] border border-[#7B6CF6]/30';
              } else if (role === 'admin') {
                roleName = t('settings.roleBadgeAdmin');
                roleBadgeClass = 'bg-blue-500/10 text-blue-500 border border-blue-500/30';
              }

              return (
                <div
                  key={org.id}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101216] p-4 flex items-center justify-between hover:border-[#7B6CF6]/50 transition-all shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#7B6CF6]/10 flex items-center justify-center text-[#7B6CF6] flex-none">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {org.name}
                        </span>
                        <span
                          className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${roleBadgeClass}`}
                        >
                          {roleName}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] opacity-60 text-slate-500 dark:text-slate-400">
                        {org.id}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleSelectOrg(org.id)}
                    disabled={isSelecting}
                    className="bg-[#7B6CF6] text-white hover:bg-[#6a5bf0] text-xs gap-1.5 px-4"
                  >
                    {isSelecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {!isSelecting && (
                      <>
                        <span>{t('selectOrg.enterOrg')}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Invitations Section */}
        {invitations.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#7B6CF6]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('selectOrg.pendingInvitations')} ({invitations.length})
              </h3>
            </div>

            <div className="space-y-2.5">
              {invitations.map((inv: UserInvitation) => (
                <div
                  key={inv.id}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101216] p-4 flex items-center justify-between shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-none">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                        {inv.organizationName || t('selectOrg.unknownOrganization')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('selectOrg.invitedAs', { role: inv.role })}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => openInvitationModal(inv)}
                    className="bg-[#7B6CF6] text-white hover:bg-[#6a5bf0] text-xs gap-1.5 px-3 py-1.5"
                  >
                    <span>{t('notifications.reviewBtn')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Organization Invitation Modal */}
      <InvitationModal
        isOpen={Boolean(selectedInvitation)}
        invitation={selectedInvitation}
        onClose={closeInvitationModal}
        onAccepted={handleModalAccepted}
        onDeclined={handleModalDeclined}
      />

      {/* Modal for Creating Organization */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('settings.createOrg')}
      >
        <form onSubmit={handleCreateOrganization} className="space-y-4">
          <Input
            label={t('onboarding.orgName')}
            placeholder={t('onboarding.orgPlaceholder')}
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            required
            autoFocus
          />

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('selectOrg.createOwnerReminder')}
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !newOrgName.trim()}
              className="bg-[#7B6CF6] text-white hover:bg-[#6a5bf0]"
            >
              {submitButtonLabel}
            </Button>
          </div>
        </form>
      </Modal>

      <footer className="text-center py-4 text-xs text-slate-400 dark:text-slate-600">
        App Template · All rights reserved.
      </footer>
    </div>
  );
}
