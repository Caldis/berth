import type { TokenUsageSegmentId } from '@shared/token-usage'

// 图表配色单一真源。颜色值定义于 styles/globals.css 的 CSS 变量, 此处只引用,
// 保证亮/暗主题自适应。按数据语义分流:
//   - 同质序列 (按时间的单序列, 如近 7 天费用 / 每日花费) → 中性 primary 单色;
//   - 多分类 (token 段、按模型/项目 breakdown) → 蓝绿橙紫粉语义色板。

/** 同质序列图统一中性单色 */
export const CHART_SERIES_FILL = 'hsl(var(--primary))'

/** 多分类语义色板: token 段固定语义 + breakdown 按序循环 (对应 --chart-1..5) */
export const CHART_CATEGORICAL = [
  'hsl(var(--chart-1))', // 蓝 · 输入
  'hsl(var(--chart-2))', // 绿 · 输出
  'hsl(var(--chart-3))', // 橙 · 缓存
  'hsl(var(--chart-4))', // 紫 · 推理
  'hsl(var(--chart-5))' // 粉 · 第 5+ 分类
] as const

/** token 段 → CSS 变量名 (固定语义映射; unknown 用中性 muted) */
export const TOKEN_SEGMENT_COLOR_VAR: Record<TokenUsageSegmentId, string> = {
  input: '--chart-1',
  output: '--chart-2',
  cache: '--chart-3',
  reasoning: '--chart-4',
  unknown: '--muted-foreground'
}
