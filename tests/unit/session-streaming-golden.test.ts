import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseSessionMeta } from '@berth/scan-engine/adapters/claude-code/parsers'
import { parseClaudeSessionDetail } from '@berth/scan-engine/adapters/claude-code/session-detail'
import { parseClaudeSessionReplay } from '@berth/scan-engine/adapters/claude-code/session-replay'
import {
  parseCodexSessionMeta,
  parseCodexSessionDetail
} from '@berth/scan-engine/adapters/codex/parsers'
import { parseCodexSessionReplay } from '@berth/scan-engine/adapters/codex/session-replay'
import {
  buildSessionReplay,
  readSessionReplayEventPayload
} from '@berth/scan-engine/engine/session-replay'
import type { Asset } from '@shared/types/asset'

// GH-148 — GOLDEN "behaviour unchanged" iron proof for the readFileSync+split →
// streaming-iterator swap at all 6 session read points.
//
// NON-CIRCULAR EQUIVALENCE STRATEGY: each adversarial transcript is written two
// ways to two files:
//   (A) the authored bytes verbatim — CRLF endings, blank lines, multibyte chars,
//       no trailing newline.
//   (B) a CANONICAL form: split the same text with `split(/\r?\n/)` (the exact
//       legacy line model) and rejoin with '\n' + a trailing '\n'.
// The streaming parser runs on BOTH. (B) has every `\r` already removed by split
// and blank lines preserved at the same positions, so it represents the line
// stream the OLD readFileSync+split code fed the parser. If the new streaming
// path on (A) deep-equals the parser on (B), then the iterator's line model
// (\r stripping, blank-line/lineIndex handling, no-trailing-newline tail) matches
// split end-to-end THROUGH THE REAL PARSER — with no hand-computed field values
// and no shared splitting code. A stray `\r` in a JSON field, an off-by-one
// lineIndex, or a dropped final line would all surface as a deep-equal failure.

let tempDir: string | null = null

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

function dir(): string {
  tempDir ??= fs.mkdtempSync(path.join(os.tmpdir(), 'berth-golden-'))
  return tempDir
}

/** Write authored bytes (A) + the split-canonical form (B); return both paths. */
function writePair(name: string, authored: string): { raw: string; canonical: string } {
  const rawPath = path.join(dir(), `${name}.raw.jsonl`)
  const canonPath = path.join(dir(), `${name}.canon.jsonl`)
  fs.writeFileSync(rawPath, authored)
  const canonicalText = authored.split(/\r?\n/).join('\n') + '\n'
  fs.writeFileSync(canonPath, canonicalText)
  return { raw: rawPath, canonical: canonPath }
}

function asset(filePath: string, agentId: 'claude-code' | 'codex'): Asset {
  return {
    id: agentId === 'codex' ? 'codex-session-g' : 'session-g',
    agentId,
    category: 'state',
    type: 'session',
    scope: 'session',
    name: 'Golden Session',
    path: filePath,
    meta: {}
  }
}

/**
 * Adversarial Claude transcript: CRLF on some lines, a blank line, a malformed
 * line (counts), a multibyte field, a usage record, a skill + mcp tool_use,
 * a tool_use/tool_result pair, a file-history-snapshot, and NO trailing newline.
 * Mixed \n and \r\n within one file is the whole point — it exercises \r drop.
 */
