import { describe, expect, it } from 'vitest'
import { allAssetGuides, buildAssetGuideEvidence } from '../../src/renderer/src/lib/asset-guidance'

describe('asset guidance definitions', () => {
  it('keeps every guide connected to official documentation and provider mapping', () => {
    expect(allAssetGuides.length).toBeGreaterThan(0)

    for (const guide of allAssetGuides) {
      expect(guide.docLinks.length).toBeGreaterThan(0)
      expect(guide.providerMappings.length).toBeGreaterThan(0)

      for (const doc of guide.docLinks) {
        expect(doc.url).toMatch(/^https:\/\//)
        expect(doc.labelKey).toMatch(/guidance\.docs\./)
      }
    }
  })

  it('summarizes visible evidence without reading raw asset bodies', () => {
    const evidence = buildAssetGuideEvidence([
      { agentId: 'claude-code', path: '/tmp/a.json' },
      { agentId: 'codex', path: '/tmp/b.toml' },
      { agentId: 'codex', path: '/tmp/b.toml' }
    ], 1)

    expect(evidence).toEqual([
      { labelKey: 'assetGuide.evidence.assets', value: 3 },
      { labelKey: 'assetGuide.evidence.sources', value: 2 },
      { labelKey: 'assetGuide.evidence.providers', value: 2 },
      { labelKey: 'assetGuide.evidence.risks', value: 1, tone: 'warning' }
    ])
  })
})
