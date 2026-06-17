/**
 * Dashboard insights — 聚合自已扫描 session 资产的首页可视化数据 (GH-138)。
 * 纯类型, 无 node 依赖; engine/activity-insights.ts 产出, insights:dashboard IPC 传输, renderer widget 消费。
 */

/** 活动热力图单日 (GitHub 风格方格)。 */
export interface HeatmapDay {
  /** YYYY-MM-DD — 取 session startedAt 前 10 位, 与 usage.dailyTokenUsage 同口径对齐。 */
  date: string
  sessions: number
  tokens: number
}

/** 年度活动热力图: 连续日序列 (含零活动日, 供方格网格完整渲染)。 */
export interface ActivityHeatmap {
  days: HeatmapDay[]
  maxSessions: number
  maxTokens: number
  rangeStart: string
  rangeEnd: string
}

/** 连续活跃天数。current 仅在最后活跃日为今日/昨日时计数。 */
export interface StreakStats {
  current: number
  longest: number
  lastActiveDate: string | null
}

/** 峰值/累计类指标卡数据。 */
export interface PeakMetrics {
  cumulativeTokens: number
  peakDailyTokens: number
  peakSessionTokens: number
  maxSessionDurationSeconds: number
  totalSessions: number
}

/** Top-N 排行单项 (skill / mcp 等)。 */
export interface TopUsageEntry {
  name: string
  count: number
  /** 占该类总调用次数百分比 (整数)。 */
  pct: number
}

/** 活动洞察 — 仅产出 berth 数据可支撑的字段, 不臆造 (如 Codex 的快速模式%/推理强度无对应源, 不做)。 */
export interface ActivityInsights {
  totalSessions: number
  skillsExplored: number
  pluginsInstalled: number
  mcpServersConfigured: number
  totalSkillInvocations: number
  topModel: string | null
  agentSplit: Array<{ agentId: string; count: number }>
}

/** insights:dashboard 的合并 payload — 一次往返取回首页全部聚合数据。 */
export interface DashboardInsights {
  heatmap: ActivityHeatmap
  streak: StreakStats
  peak: PeakMetrics
  topSkills: TopUsageEntry[]
  topMcpServers: TopUsageEntry[]
  insights: ActivityInsights
}
