import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseClaudeSessionReplay } from '@berth/scan-engine/adapters/claude-code/session-replay'
import { replayEventLineIndex, replaySummary } from '@shared/session-replay'

let tempDir: string | null = null

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

function writeTranscript(lines: string[]): string {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-claude-replay-'))
  const filePath = path.join(tempDir, 'session.jsonl')
  fs.writeFileSync(filePath, lines.join('\n'))
  return filePath
}

describe('Claude session replay parser', () => {
  it('maps user/assistant/thinking/tool/result/model/system events with stable line-based ids', () => {
    const longText = 'x'.repeat(500)
    const filePath = writeTranscript([
      // L0: scalar user prompt
      JSON.stringify({
        type: 'user',
        timestamp: '2026-06-11T01:00:00.000Z',
        uuid: 'u-0',
        message: { role: 'user', content: 'start working' }
      }),
      // L1: assistant thinking + text + tool_use + usage
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-06-11T01:00:05.000Z',
        uuid: 'a-1',
        message: {
          id: 'msg_1',
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'let me think about this problem' },
            { type: 'text', text: longText },
            { type: 'tool_use', id: 'call-1', name: 'Bash', input: { command: 'pnpm test' } }
          ],
          usage: {
            input_tokens: 10,
            output_tokens: 325,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 5407
          }
        }
      }),
      // L2: tool result for call-1
      JSON.stringify({
        type: 'user',
        timestamp: '2026-06-11T01:00:09.000Z',
        uuid: 'u-2',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'call-1', content: 'all tests passed' }]
        }
      }),
      // L3: second assistant line of the same API message — usage must not duplicate
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-06-11T01:00:10.000Z',
        uuid: 'a-3',
        message: {
          id: 'msg_1',
          role: 'assistant',
          content: [{ type: 'text', text: 'done' }],
          usage: { input_tokens: 10, output_tokens: 325 }
        }
      }),
      // L4: stop hook summary
      JSON.stringify({
        type: 'system',
        subtype: 'stop_hook_summary',
        timestamp: '2026-06-11T01:00:12.000Z',
        hookCount: 2
      }),
      // L5: plain system record
      JSON.stringify({
        type: 'system',
        subtype: 'info',
        content: 'Session resumed from checkpoint',
        timestamp: '2026-06-11T01:00:13.000Z'
      }),
      // L6: file-history checkpoint (no timestamp field)
      JSON.stringify({
        type: 'file-history-snapshot',
        messageId: 'm-6',
        snapshot: { trackedFileBackups: [{ path: 'src/a.ts' }, { path: 'src/b.ts' }] }
      }),
      // L7-L10: pure meta records are skipped
      JSON.stringify({ type: 'last-prompt', sessionId: 's', leafUuid: 'x' }),
      JSON.stringify({ type: 'ai-title', sessionId: 's', aiTitle: 'My title' }),
      JSON.stringify({ type: 'permission-mode', sessionId: 's', permissionMode: 'default' }),
      JSON.stringify({ type: 'bridge-session', sessionId: 's', bridgeSessionId: 'b' }),
      // L11: malformed line is tolerated
      '{ not json',
      // L12: sidechain user message
      JSON.stringify({
        type: 'user',
        isSidechain: true,
        timestamp: '2026-06-11T01:00:20.000Z',
        message: { role: 'user', content: 'subagent prompt' }
      })
    ])

    const events = parseClaudeSessionReplay(filePath)

    expect(events.map((e) => e.kind)).toEqual([
      'user',
      'thinking',
      'assistant',
      'tool',
      'model',
      'result',
      'assistant',
      'system',
      'system',
      'system',
      'user'
    ])

    const [user0, thinking, assistantText, tool, model, result, , hook, system, checkpoint, sidechain] = events

    expect(user0.id).toBe('L0B0')
    expect(user0.timestamp).toBe('2026-06-11T01:00:00.000Z')
    expect(user0.summary).toBe('start working')

    expect(thinking.summary).toBe('let me think about this problem')

    // long text is truncated to a single-line bounded summary
    expect(assistantText.summary.length).toBeLessThanOrEqual(160)

    expect(tool.toolName).toBe('Bash')
    expect(tool.status).toBe('success') // backfilled from L2 result
    expect(tool.summary).toContain('pnpm test')

    expect(model.tokens).toEqual({ input: 10, output: 325, cacheRead: 0, cacheCreation: 5407 })

    expect(result.kind).toBe('result')
    expect(result.toolName).toBe('Bash')
    expect(result.status).toBe('success')
    expect(result.summary).toBe('all tests passed')

    expect(hook.summary).toContain('2')
    expect(system.summary).toBe('Session resumed from checkpoint')
    expect(checkpoint.timestamp).toBeNull()
    expect(checkpoint.summary).toContain('2')

    expect(sidechain.sidechain).toBe(true)
    expect(sidechain.id).toBe('L12B0')

    // every id maps back to its source line for payload lookup
    expect(replayEventLineIndex(user0.id)).toBe(0)
    expect(replayEventLineIndex(sidechain.id)).toBe(12)
  })

  it('marks failed tool results as error on both tool and result events', () => {
    const filePath = writeTranscript([
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-06-11T02:00:00.000Z',
        message: {
          id: 'msg_e',
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'call-err', name: 'Read', input: { file_path: 'missing.ts' } }]
        }
      }),
      JSON.stringify({
        type: 'user',
        timestamp: '2026-06-11T02:00:01.000Z',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'call-err',
              is_error: true,
              content: [{ type: 'text', text: 'File does not exist' }]
            }
          ]
        }
      })
    ])

    const events = parseClaudeSessionReplay(filePath)

    expect(events.map((e) => e.kind)).toEqual(['tool', 'result'])
    expect(events[0].status).toBe('error')
    expect(events[1].status).toBe('error')
    expect(events[1].summary).toBe('File does not exist')
  })

  it('flags user-interrupt records (Esc) in both scalar and block content shapes', () => {
    const filePath = writeTranscript([
      JSON.stringify({
        type: 'user',
        timestamp: '2026-06-11T05:00:00.000Z',
        message: { role: 'user', content: 'keep going' }
      }),
      JSON.stringify({
        type: 'user',
        timestamp: '2026-06-11T05:00:05.000Z',
        message: { role: 'user', content: '[Request interrupted by user]' }
      }),
      JSON.stringify({
        type: 'user',
        timestamp: '2026-06-11T05:00:10.000Z',
        message: {
          role: 'user',
          content: [{ type: 'text', text: '[Request interrupted by user for tool use]' }]
        }
      })
    ])

    const events = parseClaudeSessionReplay(filePath)

    expect(events.map((e) => e.kind)).toEqual(['user', 'user', 'user'])
    expect(events[0].interrupted).toBeUndefined()
    expect(events[1].interrupted).toBe(true)
    expect(events[2].interrupted).toBe(true)
  })

  it('returns an empty list for unreadable transcripts', () => {
    expect(parseClaudeSessionReplay(path.join(os.tmpdir(), 'berth-missing', 'nope.jsonl'))).toEqual([])
  })
})

describe('replay shared helpers', () => {
  it('collapses whitespace and truncates summaries', () => {
    expect(replaySummary('  a\n\nb\tc  ')).toBe('a b c')
    expect(replaySummary('y'.repeat(200)).length).toBeLessThanOrEqual(160)
    expect(replaySummary('y'.repeat(200)).endsWith('…')).toBe(true)
  })

  it('parses line indices out of event ids and rejects junk', () => {
    expect(replayEventLineIndex('L42B3')).toBe(42)
    expect(replayEventLineIndex('nope')).toBeNull()
    expect(replayEventLineIndex('LxB1')).toBeNull()
  })
})
