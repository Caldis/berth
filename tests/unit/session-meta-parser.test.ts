import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseSessionMeta } from '../../src/main/adapters/claude-code/parsers'
import { parseClaudeSessionDetail } from '../../src/main/adapters/claude-code/session-detail'
import { AssetFileCache } from '../../src/main/engine/assets/file-cache'
import type { Asset } from '@shared/types/asset'

let tempDir: string | null = null

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

describe('parseSessionMeta', () => {
  it('extracts current Claude JSONL session metadata without storing message bodies', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-session-'))
    const transcriptPath = path.join(tempDir, 'fallback-session.jsonl')
    fs.writeFileSync(
      transcriptPath,
      [
        JSON.stringify({
          type: 'last-prompt',
          timestamp: '2026-05-30T01:00:00.000Z',
          sessionId: 'session-abc',
          cwd: 'D:\\Code\\berth'
        }),
        JSON.stringify({
          type: 'ai-title',
          timestamp: '2026-05-30T01:01:00.000Z',
          sessionId: 'session-abc',
          cwd: 'D:\\Code\\berth',
          aiTitle: 'Fix session metadata'
        }),
        '{ malformed json',
        JSON.stringify({
          type: 'assistant',
          timestamp: '2026-05-30T01:02:00.000Z',
          sessionId: 'session-abc',
          cwd: 'D:\\Code\\berth',
          message: {
            model: 'claude-sonnet-4-20250514',
            usage: {
              input_tokens: 10,
              output_tokens: 5,
              cache_read_input_tokens: 20,
              cache_creation_input_tokens: 3
            },
            content: [
              { type: 'tool_use', name: 'Skill', input: { skill: 'frontend-design' } },
              {
                type: 'tool_use',
                name: 'mcp__plugin_playwright_playwright__browser_navigate',
                input: { url: 'http://localhost:5173' }
              }
            ]
          }
        }),
        JSON.stringify({
          type: 'system',
          subtype: 'stop_hook_summary',
          timestamp: '2026-05-30T01:03:00.000Z',
          sessionId: 'session-abc',
          hookCount: 2,
          hookInfos: [{ command: 'echo one' }, { command: 'echo two' }]
        }),
        JSON.stringify({
          type: 'file-history-snapshot',
          timestamp: '2026-05-30T01:05:00.000Z',
          sessionId: 'session-abc'
        })
      ].join('\n')
    )

    const asset = parseSessionMeta(transcriptPath, 'D--Code-berth')
    const reparsed = parseSessionMeta(transcriptPath, 'D--Code-berth')

    expect(asset.id).toBe('session-session-abc')
    expect(reparsed.id).toBe(asset.id)
    expect(asset.name).toBe('Fix session metadata')
    expect(asset.raw).toBeUndefined()
    expect(asset.meta.project).toBe('berth')
    expect(asset.meta.projectPath).toBe('D:\\Code\\berth')
    expect(asset.meta.transcriptPath).toBe(transcriptPath)
    expect(asset.meta.startedAt).toBe('2026-05-30T01:00:00.000Z')
    expect(asset.meta.endedAt).toBe('2026-05-30T01:05:00.000Z')
    expect(asset.meta.duration).toBe(300)
    expect(asset.meta.usageStartedAt).toBe('2026-05-30T01:02:00.000Z')
    expect(asset.meta.usageEndedAt).toBe('2026-05-30T01:02:00.000Z')
    expect(asset.meta.usageDuration).toBe(0)
    expect(asset.meta.model).toBe('claude-sonnet-4-20250514')
    expect(asset.meta.totalTokens).toBe(38)
    expect(asset.meta.tokenUsage).toMatchObject({
      inputTokens: 10,
      outputTokens: 5,
      cacheReadInputTokens: 20,
      cacheCreationInputTokens: 3,
      totalTokens: 38,
      hasBreakdown: true
    })
    expect(asset.meta.totalCost).toBeUndefined()
    expect(asset.meta.skillsUsed).toEqual(['frontend-design'])
    expect(asset.meta.mcpServers).toEqual(['plugin_playwright_playwright'])
    expect(asset.meta.hooksFired).toBe(2)
    expect(asset.meta.hookEventCounts).toEqual({ Stop: 2 })
    expect(asset.meta.fileHistoryCount).toBe(1)
  })

  it('reuses cached Claude session metadata until the transcript fingerprint changes', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-session-cache-'))
    const transcriptPath = path.join(tempDir, 'cached-session.jsonl')
    fs.writeFileSync(
      transcriptPath,
      JSON.stringify({
        type: 'last-prompt',
        timestamp: '2026-05-30T01:00:00.000Z',
        sessionId: 'session-cache',
        cwd: 'D:\\Code\\berth'
      })
    )
    const cache = new AssetFileCache<Asset>()

    const first = cache.getOrParse(transcriptPath, () => parseSessionMeta(transcriptPath, 'D--Code-berth'))
    const cached = cache.getOrParse(transcriptPath, () => {
      throw new Error('should not parse unchanged transcript')
    })

    expect(cached).toEqual(first)

    fs.appendFileSync(
      transcriptPath,
      `\n${JSON.stringify({
        type: 'assistant',
        timestamp: '2026-05-30T01:02:00.000Z',
        sessionId: 'session-cache',
        message: {
          usage: { input_tokens: 7, output_tokens: 5 }
        }
      })}`
    )
    fs.utimesSync(transcriptPath, new Date('2026-06-03T00:00:00.000Z'), new Date('2026-06-03T00:00:00.000Z'))

    const updated = cache.getOrParse(transcriptPath, () => parseSessionMeta(transcriptPath, 'D--Code-berth'))

    expect(updated.meta.totalTokens).toBe(12)
  })

  it('extracts Claude tool timeline and artifacts from transcript events', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-session-detail-'))
    const transcriptPath = path.join(tempDir, 'session-detail.jsonl')
    fs.writeFileSync(
      transcriptPath,
      [
        JSON.stringify({
          type: 'assistant',
          timestamp: '2026-05-30T02:00:00.000Z',
          message: {
            content: [
              {
                type: 'tool_use',
                id: 'tool-edit',
                name: 'Edit',
                input: { file_path: 'D:\\Code\\berth\\src\\main.ts' }
              }
            ]
          }
        }),
        JSON.stringify({
          type: 'user',
          timestamp: '2026-05-30T02:00:01.000Z',
          message: {
            content: [{ type: 'tool_result', tool_use_id: 'tool-edit', is_error: false }]
          }
        }),
        JSON.stringify({
          type: 'assistant',
          timestamp: '2026-05-30T02:01:00.000Z',
          message: {
            content: [
              {
                type: 'tool_use',
                id: 'tool-todo',
                name: 'TodoWrite',
                input: {
                  todos: [
                    { id: 'todo-1', content: 'Implement parser', status: 'completed' },
                    { id: 'todo-2', content: 'Verify UI', status: 'in_progress' }
                  ]
                }
              },
              { type: 'tool_use', id: 'tool-skill', name: 'Skill', input: { skill: 'frontend-design' } },
              {
                type: 'tool_use',
                id: 'tool-mcp',
                name: 'mcp__plugin_playwright_playwright__browser_navigate',
                input: { url: 'http://localhost:5173' }
              }
            ]
          }
        }),
        JSON.stringify({
          type: 'file-history-snapshot',
          timestamp: '2026-05-30T02:03:00.000Z',
          snapshot: {
            trackedFileBackups: [{ filePath: 'D:\\Code\\berth\\src\\main.ts' }]
          }
        })
      ].join('\n')
    )

    const detail = parseClaudeSessionDetail(transcriptPath)

    expect(detail.toolTimeline.map((event) => event.name)).toEqual([
      'Edit',
      'TodoWrite',
      'Skill',
      'mcp__plugin_playwright_playwright__browser_navigate'
    ])
    expect(detail.toolTimeline[0].status).toBe('success')
    expect(detail.toolTimeline[2].category).toBe('skill')
    expect(detail.toolTimeline[3].mcpServer).toBe('plugin_playwright_playwright')
    expect(detail.artifacts.todos).toEqual([
      { id: 'todo-1', title: 'Implement parser', done: true },
      { id: 'todo-2', title: 'Verify UI', done: false }
    ])
    expect(detail.artifacts.files[0].path).toBe('D:\\Code\\berth\\src\\main.ts')
    expect(detail.artifacts.checkpoints[0].fileCount).toBe(1)
  })
})
