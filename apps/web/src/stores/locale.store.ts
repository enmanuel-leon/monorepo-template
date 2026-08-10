import { create } from 'zustand';
import i18n from '../lib/i18n';
import { DEFAULT_LOCALE, type Locale } from '../constants/locale.constants';

interface LocaleState {
  locale: Locale;
  setLocale: (lang: Locale | string) => void;
}

const initialLocale =
  (typeof localStorage !== 'undefined' && (localStorage.getItem('locale') as Locale)) ||
  DEFAULT_LOCALE;

if (i18n.language !== initialLocale) {
  i18n.changeLanguage(initialLocale);
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: initialLocale,
  setLocale: (lang: Locale | string) => {
    localStorage.setItem('locale', lang);
    i18n.changeLanguage(lang);
    set({ locale: lang as Locale });
  },
}));
