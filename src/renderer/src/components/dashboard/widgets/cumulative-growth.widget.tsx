import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useInsights } from '../insights-context'
import { SegmentedTabs } from '@/components/ui'
import { CHART_SERIES_FILL } from '@/lib/chart-colors'
import { formatCompactNumber } from '@/lib/utils'
import { cumulativeSeries } from '@/lib/activity-trend'
import type { WidgetRenderProps } from '../widget-types'

type Metric = 'tokens' | 'sessions'
const METRICS: Metric[] = ['tokens', 'sessions']

// GH-138: 累计增长曲线 widget — token/会话总量随时间单调累积 ("累计 journey", 现有 widget 缺的角度)。
// 复用 insights.heatmap.days (零引擎改动), 同质量级单色面积; 随 agentView/scope 过滤联动。
export function CumulativeGrowthWidget({ h }: WidgetRenderProps): React.ReactElement {
  const { t } = useTranslation()
  const { insights, loading } = useInsights()
  const [metric, setMetric] = useState<Metric>('tokens')
  const series = useMemo(
    () => cumulativeSeries(insights?.heatmap?.days ?? [], metric),
    [insights?.heatmap?.days, metric]
  )
  const total = series.length > 0 ? series[series.length - 1].value : 0
  const chartHeight = h === 'tall' ? 184 : 120

  if (loading && !insights) {
    return <div className="h-[120px] w-full animate-pulse rounded-lg bg-muted/40" />
  }
  if (series.length === 0 || total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('overview.dashboard.heatmap.empty')}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
            {formatCompactNumber(total)}
          </div>
          <div className="mt-1.5 truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {t(`overview.dashboard.cumulative.${metric}`)}
          </div>
        </div>
        <SegmentedTabs
          ariaLabel={t('overview.dashboard.cumulative.metricLabel')}
          items={METRICS.map((m) => ({ key: m, label: t(`overview.dashboard.cumulative.${m}Short`) }))}
          selectedKey={metric}
          onSelectionChange={setMetric}
        />
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <AreaChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="cumulative-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_SERIES_FILL} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART_SERIES_FILL} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
            interval="preserveStartEnd"
            tickFormatter={(v: string) => {
              const d = new Date(v)
              return `${d.getMonth() + 1}/${d.getDate()}`
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: 12
            }}
            labelFormatter={(v: string) => new Date(v).toLocaleDateString()}
            formatter={(v: number) => [formatCompactNumber(v), t(`overview.dashboard.cumulative.${metric}`)]}
          />
          <Area type="monotone" dataKey="value" stroke={CHART_SERIES_FILL} strokeWidth={2} fill="url(#cumulative-area)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
