import { describe, expect, it } from 'vitest'
import {
  allFeatureGuides,
  buildFeatureGuideEvidence,
  capabilityGuideMap,
  instructionGuideMap,
  sessionGuide,
  type FeatureGuideDefinition
} from '../../src/renderer/src/lib/feature-guidance'

function expectDocBackedGuide(guide: FeatureGuideDefinition): void {
  expect(guide.id).toBeTruthy()
  expect(guide.titleKey).toBeTruthy()
  expect(guide.summaryKey).toBeTruthy()
  expect(guide.docLinks?.length).toBeGreaterThan(0)
  expect(guide.providerMappings?.length).toBeGreaterThan(0)

  for (const doc of guide.docLinks ?? []) {
    expect(doc.url).toMatch(/^https:\/\//)
  }
}

describe('feature guidance definitions', () => {
  it('covers instructions, memories, capabilities, and sessions with one schema', () => {
    expect(instructionGuideMap.memories.id).toBe('instructions.memories')
    expect(instructionGuideMap.conventions.id).toBe('instructions.conventions')
    expect(capabilityGuideMap.hooks.id).toBe('capabilities.hooks')
    expect(capabilityGuideMap.statusLine.id).toBe('capabilities.statusLine')
    expect(sessionGuide.id).toBe('sessions.index')
  })

  it('keeps documentation-backed feature guides structurally complete', () => {
    for (const guide of allFeatureGuides) {
      expectDocBackedGuide(guide)
    }
  })

  it('promotes hooks and status line explanation cards into reusable insights', () => {
    expect(capabilityGuideMap.hooks.insightKeys?.map((item) => item.titleKey)).toContain('capabilities.hooks.intro.tips.trigger.title')
    expect(capabilityGuideMap.hooks.insightKeys?.map((item) => item.titleKey)).toContain('capabilities.hooks.intro.tips.handler.title')
    expect(capabilityGuideMap.statusLine.insightKeys?.map((item) => item.titleKey)).toContain('capabilities.statusLine.model.claude.title')
    expect(capabilityGuideMap.statusLine.insightKeys?.map((item) => item.titleKey)).toContain('capabilities.statusLine.model.codex.title')
  })

  it('summarizes visible evidence without reading raw asset bodies', () => {
    const evidence = buildFeatureGuideEvidence([
      { agentId: 'claude-code', path: '/tmp/a.json' },
      { agentId: 'codex', path: '/tmp/b.toml' },
      { agentId: 'codex', path: '/tmp/b.toml' }
    ], 1)

    expect(evidence).toEqual([
      { labelKey: 'assetGuide.evidence.assets', helpKey: 'assetGuide.evidenceHelp.assets', value: 3 },
      { labelKey: 'assetGuide.evidence.sources', helpKey: 'assetGuide.evidenceHelp.sources', value: 2 },
      { labelKey: 'assetGuide.evidence.providers', helpKey: 'assetGuide.evidenceHelp.providers', value: 2 },
      { labelKey: 'assetGuide.evidence.risks', helpKey: 'assetGuide.evidenceHelp.risks', value: 1, tone: 'warning' }
    ])
  })
})
