import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  parseCodexSessionDetail,
  parseCodexSessionMeta,
  readCodexSessionTitleIndex
} from '@berth/scan-engine/adapters/codex/parsers'
import { AssetFileCache } from '@berth/scan-engine/engine/assets/file-cache'
import { dedupePathKey } from '@shared/asset-dedupe'
import type { Asset } from '@shared/types/asset'

let tempDir: string | null = null

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

describe('Codex session parser', () => {
  it('sets meta.sourceKey to dedupePathKey(filePath) for incremental replace (GH-141)', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-codex-sk-'))
    const rolloutPath = path.join(tempDir, 'rollout-2026-06-13T10-00-00-sk.jsonl')
    fs.writeFileSync(
      rolloutPath,
      JSON.stringify({ type: 'session_meta', timestamp: '2026-06-13T10:00:00.000Z', payload: { id: 'sk1', cwd: 'D:\\Code\\berth' } }) + '\n'
    )
    const asset = parseCodexSessionMeta(rolloutPath, {})
    expect(asset.meta.sourceKey).toBe(dedupePathKey(rolloutPath))
  })

  it('uses session_index thread names for rollout titles', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-codex-session-title-'))
    const rolloutPath = path.join(tempDir, 'rollout-2026-06-13T10-00-00-codex-title.jsonl')
    fs.writeFileSync(
      path.join(tempDir, 'session_index.jsonl'),
      [
        JSON.stringify({
          id: 'codex-title',
          thread_name: '  Fix   Codex title detection  ',
          updated_at: '2026-06-13T10:00:00.000Z'
        }),
        '{ malformed json',
        JSON.stringify({
          id: 'codex-long-title',
          thread_name: 'A'.repeat(260)
        })
      ].join('\n')
    )
    fs.writeFileSync(
      rolloutPath,
      JSON.stringify({
        type: 'session_meta',
        timestamp: '2026-06-13T10:00:00.000Z',
        payload: { id: 'codex-title', cwd: 'D:\\Code\\berth' }
      }) + '\n'
    )

    const titleIndex = readCodexSessionTitleIndex(tempDir)
    const asset = parseCodexSessionMeta(rolloutPath, { titleIndex })

    expect(titleIndex.get('codex-title')).toBe('Fix Codex title detection')
    expect(titleIndex.get('codex-long-title')).toHaveLength(120)
    expect(asset.name).toBe('Fix Codex title detection')
    expect(asset.meta.title).toBe('Fix Codex title detection')
  })

  it('falls back to rollout thread_name_updated when session_index has no title', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-codex-session-rollout-title-'))
    const rolloutPath = path.join(tempDir, 'rollout-2026-06-13T10-00-00-rollout-title.jsonl')
    fs.writeFileSync(
      rolloutPath,
      [
        JSON.stringify({
          type: 'session_meta',
          timestamp: '2026-06-13T10:00:00.000Z',
          payload: { id: 'rollout-title', cwd: 'D:\\Code\\berth' }
        }),
        JSON.stringify({
          type: 'event_msg',
          timestamp: '2026-06-13T10:00:01.000Z',
          payload: { type: 'thread_name_updated', thread_name: 'Rollout title' }
        })
      ].join('\n')
    )

    const asset = parseCodexSessionMeta(rolloutPath, { titleIndex: new Map() })

    expect(asset.name).toBe('Rollout title')
    expect(asset.meta.title).toBe('Rollout title')
  })

  it('falls back to the first Codex user_message when no thread title metadata exists', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-codex-session-user-message-title-'))
    const rolloutPath = path.join(tempDir, 'rollout-2026-06-13T10-00-00-user-message-title.jsonl')
    fs.writeFileSync(
      rolloutPath,
      [
        JSON.stringify({
          type: 'session_meta',
          timestamp: '2026-06-13T10:00:00.000Z',
          payload: { id: 'user-message-title', cwd: 'D:\\Code\\berth' }
        }),
        JSON.stringify({
          type: 'event_msg',
          timestamp: '2026-06-13T10:00:02.000Z',
          payload: {
            type: 'user_message',
            message: '请聚焦 GitHub Copilot CLI 与 Cursor 两个 agent，查官方资料和 primary source。'.repeat(4)
          }
        })
      ].join('\n')
    )

    const asset = parseCodexSessionMeta(rolloutPath)

    expect(asset.name.startsWith('请聚焦 GitHub Copilot CLI 与 Cursor 两个 agent')).toBe(true)
    expect(asset.name).toHaveLength(120)
    expect(asset.meta.title).toBe(asset.name)
  })

  it('extracts structured Codex activity metadata without scanning tool output text', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-codex-session-'))
    const rolloutPath = path.join(tempDir, 'rollout-2026-06-03T01-00-00-codex-activity.jsonl')
    fs.writeFileSync(
      rolloutPath,
      [
        JSON.stringify({
          type: 'session_meta',
          timestamp: '2026-06-03T01:00:00.000Z',
          payload: { id: 'codex-activity', cwd: 'D:\\Code\\berth' }
        }),
        JSON.stringify({
          type: 'event_msg',
          timestamp: '2026-06-03T01:00:10.000Z',
          payload: { type: 'token_count', total_tokens: 20 }
        }),
        JSON.stringify({
          type: 'response_item',
          timestamp: '2026-06-03T01:00:20.000Z',
          payload: {
            type: 'function_call',
            call_id: 'call-skill',
            name: 'Skill',
            arguments: { skill: 'frontend-design' }
          }
        }),
        JSON.stringify({
          type: 'response_item',
          timestamp: '2026-06-03T01:00:30.000Z',
          payload: {
            type: 'function_call',
            call_id: 'call-mcp',
            name: 'mcp__browser__browser_navigate',
            arguments: { url: 'http://localhost:5173' }
          }
        }),
        JSON.stringify({
          type: 'event_msg',
          timestamp: '2026-06-03T01:00:40.000Z',
          payload: { type: 'hook_finished', hook_event_name: 'PostToolUse' }
        }),
        JSON.stringify({
          type: 'event_msg',
          timestamp: '2026-06-03T01:00:50.000Z',
          payload: { type: 'hook_finished', event_name: 'PostToolUse', hookCount: 2 }
        }),
        JSON.stringify({
          type: 'event_msg',
          timestamp: '2026-06-03T01:01:10.000Z',
          payload: { type: 'token_count', total_tokens: 80 }
        }),
        JSON.stringify({
          type: 'response_item',
          timestamp: '2026-06-03T01:05:00.000Z',
          payload: {
            type: 'function_call_output',
            call_id: 'ignored-output',
            output: 'Skill: should-not-be-read mcp__ignored__tool hook Stop'
          }
        })
      ].join('\n')
    )

    const asset = parseCodexSessionMeta(rolloutPath)

    expect(asset.meta.totalTokens).toBe(80)
    expect(asset.meta.usageStartedAt).toBe('2026-06-03T01:00:10.000Z')
    expect(asset.meta.usageEndedAt).toBe('2026-06-03T01:01:10.000Z')
    expect(asset.meta.usageDuration).toBe(60)
    expect(asset.meta.skillsUsed).toEqual(['frontend-design'])
    expect(asset.meta.mcpServers).toEqual(['browser'])
    expect(asset.meta.hooksFired).toBe(3)
    expect(asset.meta.hookEventCounts).toEqual({ PostToolUse: 3 })
  })

  it('reuses cached Codex rollout metadata until the file fingerprint changes', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-codex-session-cache-'))
    const rolloutPath = path.join(tempDir, 'rollout-2026-06-03T01-00-00-codex-cache.jsonl')
    fs.writeFileSync(
      rolloutPath,
      [
        JSON.stringify({
          type: 'session_meta',
          timestamp: '2026-06-03T01:00:00.000Z',
          payload: { id: 'codex-cache', cwd: 'D:\\Code\\berth' }
        }),
        JSON.stringify({
          type: 'event_msg',
          timestamp: '2026-06-03T01:00:10.000Z',
          payload: { type: 'token_count', total_tokens: 10 }
        })
      ].join('\n')
    )
    const cache = new AssetFileCache<Asset>()

    const first = cache.getOrParse(rolloutPath, () => parseCodexSessionMeta(rolloutPath))
    const cached = cache.getOrParse(rolloutPath, () => {
      throw new Error('should not parse unchanged rollout')
    })

    expect(cached).toEqual(first)

    fs.appendFileSync(
      rolloutPath,
      `\n${JSON.stringify({
        type: 'event_msg',
        timestamp: '2026-06-03T01:00:20.000Z',
        payload: { type: 'token_count', total_tokens: 30 }
      })}`
    )
    fs.utimesSync(rolloutPath, new Date('2026-06-03T00:00:00.000Z'), new Date('2026-06-03T00:00:00.000Z'))

    const updated = cache.getOrParse(rolloutPath, () => parseCodexSessionMeta(rolloutPath))

    expect(updated.meta.totalTokens).toBe(30)
  })

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
          payload: {
            type: 'function_call_output',
            call_id: 'call-shell',
            output: JSON.stringify({ metadata: { duration_seconds: 1.25 } })
          }
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
    expect(detail.toolTimeline[0].durationMs).toBe(1250)
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
