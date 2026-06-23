import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { BarChartHorizontal, ChartPie, Donut } from 'lucide-react'
import { useUsageSummary } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import { CHART_CATEGORICAL } from '@/lib/chart-colors'
import { formatCompactNumber } from '@/lib/utils'
import { projectPathForScope } from '@shared/scope'
import type { WidgetRenderProps } from '../widget-types'
import { ChartTypeToggle, useChartForm, type ChartFormOption } from './chart-type-toggle'

type ModelForm = 'bar' | 'pie' | 'donut'
const FORM_IDS = ['bar', 'pie', 'donut'] as const
const FORM_ICONS: Record<ModelForm, ChartFormOption<ModelForm>['icon']> = {
  bar: BarChartHorizontal,
  pie: ChartPie,
  donut: Donut
}

function modelColor(index: number): string {
  return CHART_CATEGORICAL[index % CHART_CATEGORICAL.length]
}

// GH-138 R2-B/R2-A: 模型分布 widget — byModel token 占比, 支持 排行条 / 饼图 / 空心饼 形态切换。
// 排行条恒单色 (长度编码量级, 编辑感克制); 饼/环按模型分类色 (多分类 breakdown 口径) + 图例。
// 取 Top-5。形态经 layout 持久化。
export function ModelDistributionWidget({ w, h, chartType, onChartTypeChange }: WidgetRenderProps): React.ReactElement {
  const { t } = useTranslation()
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const agentView = useAppStore((s) => s.agentView)
  const { usage, loading } = useUsageSummary(30, agentView, projectPath)
  const [form, setForm] = useChartForm(FORM_IDS, 'bar', chartType, onChartTypeChange)
  const formOptions: ChartFormOption<ModelForm>[] = FORM_IDS.map((id) => ({
    id,
    icon: FORM_ICONS[id],
    label: t(`overview.dashboard.chartForm.${id}`)
  }))

  const limit = 5
  const models = useMemo(
    () => [...(usage?.byModel ?? [])].sort((a, b) => b.tokens - a.tokens).slice(0, limit),
    [usage?.byModel, limit]
  )
  const max = models.length > 0 ? models[0].tokens : 0
  const chartHeight = 150

  if (loading && !usage) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-3 w-full animate-pulse rounded bg-muted/60" />
        ))}
      </div>
    )
  }
  if (models.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('overview.dashboard.heatmap.empty')}</p>
  }

  // S: 极简一瞥 — 仅 Top-3 排行条 (复用单色 mini bar); 无图表/图例/形态切换 (只读)。
  if (w === 'W1') {
    return (
      <ul className="flex h-full flex-col justify-center gap-2">
        {models.slice(0, Math.max(4, Math.round((h ?? 3) * 2))).map((entry) => (
          <li key={entry.model} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-foreground">{entry.model}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{entry.percentage}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${max > 0 ? Math.max(4, (entry.tokens / max) * 100) : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    )
  }

  const toggle = (
    <div className="flex justify-end">
      <ChartTypeToggle options={formOptions} value={form} onChange={setForm} />
    </div>
  )

  if (form === 'bar') {
    return (
      <div className="flex h-full flex-col gap-3">
        {toggle}
        <ul className="space-y-2">
          {models.map((entry) => (
            <li key={entry.model} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-foreground">{entry.model}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatCompactNumber(entry.tokens)}
                  <span className="ml-1">{entry.percentage}%</span>
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${max > 0 ? Math.max(4, (entry.tokens / max) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {toggle}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={models}
            dataKey="tokens"
            nameKey="model"
            cx="50%"
            cy="50%"
            outerRadius="90%"
            innerRadius={form === 'donut' ? '58%' : 0}
            stroke="hsl(var(--card))"
            strokeWidth={2}
          >
            {models.map((entry, i) => (
              <Cell key={entry.model} fill={modelColor(i)} />
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
              `${formatCompactNumber(value)} (${(item?.payload?.percentage as number) ?? 0}%)`,
              (item?.payload?.model as string) ?? ''
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {models.map((entry, i) => (
          <div key={entry.model} className="flex items-center justify-between gap-2">
            <dt className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: modelColor(i) }} />
              <span className="truncate">{entry.model}</span>
            </dt>
            <dd className="shrink-0 text-xs font-medium tabular-nums text-foreground">{entry.percentage}%</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// MARKERTEST
