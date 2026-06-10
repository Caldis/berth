import { describe, expect, it, afterAll } from 'vitest'
import i18n from '../../src/renderer/src/i18n'

// Accent ids mirror the `accents` picker list in src/renderer/src/components/settings/settings-content.tsx.
const ACCENT_IDS = ['neutral', 'blue', 'violet', 'emerald', 'amber', 'rose'] as const

const EN: Record<(typeof ACCENT_IDS)[number], string> = {
  neutral: 'Neutral',
  blue: 'Blue',
  violet: 'Violet',
  emerald: 'Emerald',
  amber: 'Amber',
  rose: 'Rose'
}

const ZH: Record<(typeof ACCENT_IDS)[number], string> = {
  neutral: '中性',
  blue: '蓝',
  violet: '紫',
  emerald: '绿',
  amber: '琥珀',
  rose: '玫瑰'
}

describe('settings accent i18n', () => {
  afterAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('localizes accent names and the picker label in zh', async () => {
    await i18n.changeLanguage('zh')
    for (const id of ACCENT_IDS) {
      // A missing key would make t() echo the key string, so this also guards key presence.
      expect(i18n.t(`settings.accent.${id}`)).toBe(ZH[id])
    }
    expect(i18n.t('settings.accentColor')).toBe('强调色')
  })

  it('localizes accent names and the picker label in en', async () => {
    await i18n.changeLanguage('en')
    for (const id of ACCENT_IDS) {
      expect(i18n.t(`settings.accent.${id}`)).toBe(EN[id])
    }
    expect(i18n.t('settings.accentColor')).toBe('Accent color')
  })
})
