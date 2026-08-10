export const LOCALES = {
  SPANISH: 'es',
  ENGLISH: 'en',
} as const;

export type Locale = (typeof LOCALES)[keyof typeof LOCALES];

export const DEFAULT_LOCALE = LOCALES.SPANISH;
