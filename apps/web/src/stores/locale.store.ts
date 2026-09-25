import { create } from 'zustand';
import i18n from '../lib/i18n';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '../constants/locale.constants';
import { getApiUrl } from '../lib/api-client';

interface LocaleState {
  locale: Locale;
  setLocale: (lang: string, syncWithBackend?: boolean) => void;
}

function isLocale(value: string | null): value is Locale {
  return value === LOCALES.SPANISH || value === LOCALES.ENGLISH;
}

function syncPreferenceToApi(patch: Record<string, unknown>): void {
  try {
    fetch(getApiUrl('/api/v1/me'), {
      credentials: 'include',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => {
      // Ignore background sync errors when unauthenticated or offline
    });
  } catch {
    // Ignore synchronous exceptions
  }
}

let storedLocale: string | null = null;
if (typeof localStorage !== 'undefined') {
  storedLocale = localStorage.getItem('locale');
}
let initialLocale: Locale = DEFAULT_LOCALE;
if (isLocale(storedLocale)) {
  initialLocale = storedLocale;
}

if (i18n.language !== initialLocale) {
  i18n.changeLanguage(initialLocale);
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: initialLocale,
  setLocale: (lang: string, syncWithBackend = false) => {
    if (!isLocale(lang)) {
      return;
    }

    localStorage.setItem('locale', lang);
    i18n.changeLanguage(lang);
    set({ locale: lang });

    if (syncWithBackend) {
      syncPreferenceToApi({ locale: lang });
    }
  },
}));
