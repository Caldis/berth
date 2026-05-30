import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseCodexSessionDetail, parseCodexSessionMeta } from '../../src/main/adapters/codex/parsers'

let tempDir: string | null = null

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

describe('Codex session parser', () => {
  it('extracts metadata, tool timeline, and artifacts from rollout JSONL', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-codex-session-'))
    const rolloutPath = path.join(tempDir, 'rollout-2026-05-30T02-00-00-codex-abc.jsonl')
    fs.writeFileSync(
      rolloutPath,
      [
        JSON.stringify({
          type: 'session_meta',
          timestamp: '2026-05-30T02:00:00.000Z',
          payload: { id: 'codex-abc', cwd: 'D:\\Code\\berth' }
        }),
        '{ malformed json',
        JSON.stringify({
          type: 'turn_context',
          timestamp: '2026-05-30T02:00:05.000Z',
          payload: { cwd: 'D:\\Code\\berth', model: 'gpt-5.3-codex' }
        }),
        JSON.stringify({
          type: 'event_msg',
          timestamp: '2026-05-30T02:00:10.000Z',
          payload: { type: 'thread_name_updated', thread_name: 'Codex compatibility' }
        }),
        JSON.stringify({
          type: 'event_msg',
          timestamp: '2026-05-30T02:00:20.000Z',
          payload: { type: 'token_count', total_tokens: 42 }
        }),
        JSON.stringify({
          type: 'response_item',
          timestamp: '2026-05-30T02:01:00.000Z',
          payload: {
            type: 'function_call',
            call_id: 'call-shell',
            name: 'shell_command',
            arguments: { command: 'pnpm test' }
          }
        }),
        JSON.stringify({
          type: 'response_item',
          timestamp: '2026-05-30T02:01:01.000Z',
          payload: { type: 'function_call_output', call_id: 'call-shell' }
        }),
        JSON.stringify({
          type: 'response_item',
          timestamp: '2026-05-30T02:02:00.000Z',
          payload: {
            type: 'function_call',
            call_id: 'call-plan',
            name: 'update_plan',
            arguments: { plan: [{ step: 'Implement Codex parser', status: 'completed' }] }
          }
        }),
        JSON.stringify({
          type: 'event_msg',
          timestamp: '2026-05-30T02:03:00.000Z',
          payload: { type: 'patch_apply_end', files: ['src/main/adapters/codex/parsers.ts'], success: true }
        })
      ].join('\n')
    )

    const asset = parseCodexSessionMeta(rolloutPath)
    const detail = parseCodexSessionDetail(rolloutPath)

    expect(asset.id).toMatch(/^codex-session-codex-abc-/)
    expect(asset.agentId).toBe('codex')
    expect(asset.name).toBe('Codex compatibility')
    expect(asset.meta.project).toBe('berth')
    expect(asset.meta.projectPath).toBe('D:\\Code\\berth')
    expect(asset.meta.model).toBe('gpt-5.3-codex')
    expect(asset.meta.totalTokens).toBe(42)
    expect(asset.meta.tokenUsage).toMatchObject({
      unknownTokens: 42,
      totalTokens: 42,
      hasBreakdown: false
    })

    expect(detail.toolTimeline.map((event) => event.name)).toEqual([
      'shell_command',
      'update_plan',
      'apply_patch'
    ])
    expect(detail.toolTimeline[0].status).toBe('success')
    expect(detail.artifacts.todos[0]).toEqual({
      id: 'plan-0-Implement-Codex-parser',
      title: 'Implement Codex parser',
      done: true
    })
    expect(detail.artifacts.files[0].path).toBe('src/main/adapters/codex/parsers.ts')
  })

  it('preserves token count breakdowns when Codex records them', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-codex-session-'))
    const rolloutPath = path.join(tempDir, 'rollout-2026-05-30T03-00-00-codex-breakdown.jsonl')
    fs.writeFileSync(
      rolloutPath,
      [
        JSON.stringify({
          type: 'session_meta',
          timestamp: '2026-05-30T03:00:00.000Z',
          payload: { id: 'codex-breakdown', cwd: 'D:\\Code\\berth' }
        }),
        JSON.stringify({
          type: 'event_msg',
          timestamp: '2026-05-30T03:00:20.000Z',
          payload: {
            type: 'token_count',
            info: {
              input_tokens: 11,
              output_tokens: 7,
              cached_input_tokens: 13,
              reasoning_output_tokens: 5
            }
          }
        })
      ].join('\n')
    )

    const asset = parseCodexSessionMeta(rolloutPath)

    expect(asset.meta.totalTokens).toBe(36)
    expect(asset.meta.tokenUsage).toMatchObject({
      inputTokens: 11,
      outputTokens: 7,
      cacheReadInputTokens: 13,
      reasoningOutputTokens: 5,
      totalTokens: 36,
      hasBreakdown: true
    })
  })
})
