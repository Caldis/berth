import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Asset } from '@shared/types/asset'
import { buildSessionDetail, toSessionSummary } from '@berth/scan-engine/engine/session-detail'

// GH-115 T10: session/模型推断域逻辑此前住 ipc/handlers.ts (顶层 import electron),
// 全仓零测试可触达。迁入 engine 后本文件成为其第一张直测网 (golden 行为钉)。

const sessionAsset = (over: Partial<Asset> & { meta?: Record<string, unknown> } = {}): Asset => ({
  id: 'session-s1',
  agentId: 'claude-code',
  category: 'state',
  type: 'session',
  scope: 'session',
  name: 'My Session',
  path: '/tmp/does-not-exist.jsonl',
  ...over,
  meta: {
    project: 'berth',
    projectPath: '/code/berth',
    startedAt: '2026-06-01T00:00:00.000Z',
    model: 'claude-opus-4-8',
    skillsUsed: ['alpha'],
    hooksFired: 2,
    ...(over.meta ?? {})
  }
})

describe('toSessionSummary', () => {
  it('maps meta fields with safe fallbacks (runtime 与 handlers 此前各持一份字节级副本)', () => {
    const summary = toSessionSummary(sessionAsset())
    expect(summary).toMatchObject({
      id: 'session-s1',
      agentId: 'claude-code',
      title: 'My Session',
      project: 'berth',
      projectPath: '/code/berth',
      model: 'claude-opus-4-8',
      skillsUsed: ['alpha'],
      hooksFired: 2,
      cost: null,
      duration: null
    })
    expect(summary.transcriptPath).toBe('/tmp/does-not-exist.jsonl')
  })
})

describe('buildSessionDetail', () => {
  it('claude session: knowledge-base provider + named-asset fallback + hook events', () => {
    const detail = buildSessionDetail(sessionAsset(), [])
    expect(detail.modelInfo!.provider).toBe('Anthropic')
    expect(detail.modelInfo!.referenceUrl).toContain('claude.com')
    // 资产表里无 alpha skill → 以 session 占位资产兜底
    expect(detail.skillsUsed[0]).toMatchObject({ type: 'skill', scope: 'session', name: 'alpha' })
    expect(detail.hooksFired).toEqual([{ event: 'Stop', count: 2 }])
    expect(detail.toolTimeline).toEqual([])
  })

  it('prefers an existing project-scoped asset over the session placeholder', () => {
    const skill: Asset = {
      id: 'skill-alpha',
      agentId: 'claude-code',
      category: 'instruction',
      type: 'skill',
      scope: 'project',
      name: 'Alpha',
      path: '/code/berth/.claude/skills/alpha/SKILL.md',
      meta: {}
    }
    const detail = buildSessionDetail(sessionAsset(), [skill])
    expect(detail.skillsUsed[0].id).toBe('skill-alpha')
  })

  it('codex session: agent-derived provider, no claude-style hook fallback', () => {
    const detail = buildSessionDetail(
      sessionAsset({ agentId: 'codex', meta: { model: 'gpt-5.5', hooksFired: 3 } }),
      []
    )
    expect(detail.modelInfo!.provider).toBe('OpenAI')
    expect(detail.modelInfo!.knowledgeCutoff).toBe('2025-12-01')
    expect(detail.hooksFired).toEqual([])
  })

  it('model-id date inference wins over catalog metadata', () => {
    const detail = buildSessionDetail(
      sessionAsset({ meta: { model: 'claude-sonnet-4-6-20251001' } }),
      []
    )
    expect(detail.modelInfo!.releaseDate).toBe('2025-10-01')
    expect(detail.modelInfo!.releaseDateSource).toBe('model-id')
  })

  it('unknown agent yields empty execution detail instead of throwing', () => {
    const detail = buildSessionDetail(sessionAsset({ agentId: 'mystery', meta: { model: '' } }), [])
    expect(detail.toolTimeline).toEqual([])
    expect(detail.artifacts).toEqual({ plans: [], todos: [], files: [], checkpoints: [] })
    expect(detail.modelInfo!.provider).toBeNull()
  })
})

describe('execution detail fingerprint cache (GH-116)', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  const toolUseLine = (command: string): string =>
    JSON.stringify({
      type: 'assistant',
      timestamp: '2026-06-11T06:00:00.000Z',
      message: {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'call-1', name: 'Bash', input: { command } }]
      }
    })

  it('reuses parsed detail until the transcript fingerprint changes', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-detail-cache-'))
    const filePath = path.join(tempDir, 'session.jsonl')
    fs.writeFileSync(filePath, toolUseLine('pnpm aa'))
    // 钉整毫秒 mtime — utimesSync 只有 Date (ms) 精度, 还原 statSync 的亚毫秒 mtime 不可行
    const fixed = new Date('2026-06-11T00:00:00.000Z')
    fs.utimesSync(filePath, fixed, fixed)
    const asset = sessionAsset({ id: 'session-detail-cache', path: filePath })

    expect(buildSessionDetail(asset, []).toolTimeline[0].summary).toBe('pnpm aa')

    // 同字节长 + 同 mtime → 指纹相同 → 命中缓存 (返回旧解析)
    fs.writeFileSync(filePath, toolUseLine('pnpm bb'))
    fs.utimesSync(filePath, fixed, fixed)
    expect(buildSessionDetail(asset, []).toolTimeline[0].summary).toBe('pnpm aa')

    // 追加内容改变指纹 → 重新解析
    fs.appendFileSync(filePath, '\n')
    fs.writeFileSync(filePath, toolUseLine('pnpm ccc'))
    expect(buildSessionDetail(asset, []).toolTimeline[0].summary).toBe('pnpm ccc')
  })
})
