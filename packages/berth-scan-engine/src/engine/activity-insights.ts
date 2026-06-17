import type { Asset, AssetStats } from '@shared/types/asset'
import type {
  ActivityHeatmap,
  ActivityInsights,
  DashboardInsights,
  HeatmapDay,
  PeakMetrics,
  StreakStats,
  TopUsageEntry
} from '@shared/types/insights'
import { normalizeTokenUsage } from '@shared/token-usage'
import { readNumber, readString, readStringArray } from '@shared/object-guards'

// GH-138: 首页仪表盘聚合纯函数。输入为已扫描资产 (调用方按 project/agent 预过滤);
// 只读 session 资产 meta (复用 toSessionSummary 同口径字段), 不引 session-detail 的重依赖。
// 日界与 usage.ts 一致: startedAt 字符串前 10 位; 范围按 UTC 日materialize。now 可注入以保证可测。

// 「最长任务」sanity cap: session.meta.duration 取 endedAt-startedAt 墙钟跨度, 长期未关闭的
// session 会产出数十天的异常值 (非真实任务时长)。>24h 视为 stale/未关闭, 从峰值时长剔除。
// (理想是用活跃时长而非墙钟跨度; 见 docs/issues/2026-06-17-...-duration-outlier)
const MAX_PLAUSIBLE_SESSION_SECONDS = 24 * 60 * 60

interface SessionRecord {
  agentId: string
  day: string | null
  tokens: number
  durationSeconds: number | null
  skills: string[]
  mcpServers: string[]
  model: string | null
}

function toRecord(asset: Asset): SessionRecord {
  const tokenUsage = normalizeTokenUsage(asset.meta.tokenUsage ?? asset.meta)
  return {
    agentId: asset.agentId,
    day: dayKey(readString(asset.meta, 'startedAt')),
    tokens: tokenUsage.totalTokens,
    durationSeconds: readNumber(asset.meta, 'duration') ?? null,
    skills: readStringArray(asset.meta, 'skillsUsed'),
    mcpServers: readStringArray(asset.meta, 'mcpServers'),
    model: readString(asset.meta, 'model') ?? null
  }
}

function dayKey(value: string | undefined): string | null {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return value.slice(0, 10)
}

