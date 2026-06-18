import type { HeatmapDay } from '@shared/types/insights'

// GH-138: 从年度热力图日序列派生 token 近况 (sparkline 序列 + 环比), 纯函数 (可直测)。
// 复用已取回的 insights.heatmap.days, 不新增引擎聚合 / IPC。随 agentView/scope 过滤自动联动。

export interface TokenTrend {
  /** 近 sparkDays 天的每日 token 序列 (画 sparkline)。 */
  series: number[]
  /** 近 window 天 vs 前 window 天的 token 环比 (%); 前一窗口为 0 (无可比基准) 时为 null。 */
  deltaPct: number | null
}

export function tokenTrend(days: HeatmapDay[], window = 7, sparkDays = 14): TokenTrend {
  const sum = (slice: HeatmapDay[]): number => slice.reduce((total, day) => total + (day.tokens || 0), 0)
  const series = days.slice(-sparkDays).map((day) => day.tokens || 0)
  const recent = sum(days.slice(-window))
  const prior = sum(days.slice(-2 * window, -window))
  const deltaPct = prior > 0 ? ((recent - prior) / prior) * 100 : null
  return { series, deltaPct }
}

export interface CostTrend {
  /** 近 sparkDays 天的每日花费序列 (画 sparkline)。 */
  series: number[]
  /** 近 window 天 vs 前 window 天的花费环比 (%); 前一窗口为 0 时为 null。 */
  deltaPct: number | null
}

/** 从 usage.dailyCosts 派生花费近况 (sparkline + 环比), 纯函数。与 tokenTrend 同构, 作用于花费序列。 */
export function costTrend(daily: { date: string; cost: number }[], window = 7, sparkDays = 14): CostTrend {
  const sum = (slice: { cost: number }[]): number => slice.reduce((total, day) => total + (day.cost || 0), 0)
  const series = daily.slice(-sparkDays).map((day) => day.cost || 0)
  const recent = sum(daily.slice(-window))
  const prior = sum(daily.slice(-2 * window, -window))
  const deltaPct = prior > 0 ? ((recent - prior) / prior) * 100 : null
  return { series, deltaPct }
}

export interface CumulativePoint {
  date: string
  value: number
}

/** 累计运行总和序列 (单调增长): 逐日把 tokens/sessions 累加, 画"累计增长曲线"。纯函数。 */
export function cumulativeSeries(days: HeatmapDay[], pick: 'tokens' | 'sessions'): CumulativePoint[] {
  let acc = 0
  return days.map((day) => {
    acc += (pick === 'tokens' ? day.tokens : day.sessions) || 0
    return { date: day.date, value: acc }
  })
}
