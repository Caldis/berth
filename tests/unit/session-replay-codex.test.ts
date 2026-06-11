import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseCodexSessionReplay } from '../../src/main/adapters/codex/session-replay'

let tempDir: string | null = null

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

function writeRollout(lines: string[]): string {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-codex-replay-'))
  const filePath = path.join(tempDir, 'rollout.jsonl')
  fs.writeFileSync(filePath, lines.join('\n'))
  return filePath
}

describe('Codex session replay parser', () => {
  it('maps the event_msg stream as the user-facing channel and skips raw duplicates', () => {
    const filePath = writeRollout([
      // L0/L1: session meta records carry no replay value
      JSON.stringify({
        type: 'session_meta',
        timestamp: '2026-06-11T03:00:00.000Z',
        payload: { id: 'codex-replay', cwd: 'D:\\Code\\berth' }
      }),
      JSON.stringify({
        type: 'turn_context',
        timestamp: '2026-06-11T03:00:01.000Z',
        payload: { cwd: 'D:\\Code\\berth', model: 'gpt-5.3-codex' }
      }),
      // L2: real user prompt lives in event_msg/user_message
      JSON.stringify({
        type: 'event_msg',
        timestamp: '2026-06-11T03:00:02.000Z',
        payload: { type: 'user_message', message: 'fix the flaky test', images: [] }
      }),
      // L3: response_item user message is injected harness context — skipped
      JSON.stringify({
        type: 'response_item',
        timestamp: '2026-06-11T03:00:02.000Z',
        payload: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: '# AGENTS.md instructions ...' }]
        }
      }),
      // L4: reasoning with readable summary
      JSON.stringify({
        type: 'response_item',
        timestamp: '2026-06-11T03:00:05.000Z',
        payload: {
          type: 'reasoning',
          summary: [{ type: 'summary_text', text: 'planning the fix' }],
          content: null
        }
      }),
      // L5: encrypted reasoning still shows up as a placeholder thinking event
      JSON.stringify({
        type: 'response_item',
        timestamp: '2026-06-11T03:00:06.000Z',
        payload: { type: 'reasoning', summary: [], content: null, encrypted_content: 'gAAAA…' }
      }),
      // L6: assistant text lives in event_msg/agent_message
      JSON.stringify({
        type: 'event_msg',
        timestamp: '2026-06-11T03:00:07.000Z',
        payload: { type: 'agent_message', message: 'I will fix it now', phase: 'commentary' }
      }),
      // L7: response_item assistant message duplicates agent_message — skipped
      JSON.stringify({
        type: 'response_item',
        timestamp: '2026-06-11T03:00:07.000Z',
        payload: {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'I will fix it now' }]
        }
      }),
      // L8/L9: tool call + output pairing
      JSON.stringify({
        type: 'response_item',
        timestamp: '2026-06-11T03:00:10.000Z',
        payload: {
          type: 'function_call',
          call_id: 'call-shell',
          name: 'shell_command',
          arguments: JSON.stringify({ command: 'pnpm vitest run' })
        }
      }),
      JSON.stringify({
        type: 'response_item',
        timestamp: '2026-06-11T03:00:12.000Z',
        payload: {
          type: 'function_call_output',
          call_id: 'call-shell',
          output: JSON.stringify({ output: 'ok', metadata: { duration_seconds: 2 } })
        }
      }),
      // L10: token_count → model event from last_token_usage
      JSON.stringify({
        type: 'event_msg',
        timestamp: '2026-06-11T03:00:13.000Z',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: { input_tokens: 99999, output_tokens: 9999 },
            last_token_usage: {
              input_tokens: 25338,
              cached_input_tokens: 4480,
              output_tokens: 779,
              reasoning_output_tokens: 516
            }
          }
        }
      }),
      // L11: completed patch application is a tool event
      JSON.stringify({
        type: 'event_msg',
        timestamp: '2026-06-11T03:00:14.000Z',
        payload: { type: 'patch_apply_end', files: ['src/a.ts'], success: true }
      }),
      // L12/L13: lifecycle events
      JSON.stringify({
        type: 'event_msg',
        timestamp: '2026-06-11T03:00:15.000Z',
        payload: { type: 'task_started' }
      }),
      JSON.stringify({
        type: 'event_msg',
        timestamp: '2026-06-11T03:00:16.000Z',
        payload: { type: 'turn_aborted', reason: 'user interrupt' }
      }),
      // L14: per-turn goal churn is noise — skipped
      JSON.stringify({
        type: 'event_msg',
        timestamp: '2026-06-11T03:00:17.000Z',
        payload: { type: 'thread_goal_updated', goal: 'whatever' }
      }),
      // L15: context compaction
      JSON.stringify({
        type: 'event_msg',
        timestamp: '2026-06-11T03:00:18.000Z',
        payload: { type: 'context_compacted' }
      })
    ])

    const events = parseCodexSessionReplay(filePath)

    expect(events.map((e) => e.kind)).toEqual([
      'user',
      'thinking',
      'thinking',
      'assistant',
      'tool',
      'result',
      'model',
      'tool',
      'system',
      'system',
      'system'
    ])

    const [user, thinking, encrypted, assistant, tool, result, model, patch] = events

    expect(user.id).toBe('L2B0')
    expect(user.summary).toBe('fix the flaky test')

    expect(thinking.summary).toBe('planning the fix')
    expect(encrypted.summary.length).toBeGreaterThan(0)

    expect(assistant.summary).toBe('I will fix it now')

    expect(tool.toolName).toBe('shell_command')
    expect(tool.status).toBe('success')
    expect(tool.summary).toContain('pnpm vitest run')

    expect(result.toolName).toBe('shell_command')
    expect(result.status).toBe('success')

    expect(model.tokens).toEqual({ input: 25338, output: 779, cacheRead: 4480 })

    expect(patch.toolName).toBe('apply_patch')
    expect(patch.status).toBe('success')

    // turn_aborted is the codex user-interrupt shape — flagged for the replay timeline
    const [taskStarted, turnAborted, compacted] = events.slice(8)
    expect(taskStarted.interrupted).toBeUndefined()
    expect(turnAborted.interrupted).toBe(true)
    expect(turnAborted.summary).toContain('user interrupt')
    expect(compacted.interrupted).toBeUndefined()
  })

  it('marks failed tool outputs as error on both sides', () => {
    const filePath = writeRollout([
      JSON.stringify({
        type: 'response_item',
        timestamp: '2026-06-11T04:00:00.000Z',
        payload: {
          type: 'custom_tool_call',
          call_id: 'call-x',
          name: 'apply_patch',
          arguments: { input: 'patch' }
        }
      }),
      JSON.stringify({
        type: 'response_item',
        timestamp: '2026-06-11T04:00:01.000Z',
        payload: {
          type: 'custom_tool_call_output',
          call_id: 'call-x',
          is_error: true,
          output: 'patch failed'
        }
      })
    ])

    const events = parseCodexSessionReplay(filePath)

    expect(events.map((e) => e.kind)).toEqual(['tool', 'result'])
    expect(events[0].status).toBe('error')
    expect(events[1].status).toBe('error')
    expect(events[1].summary).toContain('patch failed')
  })

  it('returns an empty list for unreadable rollouts', () => {
    expect(parseCodexSessionReplay(path.join(os.tmpdir(), 'berth-missing', 'nope.jsonl'))).toEqual([])
  })
})
