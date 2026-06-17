import { describe, expect, it } from 'vitest'
import { agentDisplayName } from '@/lib/agent-meta'

describe('agentDisplayName', () => {
  it('maps all scanned agent ids to proper display names', () => {
    expect(agentDisplayName('claude-code')).toBe('Claude Code')
    expect(agentDisplayName('claude')).toBe('Claude Code')
    expect(agentDisplayName('codex')).toBe('Codex')
    expect(agentDisplayName('cursor')).toBe('Cursor')
    expect(agentDisplayName('gemini-cli')).toBe('Gemini CLI')
    expect(agentDisplayName('github-copilot-cli')).toBe('GitHub Copilot CLI')
    expect(agentDisplayName('opencode')).toBe('OpenCode')
    expect(agentDisplayName('openclaw')).toBe('OpenClaw')
    expect(agentDisplayName('hermes-agent')).toBe('Hermes Agent')
  })

  it('falls back to Title Case for unknown ids (never mislabels to a known agent)', () => {
    expect(agentDisplayName('some-new-agent')).toBe('Some New Agent')
    expect(agentDisplayName('foo_bar')).toBe('Foo Bar')
    expect(agentDisplayName('zed')).toBe('Zed')
  })
})
