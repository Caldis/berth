export const LANGS = ['zh', 'en', 'ja', 'ko'] as const
export type Lang = (typeof LANGS)[number]

export const DEFAULT_LANG: Lang = 'en'

export const LANG_LABELS: Record<Lang, string> = {
  zh: '简体中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
}

/** hreflang codes for <link rel="alternate"> */
export const HREFLANG: Record<Lang, string> = {
  zh: 'zh-Hans',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
}

export function isLang(value: string | undefined): value is Lang {
  return !!value && (LANGS as readonly string[]).includes(value)
}