function claudeTranscript(): string {
  const records = [
    JSON.stringify({
      type: 'last-prompt',
      timestamp: '2026-06-18T01:00:00.000Z',
      sessionId: 'golden-claude',
      cwd: '/Users/x/项目',
      message: { content: '请修复 🐛 bug' }
    }),
    JSON.stringify({ type: 'ai-title', timestamp: '2026-06-18T01:00:01.000Z', aiTitle: '修复 unicode 🚀' }),
    '', // blank line — must occupy a line slot without breaking index alignment
    '{ not valid json',
    JSON.stringify({
      type: 'assistant',
      timestamp: '2026-06-18T01:00:02.000Z',
      message: {
        id: 'msg-1',
        model: 'claude-opus-4-8',
        usage: {
          input_tokens: 11,
          output_tokens: 7,
          cache_read_input_tokens: 4,
          cache_creation_input_tokens: 2
        },
        content: [
          { type: 'thinking', thinking: 'multi\nline thought with 中文' },
          { type: 'text', text: 'Doing the work — 完成' },
          { type: 'tool_use', id: 'call-1', name: 'Skill', input: { skill: 'frontend-design' } },
          {
            type: 'tool_use',
            id: 'call-2',
            name: 'mcp__plugin_playwright_playwright__browser_navigate',
            input: { url: 'http://localhost:5173/路径' }
          }
        ]
      }
    }),
    JSON.stringify({
      type: 'user',
      timestamp: '2026-06-18T01:00:03.000Z',
      message: { content: [{ type: 'tool_result', tool_use_id: 'call-1', is_error: false, content: '结果 ✅' }] }
    }),
    JSON.stringify({
      type: 'system',
      subtype: 'stop_hook_summary',
      timestamp: '2026-06-18T01:00:04.000Z',
      hookCount: 3
    }),
    JSON.stringify({
      type: 'file-history-snapshot',
      timestamp: '2026-06-18T01:00:05.000Z',
      snapshot: { trackedFileBackups: [{ filePath: '/Users/x/项目/src/main.ts' }] }
    })
  ]
  // Interleave \r\n and \n endings; deliberately end WITHOUT a trailing newline.
  return (
    records[0] + '\r\n' +
    records[1] + '\n' +
    records[2] + '\r\n' + // blank line terminated by CRLF
    records[3] + '\n' +
    records[4] + '\r\n' +
    records[5] + '\n' +
    records[6] + '\r\n' +
    records[7] // no trailing newline
  )
}

function codexTranscript(): string {
  const records = [
    JSON.stringify({
      type: 'session_meta',
      timestamp: '2026-06-18T02:00:00.000Z',
      payload: { id: 'golden-codex', cwd: '/Users/x/项目', model: 'gpt-5.5', cli_version: '1.2.3' }
    }),
    JSON.stringify({
      type: 'event_msg',
      timestamp: '2026-06-18T02:00:01.000Z',
      payload: { type: 'user_message', message: '请实现 feature 🚀' }
    }),
    '',
    '{ broken codex line',
    JSON.stringify({
      type: 'response_item',
      timestamp: '2026-06-18T02:00:02.000Z',
      payload: {
        type: 'function_call',
        call_id: 'cx-1',
        name: 'shell_command',
        arguments: JSON.stringify({ command: 'echo 完成 && ls src/路径' })
      }
    }),
    JSON.stringify({
      type: 'response_item',
      timestamp: '2026-06-18T02:00:03.000Z',
      payload: { type: 'function_call_output', call_id: 'cx-1', is_error: false, output: '输出 ✅', duration_ms: 42 }
    }),
    JSON.stringify({
      type: 'event_msg',
      timestamp: '2026-06-18T02:00:04.000Z',
      payload: { type: 'agent_message', message: '已完成 — done' }
    }),
    JSON.stringify({
      type: 'event_msg',
      timestamp: '2026-06-18T02:00:05.000Z',
      payload: { type: 'token_count', info: { last_token_usage: { input_tokens: 9, output_tokens: 5 } }, total_tokens: 14 }
    })
  ]
  return (
    records[0] + '\r\n' +
    records[1] + '\n' +
    records[2] + '\r\n' +
    records[3] + '\n' +
    records[4] + '\r\n' +
    records[5] + '\n' +
    records[6] + '\r\n' +
    records[7] // no trailing newline
  )
}

