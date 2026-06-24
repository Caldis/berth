import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useInsights } from '../insights-context'
import { CHART_CATEGORICAL } from '@/lib/chart-colors'
import { formatCompactNumber } from '@/lib/utils'
import { MODEL_TREND_OTHERS } from '@shared/types/insights'
import type { WidgetRenderProps } from '../widget-types'

// GH-138: 模型趋势 widget — tokens 分模型随时间堆叠面积 (仪表盘首个"随时间堆叠"形态, 看模型构成迁移)。
// 数据来自 insights.modelTrend (buildModelTrend 已折叠 Top-5 + others), 随 agentView/scope 过滤联动。
// 堆叠序 = models 数组序 (最大量级在底, others 在顶); Top-N 用分类色, others 用中性 muted (去强调)。
const OTHERS_COLOR = 'hsl(var(--muted-foreground))'

function colorFor(model: string, index: number): string {
  return model === MODEL_TREND_OTHERS ? OTHERS_COLOR : CHART_CATEGORICAL[index % CHART_CATEGORICAL.length]
}

export function ModelTrendWidget({ w }: WidgetRenderProps): React.ReactElement {
  const { t } = useTranslation()
  const { insights, loading } = useInsights()
  const trend = insights?.modelTrend

  const labelFor = (model: string): string =>
    model === MODEL_TREND_OTHERS ? t('overview.dashboard.modelTrend.others') : model

  const data = useMemo(
    () => (trend?.points ?? []).map((p) => ({ date: p.date, ...p.tokens })),
    [trend?.points]
  )
  const total = useMemo(() => (trend?.points ?? []).reduce((sum, p) => sum + p.total, 0), [trend?.points])
  const models = trend?.models ?? []

  const showHeader = w === 'W4'

  if (loading && !insights) {
    return <div className="h-[124px] w-full animate-pulse rounded-lg bg-muted/40" />
  }
  if (models.length === 0 || total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('overview.dashboard.heatmap.empty')}</p>
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {showHeader && (
        <div className="min-w-0">
          <div className="text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
            {formatCompactNumber(total)}
          </div>
          <div className="mt-1.5 truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {t('overview.dashboard.modelTrend.subtitle')}
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
            formatter={(value: number, name: string) => [formatCompactNumber(value), labelFor(name)]}
          />
          {models.map((model, i) => (
            <Area
              key={model}
              type="monotone"
              dataKey={model}
              name={model}
              stackId="mt"
              stroke={colorFor(model, i)}
              strokeWidth={1}
              fill={colorFor(model, i)}
              fillOpacity={model === MODEL_TREND_OTHERS ? 0.32 : 0.68}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer></div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {models.map((model, i) => (
          <li key={model} className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: colorFor(model, i) }} />
            <span className="truncate">{labelFor(model)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
