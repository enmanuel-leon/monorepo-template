import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import es from '../locales/es.json';
import { DEFAULT_LOCALE } from '../constants/locale.constants';

const initialLocale =
  (typeof localStorage !== 'undefined' && localStorage.getItem('locale')) || DEFAULT_LOCALE;

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: initialLocale,
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
