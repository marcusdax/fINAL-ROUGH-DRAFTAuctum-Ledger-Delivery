import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

export const SUPPORTED_LOCALES = [
  'en-US',
  'zh-CN',
  'es-MX',
  'pt-BR',
  'vi-VN',
  'de-DE',
  'fr-FR',
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en-US'

export const LOCALE_STORAGE_KEY = 'auctum:locale'

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/**
 * Best-effort locale resolution for the bare `/` redirect.
 * Order: persisted choice (localStorage "auctum:locale") > navigator > default.
 * Path detection is handled by i18next-browser-languagedetector itself.
 */
export function detectLocale(): SupportedLocale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isSupportedLocale(stored)) return stored
  } catch {
    // localStorage may be unavailable (privacy mode) — fall through.
  }
  const candidates =
    typeof navigator !== 'undefined'
      ? [...(navigator.languages ?? []), navigator.language].filter(Boolean)
      : []
  for (const candidate of candidates) {
    if (isSupportedLocale(candidate)) return candidate
    const prefix = candidate.split('-')[0]
    const match = SUPPORTED_LOCALES.find((l) => l.split('-')[0] === prefix)
    if (match) return match
  }
  return DEFAULT_LOCALE
}

export function persistLocale(locale: SupportedLocale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Non-fatal: the route prefix still carries the locale.
  }
}

void i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    nonExplicitSupportedLngs: false,
    load: 'currentOnly',
    returnEmptyString: false,
    saveMissing: false,
    ns: ['common', 'errors'], // preload set; other namespaces lazy-load per route
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0,
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: true,
    },
  })

export default i18n