describe('GH-148 golden: streaming == split (Claude)', () => {
  it('parseSessionMeta deep-equals across CRLF/blank/malformed/multibyte/no-trailing-newline', () => {
    const { raw, canonical } = writePair('claude-meta', claudeTranscript())
    const streamed = parseSessionMeta(raw, 'proj')
    const canon = parseSessionMeta(canonical, 'proj')
    // path/sourceKey/sizeBytes/modifiedAt legitimately differ (different files) —
    // null them out so the comparison is over PARSED CONTENT only.
    expect(neutralizeMeta(streamed)).toEqual(neutralizeMeta(canon))
    // Positive guards: malformed counted, multibyte intact, no \r leaked.
    expect(streamed.meta.malformedLineCount).toBe(1)
    expect(streamed.name).toBe('修复 unicode 🚀')
    expect(JSON.stringify(streamed.meta)).not.toContain('\r')
  })

  it('parseClaudeSessionDetail deep-equals (toolTimeline + artifacts)', () => {
    const { raw, canonical } = writePair('claude-detail', claudeTranscript())
    expect(parseClaudeSessionDetail(raw)).toEqual(parseClaudeSessionDetail(canonical))
    // No \r contamination in any summary/path.
    expect(JSON.stringify(parseClaudeSessionDetail(raw))).not.toContain('\r')
  })

  it('parseClaudeSessionReplay deep-equals (events + L{idx}B{n} id sequence)', () => {
    const { raw, canonical } = writePair('claude-replay', claudeTranscript())
    const streamed = parseClaudeSessionReplay(raw)
    const canon = parseClaudeSessionReplay(canonical)
    expect(streamed).toEqual(canon)
    // Replay ids carry the line index — assert they are identical across the two
    // line models (the actual invariant payload reverse-lookup depends on).
    expect(streamed.map((e) => e.id)).toEqual(canon.map((e) => e.id))
    expect(JSON.stringify(streamed)).not.toContain('\r')
  })

  it('readSessionReplayEventPayload returns the byte-exact line for every event id', () => {
    const { raw } = writePair('claude-payload', claudeTranscript())
    const a = asset(raw, 'claude-code')
    const replay = buildSessionReplay(a)
    // For every emitted event, the per-line payload lookup must return a line that
    // (a) is non-null, (b) round-trips through JSON.parse, (c) has no trailing \r.
    for (const event of replay.events) {
      const payload = readSessionReplayEventPayload(a, event.id)
      expect(payload, `payload for ${event.id}`).not.toBeNull()
      expect(() => JSON.parse(payload!.json)).not.toThrow()
      expect(payload!.json.endsWith('\r')).toBe(false)
    }
  })

  it('payload lookup is byte-identical to split(/\\r?\\n/)[lineIndex] (CRLF stripped)', () => {
    const text = claudeTranscript()
    const { raw } = writePair('claude-payload-bytes', text)
    const a = asset(raw, 'claude-code')
    const splitLines = text.split(/\r?\n/)
    const replay = buildSessionReplay(a)
    for (const event of replay.events) {
      const lineIndex = Number(/^L(\d+)B\d+$/.exec(event.id)![1])
      const payload = readSessionReplayEventPayload(a, event.id)
      // The engine returns exactly split[lineIndex] — \r already consumed by split.
      expect(payload!.json).toBe(splitLines[lineIndex])
    }
  })
})

describe('GH-148 golden: streaming == split (Codex)', () => {
  it('parseCodexSessionMeta deep-equals (incl. malformed count + token usage)', () => {
    const { raw, canonical } = writePair('codex-meta', codexTranscript())
    const streamed = parseCodexSessionMeta(raw, {})
    const canon = parseCodexSessionMeta(canonical, {})
    expect(neutralizeMeta(streamed)).toEqual(neutralizeMeta(canon))
    expect(streamed.meta.malformedLineCount).toBe(1)
    expect(JSON.stringify(streamed.meta)).not.toContain('\r')
  })

  it('parseCodexSessionDetail deep-equals (toolTimeline + artifacts)', () => {
    const { raw, canonical } = writePair('codex-detail', codexTranscript())
    expect(parseCodexSessionDetail(raw)).toEqual(parseCodexSessionDetail(canonical))
    expect(JSON.stringify(parseCodexSessionDetail(raw))).not.toContain('\r')
  })

  it('parseCodexSessionReplay deep-equals (events + id sequence)', () => {
    const { raw, canonical } = writePair('codex-replay', codexTranscript())
    const streamed = parseCodexSessionReplay(raw)
    const canon = parseCodexSessionReplay(canonical)
    expect(streamed).toEqual(canon)
    expect(streamed.map((e) => e.id)).toEqual(canon.map((e) => e.id))
    expect(JSON.stringify(streamed)).not.toContain('\r')
  })

  it('codex payload lookup is byte-identical to split[lineIndex]', () => {
    const text = codexTranscript()
    const { raw } = writePair('codex-payload', text)
    const a = asset(raw, 'codex')
    const splitLines = text.split(/\r?\n/)
    const replay = buildSessionReplay(a)
    for (const event of replay.events) {
      const lineIndex = Number(/^L(\d+)B\d+$/.exec(event.id)![1])
      const payload = readSessionReplayEventPayload(a, event.id)
      expect(payload!.json).toBe(splitLines[lineIndex])
    }
  })
})

/** Drop fields that are inherently file-identity-dependent (path, fingerprint). */
function neutralizeMeta(a: Asset): Record<string, unknown> {
  const meta = { ...a.meta }
  delete meta.transcriptPath
  delete meta.sourceKey
  delete meta.sizeBytes
  delete meta.modifiedAt
  return { agentId: a.agentId, category: a.category, type: a.type, scope: a.scope, name: a.name, meta }
}
