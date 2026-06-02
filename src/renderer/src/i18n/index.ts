import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import zh from './locales/zh.json'

const SUPPORTED_LANGUAGES = ['en', 'zh'] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage)
}

function readStoredLanguage(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem('berth-language')
  } catch {
    return null
  }
}

function getNavigatorLanguage(): string {
  return typeof navigator === 'undefined' ? 'en' : navigator.language
}

export function resolveInitialLanguage(
  storedLanguage: string | null | undefined = readStoredLanguage(),
  navigatorLanguage: string = getNavigatorLanguage()
): SupportedLanguage {
  if (isSupportedLanguage(storedLanguage)) return storedLanguage
  return navigatorLanguage.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh }
  },
  lng: resolveInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
})

export default i18n
