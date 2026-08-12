import { create } from 'zustand';
import i18n from '../lib/i18n';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '../constants/locale.constants';

interface LocaleState {
  locale: Locale;
  setLocale: (lang: string) => void;
}

function isLocale(value: string | null): value is Locale {
  return value === LOCALES.SPANISH || value === LOCALES.ENGLISH;
}

let storedLocale: string | null = null;
if (typeof localStorage !== 'undefined') {
  storedLocale = localStorage.getItem('locale');
}
const initialLocale = isLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE;

if (i18n.language !== initialLocale) {
  i18n.changeLanguage(initialLocale);
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: initialLocale,
  setLocale: (lang: string) => {
    if (!isLocale(lang)) {
      return;
    }

    localStorage.setItem('locale', lang);
    i18n.changeLanguage(lang);
    set({ locale: lang });
  },
}));
