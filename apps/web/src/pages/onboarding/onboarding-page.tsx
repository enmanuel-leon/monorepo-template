import { useTranslation } from 'react-i18next';
import { useOnboardingPage } from './use-onboarding-page';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { CustomCountrySelect } from '../../components/ui/custom-country-select';
import { CountryFlag } from '../../components/ui/country-flag';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Lock,
  Layers,
  CheckCircle2,
  User,
  Globe,
  Rocket,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function OnboardingPage() {
  const { t } = useTranslation();
  const {
    step,
    displayName,
    setDisplayName,
    countryCode,
    setCountryCode,
    selectedTimezone,
    countries,
    orgName,
    setOrgName,
    loading,
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    locale,
    handleNext,
    handleBack,
    handleConfirmLaunch,
    handleLanguageSelect,
  } = useOnboardingPage();

  let isStep1 = false;
  let isStep2 = false;
  let isStep3 = false;

  if (step === 1) {
    isStep1 = true;
  }
  if (step === 2) {
    isStep2 = true;
  }
  if (step === 3) {
    isStep3 = true;
  }

  let stepTitle = t('onboarding.step1Title');
  let stepSub = t('onboarding.step1Sub');
  if (isStep2) {
    stepTitle = t('onboarding.step2Title');
    stepSub = t('onboarding.step2Sub');
  } else if (isStep3) {
    stepTitle = t('onboarding.step3Title');
    stepSub = t('onboarding.step3Sub');
  }

  const selectedCountryObj = countries.find((c) => c.code === countryCode);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7B6CF6] to-[#4FB0FF] flex items-center justify-center font-bold text-white text-base">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-white">App Template</span>
          </div>

          <select
            value={locale}
            onChange={(e) => handleLanguageSelect(e.target.value)}
            className="text-xs font-semibold bg-[#131519] text-slate-300 border border-white/10 px-3 py-1.5 rounded-full focus:outline-none focus:border-[#7B6CF6]"
          >
            <option value="es">Español (ES)</option>
            <option value="en">English (EN)</option>
          </select>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2">
          <div
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-[#7B6CF6]' : 'bg-slate-800'}`}
          />
          <div
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-[#7B6CF6]' : 'bg-slate-800'}`}
          />
          <div
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-[#7B6CF6]' : 'bg-slate-800'}`}
          />
        </div>

        <div>
          <span className="text-xs font-semibold text-[#7B6CF6] tracking-wider uppercase">
            {t('onboarding.step')} {step} / 3
          </span>
          <h2 className="font-bold text-2xl sm:text-3xl text-white tracking-tight mt-1">
            {stepTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{stepSub}</p>
        </div>

        {/* Card Body with Motion Step Transition */}
        <div className="bg-[#101216] border border-white/10 rounded-2xl p-6 sm:p-8 min-h-[220px] relative">
          <AnimatePresence mode="wait">
            {isStep1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="space-y-4"
              >
                <Input
                  label={t('auth.name')}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jane Doe"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="relative z-20">
                    <CustomCountrySelect
                      label={t('onboarding.country')}
                      value={countryCode}
                      onChange={setCountryCode}
                      countries={countries}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="timezone-display"
                      className="block text-xs font-semibold text-slate-300 mb-1"
                    >
                      {t('onboarding.timezone')}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="timezone-display"
                        value={selectedTimezone ? selectedTimezone.displayName : 'Loading...'}
                        readOnly
                        className="w-full bg-[#131519]/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 cursor-not-allowed pr-9"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {isStep2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#131519] border border-white/10 mb-4">
                  <Building2 className="w-5 h-5 text-[#7B6CF6] flex-none" />
                  <span className="text-xs text-slate-300 leading-relaxed">
                    {t('onboarding.orgHelp')}
                  </span>
                </div>

                <Input
                  label={t('onboarding.orgName')}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Example Corp"
                  required
                />
              </motion.div>
            )}

            {isStep3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-[#7B6CF6] uppercase tracking-wider mb-2">
                  <CheckCircle2 className="w-4 h-4 text-[#7B6CF6]" />
                  <span>{t('onboarding.previewTitle')}</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#131519] p-4 space-y-3.5 text-xs text-slate-300">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-slate-400 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      {t('auth.name')}
                    </span>
                    <span className="font-semibold text-white">{displayName || 'Jane Doe'}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                      {t('onboarding.country')}
                    </span>
                    <span className="font-semibold text-white flex items-center gap-2">
                      <CountryFlag countryCode={countryCode} className="w-4 h-3 rounded-xs" />
                      {selectedCountryObj ? selectedCountryObj.name : countryCode}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      {t('onboarding.timezone')}
                    </span>
                    <span className="font-semibold text-white">
                      {selectedTimezone ? selectedTimezone.displayName : 'UTC'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      {t('onboarding.orgName')}
                    </span>
                    <span className="font-semibold text-[#7B6CF6] bg-[#7B6CF6]/10 px-2.5 py-1 rounded-md border border-[#7B6CF6]/30">
                      {orgName || 'Example Corp'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between gap-4 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="border-white/10 text-slate-300 bg-transparent px-5 py-2.5 rounded-xl gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('onboarding.back')}
          </Button>

          <Button
            type="button"
            onClick={handleNext}
            disabled={loading || (isStep2 && !orgName.trim())}
            className="bg-gradient-to-r from-[#7B6CF6] to-[#6a5bf0] text-white px-6 py-2.5 rounded-xl gap-2 font-semibold shadow-lg shadow-indigo-500/20"
          >
            <span>{isStep3 ? t('onboarding.confirmAndLaunch') : t('auth.continueBtn')}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title={t('onboarding.confirmLaunchTitle')}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#7B6CF6]/10 border border-[#7B6CF6]/30 text-xs text-slate-200">
            <Rocket className="w-5 h-5 text-[#7B6CF6] flex-none" />
            <span>{t('onboarding.confirmLaunchDesc')}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/10 text-slate-300"
              onClick={() => setIsConfirmModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleConfirmLaunch}
              disabled={loading}
              className="bg-gradient-to-r from-[#7B6CF6] to-[#6a5bf0] text-white font-semibold"
            >
              {loading ? t('common.loading') : t('onboarding.confirmAndLaunch')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
