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

/** 活动节律 (punch-card): 按本地时区的 星期×小时 会话分布, 看"何时工作"。 */
export interface HourlyRhythm {
  /** 7 行 (0=周日..6=周六) × 24 列 (0..23 时) 的会话计数矩阵 (本地时区)。 */
  grid: number[][]
  /** 单格最大会话数 (强度归一化用)。 */
  maxSessions: number
  /** 全矩阵会话总数 (空态判定)。 */
  totalSessions: number
  /** 最忙的 (星期,小时); 无数据为 null。 */
  peak: { weekday: number; hour: number; sessions: number } | null
}

/** 会话时长分布: 按时长区间分桶, 看"快修 vs 长跑"。 */
export interface SessionDurationHistogram {
  /** 固定 5 桶 (<5m / 5-15m / 15-60m / 1-4h / 4h+), 顺序固定; id 由 widget 映射标签。 */
  buckets: Array<{ id: 'lt5m' | 'lt15m' | 'lt1h' | 'lt4h' | 'gte4h'; count: number }>
  /** 计入的会话总数 (有有效时长且非 stale)。 */
  total: number
  /** 单桶最大计数 (条形归一化用)。 */
  maxCount: number
}

/** 模型强度: 各模型的"每会话平均 token", 看哪个模型每会话最重 (与 model 总量 breakdown 互补)。 */
export interface ModelEfficiency {
  /** 按 avgTokens 降序的模型 (已截断 Top-N)。 */
  models: Array<{ model: string; sessions: number; avgTokens: number }>
  /** 最大 avgTokens (条形归一化用)。 */
  maxAvg: number
}

/** insights:dashboard 的合并 payload — 一次往返取回首页全部聚合数据。 */
export interface DashboardInsights {
  heatmap: ActivityHeatmap
  streak: StreakStats
  peak: PeakMetrics
  topSkills: TopUsageEntry[]
  topMcpServers: TopUsageEntry[]
  insights: ActivityInsights
  rhythm: HourlyRhythm
  durationHistogram: SessionDurationHistogram
  modelEfficiency: ModelEfficiency
}
