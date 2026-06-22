import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { ChartArea, ChartColumn, ChartLine, Coins } from 'lucide-react'
import { useUsageSummary } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import { CHART_SERIES_FILL } from '@/lib/chart-colors'
import { formatCurrency } from '@/lib/utils'
import { projectPathForScope } from '@shared/scope'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { CostSourceBadge } from '@/components/shared/cost-source-badge'
import { SegmentedTabs } from '@/components/ui'
import type { WidgetRenderProps } from '../widget-types'
import { ChartTypeToggle, useChartForm, type ChartFormOption } from './chart-type-toggle'

const RANGE_OPTIONS = [30, 90, 180] as const

type TrendForm = 'bar' | 'line' | 'area'
const FORM_IDS = ['bar', 'line', 'area'] as const
const FORM_ICONS: Record<TrendForm, ChartFormOption<TrendForm>['icon']> = {
  bar: ChartColumn,
  line: ChartLine,
  area: ChartArea
}

// GH-138 R2-B/R2-A: 用量趋势 widget — 范围可配置 (30/90/180d) + 形态切换 (柱/折线/面积)。
// 同质时间序列恒用单色 CHART_SERIES_FILL, 不按索引循环分类色 (theme-palette 不变量)。
// 尺寸驱动密度: 高度随 S→Wide 递增, Y 轴标签仅 L/Wide 显示 (M 收紧), 拉开 M/L/Wide 区分。
export function UsageTrendWidget({ w, h, chartType, onChartTypeChange }: WidgetRenderProps): React.ReactElement {
  const { t } = useTranslation()
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const agentView = useAppStore((s) => s.agentView)
  const [rangeDays, setRangeDays] = useState<number>(30)
  const { usage, loading, error, reload } = useUsageSummary(rangeDays, agentView, projectPath)
  const [form, setForm] = useChartForm(FORM_IDS, 'bar', chartType, onChartTypeChange)
  const formOptions: ChartFormOption<TrendForm>[] = FORM_IDS.map((id) => ({
    id,
    icon: FORM_ICONS[id],
    label: t(`overview.dashboard.chartForm.${id}`)
  }))

  const dailyCosts = usage?.dailyCosts ?? []
  const hasKnownCost = usage != null && usage.costSource !== 'unknown'
  const chartHeight = h === 'tall' ? 208 : 150
  // 高档 (tall) 或满宽 (W4) 才显示 Y 轴刻度 + 网格线; 矮档收紧只留柱/线本体, 拉开密度差。
  const showAxesDetail = h === 'tall' || w === 'W4'

  const axes = (
    <>
      {showAxesDetail && <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />}
      <XAxis
        dataKey="date"
        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
        tickLine={false}
        axisLine={false}
        minTickGap={24}
        interval="preserveStartEnd"
        tickFormatter={(v: string) => {
          const d = new Date(v)
          return `${d.getMonth() + 1}/${d.getDate()}`
        }}
      />
      {showAxesDetail && (
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => `$${v}`}
        />
      )}
      <Tooltip
        contentStyle={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          fontSize: 12
        }}
        labelFormatter={(v: string) => new Date(v).toLocaleDateString()}
        formatter={(v: number) => [formatCurrency(v), t('sessions.cost')]}
      />
    </>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <SegmentedTabs
          ariaLabel={t('overview.dashboard.rangeLabel')}
          items={RANGE_OPTIONS.map((option) => ({ key: String(option), label: `${option}d` }))}
          selectedKey={String(rangeDays)}
          onSelectionChange={(k) => setRangeDays(Number(k))}
        />
        <div className="flex items-center gap-2">
          <ChartTypeToggle options={formOptions} value={form} onChange={setForm} />
          <CostSourceBadge source={usage?.costSource ?? 'unknown'} />
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {hasKnownCost ? formatCurrency(usage.totalCost) : '—'}
          </span>
        </div>
      </div>
      {loading && dailyCosts.length === 0 ? (
        <div
          aria-label={t('overview.loadingUsage')}
          className="animate-pulse rounded-lg bg-muted/40"
          style={{ height: chartHeight }}
        />
      ) : error && dailyCosts.length === 0 ? (
        <ErrorState title={t('usage.loadErrorTitle')} onRetry={reload} />
      ) : dailyCosts.length === 0 ? (
        <EmptyState
          icon={Coins}
          title={t('overview.empty.usageTitle')}
          description={t('overview.empty.usageDescription')}
          className="border-0 py-8"
        />
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          {form === 'line' ? (
            <LineChart data={dailyCosts} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              {axes}
              <Line
                type="monotone"
                dataKey="cost"
                stroke={CHART_SERIES_FILL}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          ) : form === 'area' ? (
            <AreaChart data={dailyCosts} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="usage-trend-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_SERIES_FILL} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={CHART_SERIES_FILL} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {axes}
              <Area
                type="monotone"
                dataKey="cost"
                stroke={CHART_SERIES_FILL}
                strokeWidth={2}
                fill="url(#usage-trend-area)"
              />
            </AreaChart>
          ) : (
            <BarChart data={dailyCosts} barCategoryGap="24%">
              {axes}
              <Bar dataKey="cost" fill={CHART_SERIES_FILL} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  )
}
