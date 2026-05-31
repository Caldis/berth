import i18next, { type i18n as I18n } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Lang } from '@/lib/langs'
import zh from './locales/zh.json'
import en from './locales/en.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'

const resources = {
  zh: { translation: zh },
  en: { translation: en },
  ja: { translation: ja },
  ko: { translation: ko },
}

const cache: Partial<Record<Lang, I18n>> = {}

/**
 * One i18next instance per language. SSG prerenders every language in a single
 * Node process, so a shared singleton would race; isolated instances avoid that.
 */
export function getI18n(lang: Lang): I18n {
  const existing = cache[lang]
  if (existing) return existing
  const instance = i18next.createInstance()
  instance.use(initReactI18next).init({
    lng: lang,
    fallbackLng: 'en',
    resources,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
  cache[lang] = instance
  return instance
}
