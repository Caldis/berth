import type { Asset, AssetStats } from '@shared/types/asset'
import type {
  ActivityHeatmap,
  ActivityInsights,
  DashboardInsights,
  HeatmapDay,
  HourlyRhythm,
  ModelEfficiency,
  ModelTrend,
  ModelTrendPoint,
  PeakMetrics,
  SessionDurationHistogram,
  StreakStats,
  TopUsageEntry
} from '@shared/types/insights'
import { MODEL_TREND_OTHERS } from '@shared/types/insights'
import { normalizeTokenUsage } from '@shared/token-usage'
import { readNumber, readString, readStringArray } from '@shared/object-guards'

export { MODEL_TREND_OTHERS }

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

/**
 * 活动节律 punch-card: 按 星期×小时 统计会话分布。
 * startedAt 为 UTC 瞬时, 偏移 tzOffsetMinutes (= 本地相对 UTC 的分钟数, 如 UTC+8 传 480)
 * 后用 UTC 取值器读"本地墙钟"星期/小时 — 保证纯函数可测 (注入偏移) 且呈现的是用户本地作息。
 */
export function buildHourlyRhythm(assets: Asset[], opts: { tzOffsetMinutes?: number } = {}): HourlyRhythm {
  const tz = Number.isFinite(opts.tzOffsetMinutes) ? (opts.tzOffsetMinutes as number) : 0
  const grid: number[][] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  let totalSessions = 0
  for (const asset of sessionAssets(assets)) {
    const started = readString(asset.meta, 'startedAt')
    if (!started) continue
    const instant = new Date(started)
    if (Number.isNaN(instant.getTime())) continue
    const local = new Date(instant.getTime() + tz * 60_000)
    grid[local.getUTCDay()][local.getUTCHours()] += 1
    totalSessions += 1
  }

  let maxSessions = 0
  let peak: HourlyRhythm['peak'] = null
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      const sessions = grid[weekday][hour]
      if (sessions > maxSessions) {
        maxSessions = sessions
        peak = { weekday, hour, sessions }
      }
    }
  }

  return { grid, maxSessions, totalSessions, peak }
}

/**
 * 会话时长分布: 按 <5m / 5-15m / 15-60m / 1-4h / 4h+ 分桶 ("快修 vs 长跑")。
 * 排除无/非正时长 + >24h 的 stale 会话 (墙钟跨度异常, 与 buildPeakMetrics 同口径)。
 */
const DURATION_BUCKET_BOUNDS = [5 * 60, 15 * 60, 60 * 60, 4 * 60 * 60] as const
const DURATION_BUCKET_IDS = ['lt5m', 'lt15m', 'lt1h', 'lt4h', 'gte4h'] as const

export function buildSessionDurationHistogram(assets: Asset[]): SessionDurationHistogram {
  const counts = [0, 0, 0, 0, 0]
  for (const asset of sessionAssets(assets)) {
    const duration = readNumber(asset.meta, 'duration')
    if (duration == null || duration <= 0 || duration > MAX_PLAUSIBLE_SESSION_SECONDS) continue
    let index = DURATION_BUCKET_BOUNDS.findIndex((bound) => duration < bound)
    if (index < 0) index = DURATION_BUCKET_BOUNDS.length // >= 4h → 最后一桶
    counts[index] += 1
  }
  const buckets = DURATION_BUCKET_IDS.map((id, i) => ({ id, count: counts[i] }))
  const total = counts.reduce((sum, n) => sum + n, 0)
  const maxCount = counts.reduce((max, n) => (n > max ? n : max), 0)
  return { buckets, total, maxCount }
}

