import { useTranslation } from 'react-i18next';
import { useSettingsPage, type OrgMemberItem, type OrgInvitationItem } from './use-settings-page';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { CustomCountrySelect } from '../../components/ui/custom-country-select';
import {
  Lock,
  Plus,
  Building2,
  Crown,
  KeyRound,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Users,
  UserPlus,
  Mail,
} from 'lucide-react';

interface OrgItem {
  id: string;
  name: string;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const {
    user,
    email,
    activeOrg,
    organizations,
    name,
    setName,
    countryCode,
    setCountryCode,
    selectedTimezone,
    countries,
    newOrgName,
    setNewOrgName,
    creatingOrg,
    isModalOpen,
    setIsModalOpen,
    isUpdatingProfile,
    passkeys,
    isLoadingPasskeys,
    passkeysLoadError,
    passkeyName,
    setPasskeyName,
    editingPasskeyId,
    setEditingPasskeyId,
    editingPasskeyName,
    setEditingPasskeyName,
    isManagingPasskey,
    isOwnerOfAnyOrg,
    canManageMembers,
    roleByOrgId,
    members,
    isLoadingMembers,
    sentInvitations,
    isInviteModalOpen,
    setIsInviteModalOpen,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    isInviting,
    handleInviteMember,
    memberToRemove,
    isRemovingMember,
    openRemoveMemberModal,
    closeRemoveMemberModal,
    handleConfirmRemoveMember,
    invitationToCancel,
    isCancellingInvitation,
    openCancelInvitationModal,
    closeCancelInvitationModal,
    handleConfirmCancelInvitation,
    passkeyToDeleteId,
    openDeletePasskeyModal,
    closeDeletePasskeyModal,
    handleConfirmDeletePasskey,
    handleAddPasskey,
    handleUpdatePasskey,
    handleSaveProfile,
    activeTab,
    setActiveTab,
    handleCreateOrganization,
    handleSelectOrg,
  } = useSettingsPage();

  let profileTabClass =
    'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200';
  let organizationsTabClass =
    'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200';
  let timezoneDisplayName = 'UTC';
  if (selectedTimezone) {
    timezoneDisplayName = selectedTimezone.displayName;
  }

