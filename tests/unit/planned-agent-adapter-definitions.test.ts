import { describe, expect, it } from 'vitest'
import { PLANNED_AGENT_ADAPTER_DEFINITIONS } from '@berth/scan-engine'

const plannedIds = [
  'gemini-cli',
  'github-copilot-cli',
  'cursor',
  'opencode',
  'openclaw',
  'hermes-agent'
]

const sourceCodePrefixes: Record<string, string> = {
  'gemini-cli': 'gemini',
  'github-copilot-cli': 'copilot',
  cursor: 'cursor',
  opencode: 'opencode',
  openclaw: 'openclaw',
  'hermes-agent': 'hermes'
}

describe('planned agent adapter definitions', () => {
  it('declares every requested agent as an independently versioned adapter candidate', () => {
    expect(PLANNED_AGENT_ADAPTER_DEFINITIONS.map((definition) => definition.id)).toEqual(plannedIds)
    for (const definition of PLANNED_AGENT_ADAPTER_DEFINITIONS) {
      expect(definition.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(definition.homepageUrl).toMatch(/^https:\/\//)
      expect(definition.downloadUrl).toMatch(/^https:\/\//)
      expect(definition.agentCompatibility?.agentId).toBe(definition.id)
      expect(definition.permissions).toEqual([
        expect.objectContaining({ kind: 'read' })
      ])
    }
  })

  it('declares package-manager identity for independently updatable CLI adapters', () => {
    expect(packageNameFor('gemini-cli')).toBe('@google/gemini-cli')
    expect(packageNameFor('github-copilot-cli')).toBe('@github/copilot')
    expect(packageNameFor('opencode')).toBe('opencode-ai')
    expect(packageNameFor('openclaw')).toBe('openclaw')
    expect(packageNameFor('hermes-agent')).toBe('hermes-agent')
  })

  it('keeps source declarations evidence-backed and read-only by policy', () => {
    for (const definition of PLANNED_AGENT_ADAPTER_DEFINITIONS) {
      expect(definition.sources.length).toBeGreaterThan(0)
      const prefix = sourceCodePrefixes[definition.id]
      for (const source of definition.sources) {
        expect(source.code).toMatch(new RegExp(`^${prefix}\\.`))
        expect(source.pathPattern).not.toHaveLength(0)
        expect(source.evidenceUrls.every((url) => url.startsWith('https://'))).toBe(true)
        expect(['official-docs', 'primary-source', 'heuristic']).toContain(source.stability)
        expect(['normal', 'sensitive-metadata-only', 'credential-presence-only', 'debug-summary-only'])
          .toContain(source.sensitivity)
      }
    }
  })

  it('marks session, log, and credential-like sources as metadata or summary only', () => {
    const sensitiveSources = PLANNED_AGENT_ADAPTER_DEFINITIONS
      .flatMap((definition) => definition.sources)
      .filter((source) =>
        source.code.includes('session') ||
        source.code.includes('logs') ||
        source.code.includes('state') ||
        source.code.includes('credential') ||
        source.code.includes('auth') ||
        source.code.includes('token')
      )

    expect(sensitiveSources.length).toBeGreaterThan(0)
    expect(sensitiveSources.every((source) => source.sensitivity !== 'normal')).toBe(true)
  })
})

function packageNameFor(id: string): string | undefined {
  return PLANNED_AGENT_ADAPTER_DEFINITIONS.find((definition) => definition.id === id)?.versionProbe?.packageName
}
