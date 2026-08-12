import { useTranslation } from 'react-i18next';
import { useLoginPage } from './use-login-page';
import { Input } from '../../components/ui/input';
import { PasswordInput } from '../../components/ui/password-input';
import { Button } from '../../components/ui/button';
import { Check, Shield, KeyRound, ArrowRight, Layers, CheckCircle2, ArrowLeft } from 'lucide-react';

export function LoginPage() {
  const { t } = useTranslation();
  const {
    tab,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    otpCode,
    setOtpCode,
    showOtpStep,
    setShowOtpStep,
    loading,
    error,
    isUserAlreadyExistsError,
    successNotice,
    locale,
    handleTabSelect,
    handleSwitchToSignin,
    handleSubmit,
    handleVerifyOtp,
    handleResendOtp,
    handlePasskeySignIn,
    handleLanguageToggle,
    handleStartSignup,
  } = useLoginPage();

  let isSignup = false;
  if (tab === 'signup') {
    isSignup = true;
  }

  let formTitle = t('auth.signInTitle');
  let formSub = t('auth.signInSub');
  if (isSignup) {
    formTitle = t('auth.signUpTitle');
    formSub = t('auth.signUpSub');
  }

  let submitBtnText = t('auth.continueBtn');
  if (loading) {
    submitBtnText = t('common.loading');
  }

  let verifyOtpBtnText = t('auth.verifyOtpBtn');
  if (loading) {
    verifyOtpBtnText = t('common.loading');
  }

  let signInTabClass =
    'flex-1 py-2 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-slate-200';
  let signUpTabClass =
    'flex-1 py-2 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-slate-200';

  if (!isSignup) {
    signInTabClass =
      'flex-1 py-2 text-xs font-semibold rounded-lg transition-all bg-[#7B6CF6]/20 text-white border border-[#7B6CF6]/40 shadow-sm';
  }

  if (isSignup) {
    signUpTabClass =
      'flex-1 py-2 text-xs font-semibold rounded-lg transition-all bg-[#7B6CF6]/20 text-white border border-[#7B6CF6]/40 shadow-sm';
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Hero Section */}
      <div className="hidden lg:flex relative overflow-hidden bg-linear-to-br from-[#12101F] via-[#0A0B0D] to-[#08090B] border-r border-white/5 p-14 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[#7B6CF6] to-[#4FB0FF] flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-xl tracking-tight text-white">App Template</span>
        </div>

        <div>
          <h1 className="font-bold text-4xl lg:text-5xl leading-tight tracking-tight text-white max-w-lg">
            {t('auth.loginHero')}
          </h1>
          <p className="mt-4 text-base text-slate-400 max-w-md leading-relaxed">
            {t('auth.loginHeroSub')}
          </p>

          <div className="mt-10 space-y-3.5 max-w-md">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xs flex-none">
                <Check className="w-3.5 h-3.5" />
              </span>
              {t('auth.loginBullet1')}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xs flex-none">
                <Check className="w-3.5 h-3.5" />
              </span>
              {t('auth.loginBullet2')}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xs flex-none">
                <Check className="w-3.5 h-3.5" />
              </span>
              {t('auth.loginBullet3')}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-600">
          Better Auth · Fastify 5 · React 19 · PostgreSQL
        </div>
      </div>

      {/* Right Form Section */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleLanguageToggle}
              className="text-xs font-semibold text-slate-400 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-full transition-colors"
            >
              {locale.toUpperCase()}
            </button>
          </div>

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-none" />
              <span>{successNotice}</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
              <Shield className="w-4 h-4 flex-none" />
              <span>{error}</span>
            </div>
          )}

          {isUserAlreadyExistsError && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-2.5">
              <div className="flex items-center gap-2 font-semibold text-amber-200">
                <Shield className="w-4 h-4 text-amber-400 flex-none" />
                <span>{t('auth.userAlreadyExistsTitle')}</span>
              </div>
              <p className="text-slate-300 leading-relaxed">{t('auth.userAlreadyExistsMsg')}</p>
              <Button
                type="button"
                size="sm"
                className="bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 text-xs py-1.5 px-3 rounded-lg"
                onClick={handleSwitchToSignin}
              >
                {t('auth.switchToSignInBtn')}
              </Button>
            </div>
          )}

          {showOtpStep && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-xl text-white tracking-tight">
                  {t('auth.enterOtpTitle')}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {t('auth.enterOtpSub')}{' '}
                  <strong className="text-slate-200 font-semibold">{email}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <Input
                  label={t('auth.otpCodeLabel')}
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="text-center font-mono text-lg tracking-[0.4em] font-bold"
                  required
                />

                <Button
                  type="submit"
                  disabled={loading || otpCode.trim().length < 6}
                  className="w-full py-3 bg-linear-to-r from-[#7B6CF6] to-[#6a5bf0] hover:from-[#6a5bf0] hover:to-[#5c4ce0] text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
                >
                  {verifyOtpBtnText}
                </Button>
              </form>

              <div className="flex justify-between items-center pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowOtpStep(false)}
                  className="text-slate-400 hover:text-white transition-colors font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {t('onboarding.back')}
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-[#7B6CF6] font-semibold hover:underline"
                >
                  {t('auth.resendOtpBtn')}
                </button>
              </div>
            </div>
          )}

          {!showOtpStep && (
            <>
              <div>
                <h2 className="font-bold text-2xl sm:text-3xl text-white tracking-tight">
                  {formTitle}
                </h2>
                <p className="mt-2 text-sm text-slate-400">{formSub}</p>
              </div>

              {/* Tab Switcher */}
              <div className="flex p-1 bg-[#131519] border border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleTabSelect('signin')}
                  className={signInTabClass}
                >
                  {t('auth.signIn')}
                </button>
                <button
                  type="button"
                  onClick={() => handleTabSelect('signup')}
                  className={signUpTabClass}
                >
                  {t('auth.signUp')}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignup && (
                  <Input
                    label={t('auth.name')}
                    type="text"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                )}

                <Input
                  label={t('auth.email')}
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <PasswordInput
                  label={t('auth.password')}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <Button
                  type="submit"
                  className="w-full py-3 bg-linear-to-r from-[#7B6CF6] to-[#6a5bf0] hover:from-[#6a5bf0] hover:to-[#5c4ce0] text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
                  disabled={loading}
                >
                  {submitBtnText}
                </Button>
              </form>

              {/* Passkeys Link for Sign In */}
              {!isSignup && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#08090B] px-3 text-slate-500 font-medium">
                        {t('auth.orContinue')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePasskeySignIn}
                      className="flex-1 bg-[#131519] border-white/10 text-slate-200 hover:bg-white/5 py-2.5 rounded-xl text-xs gap-2"
                    >
                      <KeyRound className="w-4 h-4 text-[#7B6CF6]" />
                      Passkey
                    </Button>
                  </div>
                </>
              )}

              {/* Dynamic Footer Link */}
              {!isSignup && (
                <div className="text-center pt-4">
                  <span className="text-xs text-slate-400">{t('auth.dontHaveAccount')} </span>
                  <button
                    type="button"
                    onClick={handleStartSignup}
                    className="text-xs font-semibold text-[#7B6CF6] hover:underline inline-flex items-center gap-1"
                  >
                    {t('auth.signUp')}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {isSignup && (
                <div className="text-center pt-4">
                  <span className="text-xs text-slate-400">{t('auth.alreadyHaveAccount')} </span>
                  <button
                    type="button"
                    onClick={() => handleTabSelect('signin')}
                    className="text-xs font-semibold text-[#7B6CF6] hover:underline inline-flex items-center gap-1"
                  >
                    {t('auth.signIn')}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
