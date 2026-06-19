import { describe, it, expect } from 'vitest'
import { sessionAssetId, sessionPathHash } from '../src/shared/asset-dedupe'

// GH-143: session asset ids are opaque renderer handles + agent-teams lookup keys.
// These goldens freeze the exact format/algorithm so the single-source refactor
// (claude/codex parsers + agent-teams все调用 sessionAssetId) can't drift the id.

describe('sessionAssetId — format frozen (GH-143)', () => {
  it('claude-code → bare session-${id} (no path hash)', () => {
    expect(sessionAssetId('claude-code', 'abc123')).toBe('session-abc123')
    expect(sessionAssetId('claude', 'abc123')).toBe('session-abc123')
  })

  it('codex → codex-session-${id}-${pathHash}', () => {
    const filePath = '/Users/x/.codex/sessions/sess1.jsonl'
    expect(sessionAssetId('codex', 'sess1', filePath)).toBe(
      `codex-session-sess1-${sessionPathHash(filePath)}`
    )
    expect(sessionAssetId('codex', 'sess1', filePath)).toMatch(/^codex-session-sess1-[a-z0-9]+$/)
  })

  it('codex without filePath hashes the empty string', () => {
    expect(sessionAssetId('codex', 's')).toBe(`codex-session-s-${sessionPathHash('')}`)
  })

  it('unknown agent falls back to bare session-${id}', () => {
    expect(sessionAssetId('cursor', 'x')).toBe('session-x')
    expect(sessionAssetId('gemini-cli', 'y')).toBe('session-y')
  })
})

describe('sessionPathHash — djb2 base36, algorithm frozen (GH-143)', () => {
  it('is deterministic', () => {
    expect(sessionPathHash('/a/b/c.jsonl')).toBe(sessionPathHash('/a/b/c.jsonl'))
  })

  it('produces a base36 string', () => {
    expect(sessionPathHash('hello')).toMatch(/^[a-z0-9]+$/)
  })

  it('matches hand-computed djb2 base36 for known inputs (freeze)', () => {
    // 'a' = 97 → base36 "2p"; 'ab' = (97*31+98)=3105 → base36 "2e9".
    expect(sessionPathHash('a')).toBe('2p')
    expect(sessionPathHash('ab')).toBe('2e9')
    expect(sessionPathHash('')).toBe('0')
  })
})