function resolveNow(now?: Date | string): Date {
  if (now instanceof Date && !Number.isNaN(now.getTime())) return now
  if (typeof now === 'string') {
    const parsed = new Date(now)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isNextDay(prev: string, next: string): boolean {
  return isoDay(addUtcDays(new Date(`${prev}T00:00:00.000Z`), 1)) === next
}

function sessionAssets(assets: Asset[]): Asset[] {
  return assets.filter((asset) => asset.type === 'session')
}

/** GitHub 风格年度热力图: 连续日序列 (含零活动日)。 */
export function buildActivityHeatmap(
  assets: Asset[],
  opts: { days?: number; now?: Date | string } = {}
): ActivityHeatmap {
  const days = opts.days && opts.days > 0 ? Math.floor(opts.days) : 365
  const end = startOfUtcDay(resolveNow(opts.now))
  const start = addUtcDays(end, -(days - 1))

  const byDay = new Map<string, { sessions: number; tokens: number }>()
  for (const asset of sessionAssets(assets)) {
    const record = toRecord(asset)
    if (!record.day) continue
    const entry = byDay.get(record.day) ?? { sessions: 0, tokens: 0 }
    entry.sessions += 1
    entry.tokens += record.tokens
    byDay.set(record.day, entry)
  }

  const out: HeatmapDay[] = []
  let maxSessions = 0
  let maxTokens = 0
  for (let i = 0; i < days; i++) {
    const date = isoDay(addUtcDays(start, i))
    const entry = byDay.get(date) ?? { sessions: 0, tokens: 0 }
    out.push({ date, sessions: entry.sessions, tokens: entry.tokens })
    if (entry.sessions > maxSessions) maxSessions = entry.sessions
    if (entry.tokens > maxTokens) maxTokens = entry.tokens
  }

  return { days: out, maxSessions, maxTokens, rangeStart: isoDay(start), rangeEnd: isoDay(end) }
}

/** 连续活跃天数 (current 仅在最后活跃日为今日/昨日时计)。 */
export function buildStreakStats(
  assets: Asset[],
  opts: { now?: Date | string } = {}
): StreakStats {
  const activeDays = new Set<string>()
  for (const asset of sessionAssets(assets)) {
    const day = dayKey(readString(asset.meta, 'startedAt'))
    if (day) activeDays.add(day)
  }
  if (activeDays.size === 0) return { current: 0, longest: 0, lastActiveDate: null }

  const sorted = [...activeDays].sort()
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    run = isNextDay(sorted[i - 1], sorted[i]) ? run + 1 : 1
    if (run > longest) longest = run
  }

  const lastActiveDate = sorted[sorted.length - 1]
  const today = isoDay(startOfUtcDay(resolveNow(opts.now)))
  const yesterday = isoDay(addUtcDays(startOfUtcDay(resolveNow(opts.now)), -1))
  let current = 0
  if (lastActiveDate === today || lastActiveDate === yesterday) {
    let cursor = lastActiveDate
    while (activeDays.has(cursor)) {
      current += 1
      cursor = isoDay(addUtcDays(new Date(`${cursor}T00:00:00.000Z`), -1))
    }
  }

  return { current, longest, lastActiveDate }
}

/** 累计/峰值类指标。 */
export function buildPeakMetrics(assets: Asset[]): PeakMetrics {
  let cumulativeTokens = 0
  let peakSessionTokens = 0
  let maxSessionDurationSeconds = 0
  let totalSessions = 0
  const dailyTokens = new Map<string, number>()

  for (const asset of sessionAssets(assets)) {
    totalSessions += 1
    const record = toRecord(asset)
    cumulativeTokens += record.tokens
    if (record.tokens > peakSessionTokens) peakSessionTokens = record.tokens
    if (
      record.durationSeconds &&
      record.durationSeconds <= MAX_PLAUSIBLE_SESSION_SECONDS &&
      record.durationSeconds > maxSessionDurationSeconds
    ) {
      maxSessionDurationSeconds = record.durationSeconds
    }
    if (record.day) dailyTokens.set(record.day, (dailyTokens.get(record.day) ?? 0) + record.tokens)
  }

  let peakDailyTokens = 0
  for (const value of dailyTokens.values()) {
    if (value > peakDailyTokens) peakDailyTokens = value
  }

  return { cumulativeTokens, peakDailyTokens, peakSessionTokens, maxSessionDurationSeconds, totalSessions }
}

/** Top-N skill / mcp 排行 (按调用次数降序, 并列按名称升序)。 */
export function buildTopUsage(
  assets: Asset[],
  opts: { kind: 'skill' | 'mcp'; limit?: number }
): TopUsageEntry[] {
  const limit = opts.limit && opts.limit > 0 ? Math.floor(opts.limit) : 10
  const counts = new Map<string, number>()
  let total = 0
  for (const asset of sessionAssets(assets)) {
    const names =
      opts.kind === 'skill'
        ? readStringArray(asset.meta, 'skillsUsed')
        : readStringArray(asset.meta, 'mcpServers')
    for (const name of names) {
      if (!name) continue
      counts.set(name, (counts.get(name) ?? 0) + 1)
      total += 1
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
}

/** 活动洞察 — 只产出 berth 数据可支撑字段。 */
export function buildActivityInsights(assets: Asset[], stats: AssetStats): ActivityInsights {
  const sessions = sessionAssets(assets)
  let totalSkillInvocations = 0
  const modelCounts = new Map<string, number>()
  const agentCounts = new Map<string, number>()
  for (const asset of sessions) {
    const record = toRecord(asset)
    totalSkillInvocations += record.skills.length
    if (record.model) modelCounts.set(record.model, (modelCounts.get(record.model) ?? 0) + 1)
    agentCounts.set(record.agentId, (agentCounts.get(record.agentId) ?? 0) + 1)
  }

  let topModel: string | null = null
  let topModelCount = 0
  for (const [model, count] of modelCounts) {
    if (count > topModelCount || (count === topModelCount && topModel != null && model.localeCompare(topModel) < 0)) {
      topModel = model
      topModelCount = count
    }
  }

  const agentSplit = [...agentCounts.entries()]
    .map(([agentId, count]) => ({ agentId, count }))
    .sort((a, b) => b.count - a.count || a.agentId.localeCompare(b.agentId))

  return {
    totalSessions: sessions.length,
    skillsExplored: stats.skills,
    pluginsInstalled: stats.plugins,
    mcpServersConfigured: stats.mcpServers,
    totalSkillInvocations,
    topModel,
    agentSplit
  }
}

/** 编排上述, 供 runtime/insights:dashboard 调用。 */
export function buildDashboardInsights(
  assets: Asset[],
  stats: AssetStats,
  opts: { days?: number; now?: Date | string } = {}
): DashboardInsights {
  const sessions = sessionAssets(assets)
  return {
    heatmap: buildActivityHeatmap(sessions, opts),
    streak: buildStreakStats(sessions, opts),
    peak: buildPeakMetrics(sessions),
    topSkills: buildTopUsage(sessions, { kind: 'skill' }),
    topMcpServers: buildTopUsage(sessions, { kind: 'mcp' }),
    insights: buildActivityInsights(sessions, stats)
  }
}
