import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from '../locales/en.json'
import am from '../locales/am.json'
import om from '../locales/om.json'

/** Supported UI languages, in toggle-cycle order. */
export const LANGUAGES = ['en', 'am', 'om'] as const
export type AppLanguage = (typeof LANGUAGES)[number]

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  am: 'አማርኛ',
  om: 'Afaan Oromoo',
}

/** The next language in the en → am → om cycle. Handles region codes like "en-US". */
export function nextLanguage(current: string): AppLanguage {
  const base = (current || 'en').split('-')[0] as AppLanguage
  const i = LANGUAGES.indexOf(base)
  return LANGUAGES[(i + 1) % LANGUAGES.length]
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      am: { translation: am },
      om: { translation: om },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
