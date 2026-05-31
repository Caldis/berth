import { describe, it, expect } from 'vitest'
import { getAllArticles, getArticles, getArticle, PILLAR_ORDER } from './index'
import { LANGS } from '@/lib/langs'

const all = getAllArticles()

describe('knowledge base content model', () => {
  it('has articles', () => {
    expect(all.length).toBeGreaterThan(0)
  })

  it('every article has the required fields populated', () => {
    for (const a of all) {
      expect(a.slug, `slug for ${a.lang}/${a.pillar}`).toBeTruthy()
      expect(a.title, `title for ${a.slug}`).toBeTruthy()
      expect(a.summary, `summary for ${a.slug}`).toBeTruthy()
      expect(a.lead, `lead for ${a.slug}`).toBeTruthy()
      expect(a.body.length, `body for ${a.slug}`).toBeGreaterThan(0)
    }
  })

  it('every article cites at least one source with a valid http(s) URL', () => {
    for (const a of all) {
      expect(a.sources.length, `sources for ${a.lang}/${a.pillar}/${a.slug}`).toBeGreaterThan(0)
      for (const s of a.sources) {
        expect(s.title, `source title in ${a.slug}`).toBeTruthy()
        expect(s.url, `source url in ${a.slug}`).toMatch(/^https?:\/\//)
      }
    }
  })

  it('only uses known pillars and languages', () => {
    for (const a of all) {
      expect(PILLAR_ORDER).toContain(a.pillar)
      expect(LANGS as readonly string[]).toContain(a.lang)
    }
  })

  it('has unique slugs within each (lang, pillar)', () => {
    const seen = new Set<string>()
    for (const a of all) {
      const key = `${a.lang}/${a.pillar}/${a.slug}`
      expect(seen.has(key), `duplicate ${key}`).toBe(false)
      seen.add(key)
    }
  })

  it('keeps every language at content parity with English', () => {
    const enKeys = getArticles('en')
      .map((a) => `${a.pillar}/${a.slug}`)
      .sort()
    for (const lang of LANGS) {
      const keys = getArticles(lang)
        .map((a) => `${a.pillar}/${a.slug}`)
        .sort()
      expect(keys, `parity for ${lang}`).toEqual(enKeys)
    }
  })

  it('body blocks use only known types', () => {
    const allowed = new Set(['p', 'h2', 'list', 'callout'])
    for (const a of all) {
      for (const b of a.body) {
        expect(allowed.has(b.type), `block type ${b.type} in ${a.slug}`).toBe(true)
        if (b.type === 'list') expect(Array.isArray(b.items)).toBe(true)
        else expect(typeof b.text).toBe('string')
      }
    }
  })

  it('getArticle resolves a known article and returns undefined for unknown', () => {
    const first = getArticles('en')[0]
    expect(getArticle('en', first.pillar, first.slug)?.title).toBe(first.title)
    expect(getArticle('en', first.pillar, 'no-such-slug')).toBeUndefined()
  })
})
