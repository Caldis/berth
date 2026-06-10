import { describe, expect, it } from 'vitest'
import type { SessionSummary } from '@shared/types/asset'
import { normalizeTokenUsage } from '@shared/token-usage'
import {
  SESSION_DATE_BUCKET_ORDER,
  applySessionFilters,
  sessionAgentCounts,
  sessionDateBucket,
  sessionModelOptions,
  sortSessions
} from '@/lib/session-list-filters'

const session = (over: Partial<SessionSummary>): SessionSummary => ({
  id: 'unset',
  agentId: 'claude-code',
  title: 'A session',
  project: 'berth',
  projectPath: 'D:\\Code\\berth',
  transcriptPath: 'C:\\t.jsonl',
  startedAt: '2026-06-10T01:00:00.000Z',
  endedAt: null,
  duration: null,
  cost: null,
  tokens: 0,
  tokenUsage: normalizeTokenUsage({}),
  model: 'claude-opus-4-8',
  skillsUsed: [],
  mcpServers: [],
  hooksFired: 0,
  ...over
})

describe('sessionDateBucket', () => {
  // 注入 now, 不依赖系统时钟 (本地时区日历日比较)
  const now = new Date(2026, 5, 11, 15, 30) // 2026-06-11 local

  const local = (y: number, m: number, d: number, h = 12): string =>
    new Date(y, m, d, h).toISOString()

  it('classifies calendar-day buckets with an injected now', () => {
    expect(sessionDateBucket(local(2026, 5, 11, 1), now)).toBe('today')
    expect(sessionDateBucket(local(2026, 5, 10, 23), now)).toBe('yesterday')
    expect(sessionDateBucket(local(2026, 5, 6), now)).toBe('thisWeek') // 5 天前
    expect(sessionDateBucket(local(2026, 5, 5), now)).toBe('thisWeek') // 6 天前 (<7 边界内)
    expect(sessionDateBucket(local(2026, 5, 4), now)).toBe('thisMonth') // 恰好 7 天 → 出周入月
    expect(sessionDateBucket(local(2026, 4, 20), now)).toBe('thisMonth') // 22 天前
    expect(sessionDateBucket(local(2026, 3, 1), now)).toBe('earlier')
    expect(sessionDateBucket(null, now)).toBe('unknown')
    expect(sessionDateBucket('not a date', now)).toBe('unknown')
    // 未来时间戳按 today 处理 (时钟偏移容错)
    expect(sessionDateBucket(local(2026, 5, 12), now)).toBe('today')
  })

  it('keeps a stable display order', () => {
    expect(SESSION_DATE_BUCKET_ORDER).toEqual([
      'today',
      'yesterday',
      'thisWeek',
      'thisMonth',
      'earlier',
      'unknown'
    ])
  })
})

describe('applySessionFilters / counts / options', () => {
  const sessions = [
    session({ id: 'c1', agentId: 'claude-code', model: 'claude-opus-4-8' }),
    session({ id: 'c2', agentId: 'claude', model: 'claude-sonnet-4-6' }),
    session({ id: 'x1', agentId: 'codex', model: 'gpt-5.3-codex' }),
    session({ id: 'x2', agentId: 'codex', model: '' })
  ]

  it('filters by agent family and model set', () => {
    expect(applySessionFilters(sessions, { agent: 'all', models: new Set() }).map((s) => s.id)).toEqual([
      'c1',
      'c2',
      'x1',
      'x2'
    ])
    expect(applySessionFilters(sessions, { agent: 'claude', models: new Set() }).map((s) => s.id)).toEqual([
      'c1',
      'c2'
    ])
    expect(applySessionFilters(sessions, { agent: 'codex', models: new Set() }).map((s) => s.id)).toEqual([
      'x1',
      'x2'
    ])
    expect(
      applySessionFilters(sessions, { agent: 'all', models: new Set(['gpt-5.3-codex']) }).map((s) => s.id)
    ).toEqual(['x1'])
    expect(
      applySessionFilters(sessions, { agent: 'claude', models: new Set(['gpt-5.3-codex']) })
    ).toEqual([])
  })

  it('counts agents and dedupes model options', () => {
    expect(sessionAgentCounts(sessions)).toEqual({ all: 4, claude: 2, codex: 2 })
    expect(sessionModelOptions([...sessions, session({ id: 'c3', model: 'claude-opus-4-8' })])).toEqual([
      'claude-opus-4-8',
      'claude-sonnet-4-6',
      'gpt-5.3-codex'
    ])
  })
})

describe('sortSessions', () => {
  const sessions = [
    session({ id: 'a', startedAt: '2026-06-01T00:00:00.000Z', duration: 60, cost: 0.5, tokens: 100 }),
    session({ id: 'b', startedAt: '2026-06-10T00:00:00.000Z', duration: null, cost: 2, tokens: 50 }),
    session({ id: 'c', startedAt: null, duration: 300, cost: null, tokens: 900 })
  ]

  it('sorts by recency with nulls last and does not mutate input', () => {
    const input = [...sessions]
    expect(sortSessions(sessions, 'recent').map((s) => s.id)).toEqual(['b', 'a', 'c'])
    expect(sessions.map((s) => s.id)).toEqual(input.map((s) => s.id))
  })

  it('sorts by duration, cost, and tokens descending with nulls last', () => {
    expect(sortSessions(sessions, 'duration').map((s) => s.id)).toEqual(['c', 'a', 'b'])
    expect(sortSessions(sessions, 'cost').map((s) => s.id)).toEqual(['b', 'a', 'c'])
    expect(sortSessions(sessions, 'tokens').map((s) => s.id)).toEqual(['c', 'a', 'b'])
  })
})
