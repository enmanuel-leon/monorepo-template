import { useTranslation } from 'react-i18next';
import { useSettingsPage } from './use-settings-page';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { CustomCountrySelect } from '../../components/ui/custom-country-select';
import { Lock, Plus, Building2 } from 'lucide-react';

interface OrgItem {
  id: string;
  name: string;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const {
    user,
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
    handleSaveProfile,
    handleCreateOrganization,
    handleSelectOrg,
  } = useSettingsPage();

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {t('settings.title')}
      </h1>

      {/* User Profile Card */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101216] p-6 shadow-sm space-y-4">
        <h2 className="text-md font-semibold text-slate-900 dark:text-white">
          {t('settings.profileTab')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={t('auth.name')} value={name} onChange={(e) => setName(e.target.value)} />
          <Input label={t('auth.email')} value={user?.email || ''} readOnly />

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
                value={selectedTimezone ? selectedTimezone.displayName : 'UTC'}
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

      {/* Organization Section */}
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

          <Button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-[#7B6CF6] text-white hover:bg-[#6a5bf0] text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t('settings.createOrg')}</span>
          </Button>
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

              return (
                <div
                  key={org.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#131519] p-3.5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#7B6CF6]/15 flex items-center justify-center text-[#7B6CF6]">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                      {org.name}
                    </span>
                  </div>

                  {isCurrent ? (
                    <span className="text-xs font-semibold text-[#7B6CF6] bg-[#7B6CF6]/10 border border-[#7B6CF6]/30 px-3 py-1 rounded-full">
                      {t('settings.active')}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
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
      </div>

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
