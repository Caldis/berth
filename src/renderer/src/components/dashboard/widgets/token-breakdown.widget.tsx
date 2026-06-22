import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { BarChartHorizontal, ChartPie, Donut } from 'lucide-react'
import { tokenUsageSegments, type TokenUsageSegmentId } from '@shared/token-usage'
import { useUsageSummary } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import { TOKEN_SEGMENT_COLOR_VAR } from '@/lib/chart-colors'
import { formatCompactNumber } from '@/lib/utils'
import { projectPathForScope } from '@shared/scope'
import type { WidgetRenderProps } from '../widget-types'
import { ChartTypeToggle, useChartForm, type ChartFormOption } from './chart-type-toggle'

const SEGMENT_LABEL_KEYS: Record<TokenUsageSegmentId, string> = {
  input: 'usage.inputTokens',
  output: 'usage.outputTokens',
  cache: 'usage.cacheTokens',
  reasoning: 'usage.reasoningTokens',
  unknown: 'usage.unknownTokens'
}

function segmentColor(id: TokenUsageSegmentId): string {
  const variable = TOKEN_SEGMENT_COLOR_VAR[id]
  return id === 'unknown' ? `hsl(var(${variable}) / 0.5)` : `hsl(var(${variable}))`
}

type ChartForm = 'bar' | 'pie' | 'donut'
const FORM_IDS = ['bar', 'pie', 'donut'] as const
const FORM_ICONS: Record<ChartForm, ChartFormOption<ChartForm>['icon']> = {
  bar: BarChartHorizontal,
  pie: ChartPie,
  donut: Donut
}

// GH-138 R2-B: Token 构成 widget — 支持 堆叠条 / 饼图 / 空心饼(donut) 形态切换 (用户可选展现形式)。
// token 分段是语义分类, 用分类色 (TOKEN_SEGMENT_COLOR_VAR)。L 尺寸显示更大图形。
// 形态经 layout 持久化 (chartType/onChartTypeChange); 库内预览缺回调时退化为本地态。
export function TokenBreakdownWidget({ w, h, chartType, onChartTypeChange }: WidgetRenderProps): React.ReactElement {
  const { t } = useTranslation()
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const agentView = useAppStore((s) => s.agentView)
  const { usage, loading } = useUsageSummary(30, agentView, projectPath)
  const [form, setForm] = useChartForm(FORM_IDS, 'bar', chartType, onChartTypeChange)
  const formOptions: ChartFormOption<ChartForm>[] = FORM_IDS.map((id) => ({
    id,
    icon: FORM_ICONS[id],
    label: t(`overview.dashboard.chartForm.${id}`)
  }))

  const tokenUsage = usage?.tokenUsage
  const segments = useMemo(
    () => (tokenUsage ? tokenUsageSegments(tokenUsage).filter((s) => s.tokens > 0) : []),
    [tokenUsage]
  )
  const total = segments.reduce((sum, s) => sum + s.tokens, 0)
  const chartHeight = h === 'tall' ? 200 : 140

  if (loading && !usage) {
    return <div className="h-[120px] w-full animate-pulse rounded-lg bg-muted/40" />
  }
  if (total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('usage.breakdownUnavailable')}</p>
  }

  // S: 极简一瞥 — 全宽细堆叠条 (复用 bar 形态分段) + 总量 headline; 无图例/饼图/形态切换 (只读)。
  if (w === 'W1') {
    return (
      <div className="flex h-full flex-col gap-2">
        <div className="text-lg font-semibold tabular-nums text-foreground">{formatCompactNumber(total)}</div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/40">
          {segments.map((seg) => (
            <div
              key={seg.id}
              style={{ width: `${(seg.tokens / total) * 100}%`, backgroundColor: segmentColor(seg.id) }}
              title={`${t(SEGMENT_LABEL_KEYS[seg.id])}: ${formatCompactNumber(seg.tokens)}`}
            />
          ))}
        </div>
      </div>
    )
  }

  const legend = (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
      {segments.map((seg) => (
        <div key={seg.id} className="flex items-center justify-between gap-2">
          <dt className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: segmentColor(seg.id) }} />
            <span className="truncate">{t(SEGMENT_LABEL_KEYS[seg.id])}</span>
          </dt>
          <dd className="shrink-0 text-xs font-medium tabular-nums text-foreground">
            {formatCompactNumber(seg.tokens)}
            <span className="ml-1 text-muted-foreground">{Math.round((seg.tokens / total) * 100)}%</span>
          </dd>
        </div>
      ))}
    </dl>
  )

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex justify-end">
        <ChartTypeToggle options={formOptions} value={form} onChange={setForm} />
      </div>

      {form === 'bar' ? (
        <>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
            {segments.map((seg) => (
              <div
                key={seg.id}
                style={{ width: `${(seg.tokens / total) * 100}%`, backgroundColor: segmentColor(seg.id) }}
                title={`${t(SEGMENT_LABEL_KEYS[seg.id])}: ${formatCompactNumber(seg.tokens)}`}
              />
            ))}
          </div>
          {legend}
        </>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={segments}
                dataKey="tokens"
                nameKey="id"
                cx="50%"
                cy="50%"
                outerRadius="90%"
                innerRadius={form === 'donut' ? '58%' : 0}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              >
                {segments.map((seg) => (
                  <Cell key={seg.id} fill={segmentColor(seg.id)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 12
                }}
                formatter={(value: number, _name, item) => [
                  `${formatCompactNumber(value)} (${Math.round((value / total) * 100)}%)`,
                  t(SEGMENT_LABEL_KEYS[(item?.payload?.id as TokenUsageSegmentId) ?? 'unknown'])
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          {legend}
        </>
      )}
    </div>
  )
}
