import type { SessionSummary } from '@shared/types/asset'

// GH-116: 会话列表结构化筛选/排序/日期分桶的纯逻辑层。
// 设计依据: 实际检索路径 — "哪个 agent / 哪个模型 / 最近·最贵·最长的会话"。
// now 注入可测; 直测于 tests/renderer/session-list-filters.test.ts。

export type SessionAgentFilter = 'all' | 'claude' | 'codex'
export type SessionSortBy = 'recent' | 'duration' | 'cost' | 'tokens'
export type SessionGroupBy = 'project' | 'date' | 'none'

export type SessionDateBucket = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'earlier' | 'unknown'

export const SESSION_DATE_BUCKET_ORDER: readonly SessionDateBucket[] = [
  'today',
  'yesterday',
  'thisWeek',
  'thisMonth',
  'earlier',
  'unknown'
]

export function isClaudeAgent(agentId: string): boolean {
  return agentId === 'claude-code' || agentId === 'claude'
}

export function applySessionFilters(
  sessions: readonly SessionSummary[],
  filter: { agent: SessionAgentFilter; models: ReadonlySet<string> }
): SessionSummary[] {
  return sessions.filter((session) => {
    if (filter.agent === 'claude' && !isClaudeAgent(session.agentId)) return false
    if (filter.agent === 'codex' && session.agentId !== 'codex') return false
    if (filter.models.size > 0 && !filter.models.has(session.model)) return false
    return true
  })
}

export function sessionAgentCounts(
  sessions: readonly SessionSummary[]
): Record<SessionAgentFilter, number> {
  let claude = 0
  let codex = 0
  for (const session of sessions) {
    if (isClaudeAgent(session.agentId)) claude++
    else if (session.agentId === 'codex') codex++
  }
  return { all: sessions.length, claude, codex }
}

export function sessionModelOptions(sessions: readonly SessionSummary[]): string[] {
  const models = new Set<string>()
  for (const session of sessions) {
    if (session.model) models.add(session.model)
  }
  return [...models].sort()
}

/** 按本地日历日分桶; 未来时间按 today 容错; 无效/缺失时间归 unknown。 */
export function sessionDateBucket(startedAt: string | null, now: Date): SessionDateBucket {
  if (!startedAt) return 'unknown'
  const started = new Date(startedAt)
  if (Number.isNaN(started.getTime())) return 'unknown'
  const dayMs = 86_400_000
  const startOfDay = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.floor((startOfDay(now) - startOfDay(started)) / dayMs)
  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return 'thisWeek'
  if (diffDays < 30) return 'thisMonth'
  return 'earlier'
}

/** 返回新数组, 不改输入; null 值一律排尾。 */
export function sortSessions(
  sessions: readonly SessionSummary[],
  sortBy: SessionSortBy
): SessionSummary[] {
  const value = (session: SessionSummary): number | null => {
    if (sortBy === 'recent') {
      if (!session.startedAt) return null
      const ms = Date.parse(session.startedAt)
      return Number.isNaN(ms) ? null : ms
    }
    if (sortBy === 'duration') return session.duration
    if (sortBy === 'cost') return session.cost
    return session.tokens > 0 ? session.tokens : null
  }
  return [...sessions].sort((a, b) => {
    const av = value(a)
    const bv = value(b)
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    return bv - av
  })
}
