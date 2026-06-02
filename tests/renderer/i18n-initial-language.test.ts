import { describe, expect, it, beforeEach } from 'vitest'
import { resolveInitialLanguage } from '../../src/renderer/src/i18n'

describe('resolveInitialLanguage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('uses saved Chinese language over navigator language', () => {
    localStorage.setItem('berth-language', 'zh')

    expect(resolveInitialLanguage(undefined, 'en-US')).toBe('zh')
  })

  it('uses saved English language over navigator language', () => {
    localStorage.setItem('berth-language', 'en')

    expect(resolveInitialLanguage(undefined, 'zh-CN')).toBe('en')
  })

  it('falls back to navigator language when saved language is invalid', () => {
    expect(resolveInitialLanguage('fr', 'zh-Hans-CN')).toBe('zh')
    expect(resolveInitialLanguage('fr', 'en-US')).toBe('en')
  })

  it('falls back to navigator language when saved language is missing', () => {
    expect(resolveInitialLanguage(null, 'zh-CN')).toBe('zh')
    expect(resolveInitialLanguage(null, 'en-SG')).toBe('en')
  })
})