  let securityTabClass =
    'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200';
  if (activeTab === 'profile') {
    profileTabClass = 'border-[#7B6CF6] text-[#7B6CF6]';
  } else if (activeTab === 'organizations') {
    organizationsTabClass = 'border-[#7B6CF6] text-[#7B6CF6]';
  } else {
    securityTabClass = 'border-[#7B6CF6] text-[#7B6CF6]';
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {t('settings.title')}
      </h1>

      <div className="flex gap-6 border-b border-slate-200 dark:border-white/10" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
          className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${profileTabClass}`}
        >
          {t('settings.profileTab')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'organizations'}
          onClick={() => setActiveTab('organizations')}
          className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${organizationsTabClass}`}
        >
          {t('settings.organizationTab')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'security'}
          onClick={() => setActiveTab('security')}
          className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${securityTabClass}`}
        >
          {t('settings.securityTab')}
        </button>
      </div>

      {/* User Profile Card */}
      {activeTab === 'profile' && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101216] p-6 shadow-sm space-y-4">
          <h2 className="text-md font-semibold text-slate-900 dark:text-white">
            {t('settings.profileTab')}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label={t('auth.name')} value={name} onChange={(e) => setName(e.target.value)} />
            <div className="relative">
              <Input
                label={t('auth.email')}
                value={email}
                readOnly
                className="cursor-not-allowed bg-slate-100 pr-9 text-slate-500 focus:border-slate-300 focus:ring-0 dark:bg-[#131519]/70 dark:text-slate-400 dark:focus:border-white/10"
              />
              <Lock className="pointer-events-none absolute right-3 bottom-3.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            </div>

            <CustomCountrySelect
              label={t('settings.country')}
              value={countryCode}
              onChange={setCountryCode}
              countries={countries}
            />

            <div>
              <label
                htmlFor="settings-timezone"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                {t('settings.timezone')}
              </label>
              <div className="relative flex items-center">
                <input
                  id="settings-timezone"
                  value={timezoneDisplayName}
                  readOnly
                  className="w-full bg-slate-100 dark:bg-[#131519]/70 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed pr-9"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-3 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleSaveProfile}
              disabled={isUpdatingProfile}
              className="bg-[#7B6CF6] text-white hover:bg-[#6a5bf0]"
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      )}

      {/* Organization Section */}
      {activeTab === 'organizations' && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101216] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-md font-semibold text-slate-900 dark:text-white">
                {t('settings.organizationTab')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('onboarding.orgHelp')}
              </p>
            </div>

            {!isOwnerOfAnyOrg && (
              <Button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="bg-[#7B6CF6] text-white hover:bg-[#6a5bf0] text-xs gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{t('settings.createOrg')}</span>
              </Button>
            )}
            {isOwnerOfAnyOrg && (
              <div className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                <ShieldAlert className="w-4 h-4 flex-none" />
                <span>{t('selectOrg.ownerLimitNotice')}</span>
              </div>
            )}
          </div>

          {/* Organizations List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              {t('settings.yourOrgs')}
            </h3>
            <div className="space-y-2">
              {organizations.map((org: OrgItem) => {
                let isCurrent = false;
                if (activeOrg?.id === org.id) {
                  isCurrent = true;
                }

                const orgRole = roleByOrgId.get(org.id) || 'member';
                let isOrgOwner = false;
                if (orgRole === 'owner') {
                  isOrgOwner = true;
                }

                return (
                  <div
                    key={org.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#131519] p-3.5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#7B6CF6]/15 flex items-center justify-center text-[#7B6CF6] flex-none">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">
                            {org.name}
                          </span>
                          {isOrgOwner && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 flex-none">
                              <Crown className="w-3 h-3" />
                              <span>{t('settings.memberRoleOwner')}</span>
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {org.id}
                        </span>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="text-xs font-semibold text-[#7B6CF6] bg-[#7B6CF6]/10 border border-[#7B6CF6]/30 px-3 py-1 rounded-full flex-none">
                        {t('settings.active')}
                      </span>
                    )}
                    {!isCurrent && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 flex-none"
                        onClick={() => handleSelectOrg(org.id)}
                      >
                        {t('settings.select')}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Organization Members & Invitations Section */}
          {activeOrg && (
            <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#7B6CF6]" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t('settings.membersTitle')} · {activeOrg.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('settings.membersDesc')}
                  </p>
                </div>

                {canManageMembers && (
                  <Button
                    type="button"
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-[#7B6CF6] text-white hover:bg-[#6a5bf0] text-xs gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{t('settings.inviteMember')}</span>
                  </Button>
                )}
              </div>

              {/* Members List */}
              <div className="space-y-2">
                {isLoadingMembers && (
                  <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7B6CF6]" />
                    <span>{t('common.loading')}</span>
                  </div>
                )}

                {!isLoadingMembers && members.length === 0 && (
                  <p className="text-xs text-slate-500 py-2">{t('settings.noMembers')}</p>
                )}

                {members.map((member: OrgMemberItem) => {
                  let isOwnerRole = false;
                  if (member.role === 'owner') {
                    isOwnerRole = true;
                  }

                  let isSelf = false;
                  if (user && member.user && member.user.id === (user as { id?: string }).id) {
                    isSelf = true;
                  }

                  let canRemove = false;
                  if (canManageMembers && !isOwnerRole && !isSelf) {
                    canRemove = true;
                  }

                  const memberName = member.user?.name || member.user?.email || 'User';
                  const memberInitial = memberName.charAt(0).toUpperCase();

                  let roleLabel = t('settings.roleBadgeMember');
                  let roleBadgeClass =
                    'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400';
                  if (isOwnerRole) {
                    roleLabel = t('settings.roleBadgeOwner');
                    roleBadgeClass = 'bg-[#7B6CF6]/10 text-[#7B6CF6] border border-[#7B6CF6]/30';
                  } else if (member.role === 'admin') {
                    roleLabel = t('settings.roleBadgeAdmin');
                    roleBadgeClass = 'bg-blue-500/10 text-blue-500 border border-blue-500/30';
                  }

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#131519] p-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#7B6CF6]/20 text-[#7B6CF6] flex items-center justify-center font-bold text-xs flex-none">
                          {memberInitial}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                              {memberName}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] text-[#7B6CF6] font-medium bg-[#7B6CF6]/10 px-1.5 py-0.5 rounded-md">
                                {t('settings.youBadge')}
                              </span>
                            )}
                            <span
                              className={`text-[9.5px] font-semibold uppercase px-2 py-0.5 rounded-full ${roleBadgeClass}`}
                            >
                              {roleLabel}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">{member.user?.email}</span>
                        </div>
                      </div>

                      {canRemove && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openRemoveMemberModal(member)}
                          className="text-red-500 hover:text-red-600 border-red-500/20 hover:bg-red-500/10 text-xs gap-1 px-2.5 py-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('common.delete')}</span>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sent Pending Invitations */}
              {sentInvitations.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <Mail className="w-3.5 h-3.5 text-[#7B6CF6]" />
                    <span>
                      {t('settings.pendingSentInvites')} ({sentInvitations.length})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {sentInvitations.map((inv: OrgInvitationItem) => {
                      let inviteRoleLabel = t('settings.roleBadgeMember');
                      if (inv.role === 'admin') {
                        inviteRoleLabel = t('settings.roleBadgeAdmin');
                      } else if (inv.role === 'owner') {
                        inviteRoleLabel = t('settings.roleBadgeOwner');
                      }

                      return (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#131519] p-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center flex-none">
                              <Mail className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                {inv.email}
                              </span>
                              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                {inviteRoleLabel}
                              </span>
                            </div>
                          </div>

                          {canManageMembers && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openCancelInvitationModal(inv)}
                              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                              {t('settings.cancelInvite')}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#101216]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7B6CF6]/15 text-[#7B6CF6]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-md font-semibold text-slate-900 dark:text-white">
                  {t('settings.passkeysTitle')}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('settings.passkeysDescription')}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  label={t('settings.passkeyName')}
                  value={passkeyName}
                  onChange={(event) => setPasskeyName(event.target.value)}
                  placeholder={t('settings.passkeyNamePlaceholder')}
                  disabled={isManagingPasskey}
                />
              </div>
              <Button
                type="button"
                onClick={handleAddPasskey}
                disabled={isManagingPasskey}
                className="gap-2 bg-[#7B6CF6] text-white hover:bg-[#6a5bf0]"
              >
                <KeyRound className="h-4 w-4" />
                {t('settings.addPasskey')}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#101216]">
            <h2 className="text-md font-semibold text-slate-900 dark:text-white">
              {t('settings.registeredPasskeys')}
            </h2>
            {isLoadingPasskeys && (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                {t('common.loading')}
              </p>
            )}
            {!isLoadingPasskeys && !passkeysLoadError && passkeys.length === 0 && (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                {t('settings.noPasskeys')}
              </p>
            )}
            {passkeysLoadError && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                {t('settings.passkeysLoadError')}
              </p>
            )}
            <div className="mt-4 space-y-2">
              {passkeys.map((passkey) => {
                const isEditing = editingPasskeyId === passkey.id;
                return (
                  <div
                    key={passkey.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-[#131519] sm:flex-row sm:items-center sm:justify-between"
                  >
                    {isEditing && (
                      <Input
                        value={editingPasskeyName}
                        onChange={(event) => setEditingPasskeyName(event.target.value)}
                        disabled={isManagingPasskey}
                      />
                    )}
                    {!isEditing && (
                      <div className="flex items-center gap-3">
                        <KeyRound className="h-4 w-4 text-[#7B6CF6]" />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {passkey.name || t('settings.unnamedPasskey')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {isEditing && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleUpdatePasskey}
                          disabled={isManagingPasskey}
                          className="bg-[#7B6CF6] text-white hover:bg-[#6a5bf0]"
                        >
                          {t('common.save')}
                        </Button>
                      )}
                      {!isEditing && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPasskeyId(passkey.id);
                            setEditingPasskeyName(passkey.name || '');
                          }}
                          disabled={isManagingPasskey}
                          aria-label={t('settings.renamePasskey')}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openDeletePasskeyModal(passkey.id)}
                        disabled={isManagingPasskey}
                        aria-label={t('settings.deletePasskey')}
                        className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal for Inviting Member */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title={t('settings.inviteMemberTitle')}
      >
        <form onSubmit={handleInviteMember} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('settings.inviteMemberDesc')}
          </p>

          <Input
            label={t('settings.inviteEmail')}
            type="email"
            placeholder="colleague@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('settings.inviteRole')}
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-[#131519] dark:text-slate-100"
            >
              <option value="member">{t('settings.memberRoleMember')}</option>
              <option value="admin">{t('settings.memberRoleAdmin')}</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInviteModalOpen(false)}
              disabled={isInviting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isInviting || !inviteEmail.trim()}
              className="bg-[#7B6CF6] text-white hover:bg-[#6a5bf0]"
            >
              {isInviting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              {t('settings.sendInvite')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal for Removing Member */}
      <ConfirmModal
        isOpen={Boolean(memberToRemove)}
        onClose={closeRemoveMemberModal}
        onConfirm={handleConfirmRemoveMember}
        title={t('settings.removeMember')}
        description={t('settings.removeMemberConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        isLoading={isRemovingMember}
      />

      {/* Modal for Deleting Passkey */}
      <ConfirmModal
        isOpen={Boolean(passkeyToDeleteId)}
        onClose={closeDeletePasskeyModal}
        onConfirm={handleConfirmDeletePasskey}
        title={t('settings.deletePasskey')}
        description={t('settings.passkeyDeleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        isLoading={isManagingPasskey}
      />

      {/* Modal for Cancelling Invitation */}
      <ConfirmModal
        isOpen={Boolean(invitationToCancel)}
        onClose={closeCancelInvitationModal}
        onConfirm={handleConfirmCancelInvitation}
        title={t('settings.cancelInviteTitle')}
        description={t('settings.cancelInviteConfirm', {
          email: invitationToCancel?.email,
        })}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="warning"
        isLoading={isCancellingInvitation}
      />

      {/* Modal for Creating New Organization */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('settings.createOrgModalTitle')}
      >
        <form onSubmit={handleCreateOrganization} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('settings.createOrgModalSub')}
          </p>

          <Input
            label={t('settings.orgName')}
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="e.g. Example Corp"
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
              onClick={() => setIsModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={creatingOrg} className="bg-[#7B6CF6] text-white">
              {t('settings.createOrg')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
