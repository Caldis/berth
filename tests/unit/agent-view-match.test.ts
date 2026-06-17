import { describe, expect, it } from 'vitest'
import { matchesAgentView } from '@berth/scan-engine/shared/scope'

describe('matchesAgentView', () => {
  it("treats 'all' / undefined as matching every agent", () => {
    expect(matchesAgentView('claude-code', 'all')).toBe(true)
    expect(matchesAgentView('cursor', 'all')).toBe(true)
    expect(matchesAgentView('codex', undefined)).toBe(true)
  })

  it("keeps 'claude' / 'codex' aliases backward-compatible", () => {
    expect(matchesAgentView('claude-code', 'claude')).toBe(true)
    expect(matchesAgentView('claude', 'claude')).toBe(true)
    expect(matchesAgentView('codex', 'claude')).toBe(false)
    expect(matchesAgentView('codex', 'codex')).toBe(true)
    expect(matchesAgentView('claude-code', 'codex')).toBe(false)
  })

  it('matches any other agent by exact agentId (the 6 newer agents become filterable)', () => {
    expect(matchesAgentView('cursor', 'cursor')).toBe(true)
    expect(matchesAgentView('gemini-cli', 'gemini-cli')).toBe(true)
    expect(matchesAgentView('github-copilot-cli', 'github-copilot-cli')).toBe(true)
    expect(matchesAgentView('cursor', 'gemini-cli')).toBe(false)
    expect(matchesAgentView('claude-code', 'cursor')).toBe(false)
  })
})