/** 模型强度: 各模型"每会话平均 token" Top-N (看哪个模型每会话最重)。复用 toRecord (model + tokens)。 */
export function buildModelEfficiency(assets: Asset[], limit = 8): ModelEfficiency {
  const acc = new Map<string, { sessions: number; tokens: number }>()
  for (const asset of sessionAssets(assets)) {
    const record = toRecord(asset)
    if (!record.model) continue
    const entry = acc.get(record.model) ?? { sessions: 0, tokens: 0 }
    entry.sessions += 1
    entry.tokens += record.tokens
    acc.set(record.model, entry)
  }
  const models = [...acc.entries()]
    .map(([model, e]) => ({
      model,
      sessions: e.sessions,
      avgTokens: e.sessions > 0 ? Math.round(e.tokens / e.sessions) : 0
    }))
    .filter((m) => m.avgTokens > 0)
    .sort((a, b) => b.avgTokens - a.avgTokens || a.model.localeCompare(b.model))
    .slice(0, limit)
  const maxAvg = models.reduce((max, m) => (m.avgTokens > max ? m.avgTokens : max), 0)
  return { models, maxAvg }
}

// 模型趋势: 窗口内按总量取 Top-N 模型, 其余并入 others 桶; 逐日零填充, 供堆叠面积消费。
const MODEL_TREND_TOP_N = 5
const MODEL_TREND_DEFAULT_DAYS = 30

/** tokens 分模型随时间分布: 看模型构成如何迁移 (与 model 总量/强度互补)。复用 toRecord (model+tokens+day)。 */
export function buildModelTrend(
  assets: Asset[],
  opts: { days?: number; now?: Date | string; topN?: number } = {}
): ModelTrend {
  const days = opts.days && opts.days > 0 ? Math.floor(opts.days) : MODEL_TREND_DEFAULT_DAYS
  const topN = opts.topN && opts.topN > 0 ? Math.floor(opts.topN) : MODEL_TREND_TOP_N
  const end = startOfUtcDay(resolveNow(opts.now))
  const start = addUtcDays(end, -(days - 1))
  const startKey = isoDay(start)
  const endKey = isoDay(end)

  const modelTotals = new Map<string, number>()
  const byDayModel = new Map<string, Map<string, number>>()
  for (const asset of sessionAssets(assets)) {
    const record = toRecord(asset)
    if (!record.day || !record.model || record.tokens <= 0) continue
    if (record.day < startKey || record.day > endKey) continue
    modelTotals.set(record.model, (modelTotals.get(record.model) ?? 0) + record.tokens)
    const dayMap = byDayModel.get(record.day) ?? new Map<string, number>()
    dayMap.set(record.model, (dayMap.get(record.model) ?? 0) + record.tokens)
    byDayModel.set(record.day, dayMap)
  }

  const ranked = [...modelTotals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const topModels = ranked.slice(0, topN).map(([model]) => model)
  const topSet = new Set(topModels)
  const hasOthers = ranked.length > topModels.length
  const models = hasOthers ? [...topModels, MODEL_TREND_OTHERS] : topModels

  const points: ModelTrendPoint[] = []
  let maxTotal = 0
  for (let i = 0; i < days; i++) {
    const date = isoDay(addUtcDays(start, i))
    const tokens: Record<string, number> = {}
    for (const model of models) tokens[model] = 0
    let total = 0
    const dayMap = byDayModel.get(date)
    if (dayMap) {
      for (const [model, tok] of dayMap) {
        const key = topSet.has(model) ? model : MODEL_TREND_OTHERS
        tokens[key] += tok
        total += tok
      }
    }
    points.push({ date, total, tokens })
    if (total > maxTotal) maxTotal = total
  }

  return { days: points.map((p) => p.date), models, points, maxTotal, rangeStart: startKey, rangeEnd: endKey }
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
  opts: { days?: number; now?: Date | string; tzOffsetMinutes?: number } = {}
): DashboardInsights {
  const sessions = sessionAssets(assets)
  return {
    heatmap: buildActivityHeatmap(sessions, opts),
    streak: buildStreakStats(sessions, opts),
    peak: buildPeakMetrics(sessions),
    topSkills: buildTopUsage(sessions, { kind: 'skill' }),
    topMcpServers: buildTopUsage(sessions, { kind: 'mcp' }),
    insights: buildActivityInsights(sessions, stats),
    rhythm: buildHourlyRhythm(sessions, { tzOffsetMinutes: opts.tzOffsetMinutes }),
    durationHistogram: buildSessionDurationHistogram(sessions),
    modelEfficiency: buildModelEfficiency(sessions),
    modelTrend: buildModelTrend(sessions, { now: opts.now })
  }
}
