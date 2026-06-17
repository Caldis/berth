import { useTranslation } from 'react-i18next'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Coins } from 'lucide-react'
import { useUsageSummary } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import { CHART_SERIES_FILL } from '@/lib/chart-colors'
import { formatCurrency } from '@/lib/utils'
import { projectPathForScope } from '@shared/scope'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { CostSourceBadge } from '@/components/shared/cost-source-badge'

// GH-138: 用量趋势 widget (移植自旧 Overview UsageSnapshotPanel, 去卡片框)。
// 同质时间序列用单色 CHART_SERIES_FILL, 不按索引循环分类色 (theme-palette 不变量)。
export function UsageTrendWidget(): React.ReactElement {
  const { t } = useTranslation()
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const { usage, loading, error, reload } = useUsageSummary(7, undefined, projectPath)

  const dailyCosts = usage?.dailyCosts ?? []
  const hasKnownCost = usage != null && usage.costSource !== 'unknown'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <CostSourceBadge source={usage?.costSource ?? 'unknown'} />
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {hasKnownCost ? formatCurrency(usage.totalCost) : '—'}
        </span>
      </div>
      {loading && dailyCosts.length === 0 ? (
        <div aria-label={t('overview.loadingUsage')} className="h-[160px] animate-pulse rounded-lg bg-muted/40" />
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
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={dailyCosts} barCategoryGap="24%">
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: string) => {
                const d = new Date(v)
                return `${d.getMonth() + 1}/${d.getDate()}`
              }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v: number) => `$${v}`}
            />
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
            <Bar dataKey="cost" fill={CHART_SERIES_FILL} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
