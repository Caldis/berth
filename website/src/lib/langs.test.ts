import { describe, it, expect } from 'vitest'
import { isLang, LANGS, DEFAULT_LANG, HREFLANG } from './langs'

/** Mirrors useLang's path-segment logic without React/router. */
function langFromPath(pathname: string) {
  const segment = pathname.split('/')[1]
  return isLang(segment) ? segment : DEFAULT_LANG
}

describe('language helpers', () => {
  it('isLang accepts known languages and rejects others', () => {
    expect(isLang('zh')).toBe(true)
    expect(isLang('en')).toBe(true)
    expect(isLang('ja')).toBe(true)
    expect(isLang('ko')).toBe(true)
    expect(isLang('fr')).toBe(false)
    expect(isLang(undefined)).toBe(false)
    expect(isLang('')).toBe(false)
  })

  it('derives the language from the first path segment', () => {
    expect(langFromPath('/zh')).toBe('zh')
    expect(langFromPath('/ja/knowledge/understand/what-is-an-agent')).toBe('ja')
    expect(langFromPath('/ko/features')).toBe('ko')
  })

  it('falls back to the default language for unknown or root paths', () => {
    expect(langFromPath('/')).toBe(DEFAULT_LANG)
    expect(langFromPath('/fr/features')).toBe(DEFAULT_LANG)
    expect(langFromPath('/knowledge')).toBe(DEFAULT_LANG)
  })

  it('every language has an hreflang mapping', () => {
    for (const l of LANGS) {
      expect(HREFLANG[l]).toBeTruthy()
    }
  })
})
