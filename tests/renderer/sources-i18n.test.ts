import { describe, expect, it, afterAll } from 'vitest'
import i18n from '../../src/renderer/src/i18n'

// GH-146: sources.* namespace was extracted from the hardcoded EN/ZH_SOURCE_COPY dictionaries
// in local-source-copy.ts. This locks the ZH drift trap: status.missing MUST stay "未发现"
// (NOT settings.agentPluginSourceRowStatus's "缺失"), and a code title must match the
// original dictionary text in both languages. A missing key makes t() echo the key string,
// so equality assertions also guard key presence and the dotted flat-key lookup path.

describe('sources i18n', () => {
  afterAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('locks the source status labels in zh (missing must be 未发现, not 缺失)', async () => {
    await i18n.changeLanguage('zh')
    expect(i18n.t('sources.status.scanned')).toBe('已扫描')
    expect(i18n.t('sources.status.missing')).toBe('未发现')
    expect(i18n.t('sources.status.not-scanned')).toBe('未扫描')
  })

  it('locks the source status labels in en', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('sources.status.scanned')).toBe('Scanned')
    expect(i18n.t('sources.status.missing')).toBe('Missing')
    expect(i18n.t('sources.status.not-scanned')).toBe('Not scanned')
  })

  it('resolves a dotted source code title in both languages', async () => {
    // The code segment itself contains dots; it is stored as a single flat key under
    // sources.code, and t() with default keySeparator must still resolve it.
    await i18n.changeLanguage('en')
    expect(i18n.t('sources.code.claude.user.data-directory.title')).toBe('Claude Code data directory')

    await i18n.changeLanguage('zh')
    expect(i18n.t('sources.code.claude.user.data-directory.title')).toBe('Claude Code 数据目录')
  })

  it('orders the status count by language (en count-first, zh label-first)', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('sources.statusCount', { count: 2, label: 'Scanned' })).toBe('2 Scanned')

    await i18n.changeLanguage('zh')
    expect(i18n.t('sources.statusCount', { count: 1, label: '未发现' })).toBe('未发现 1')
  })
})
