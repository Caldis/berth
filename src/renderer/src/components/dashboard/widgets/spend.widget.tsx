import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useUsageSummary } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import { formatCurrency } from '@/lib/utils'
import { costTrend } from '@/lib/activity-trend'
import { projectPathForScope } from '@shared/scope'
import { Sparkline } from './sparkline'

// GH-138 R2-C: 花费 widget — 唯一的"钱"维度。usage.totalCost/dailyCosts/actualCost/byModel 现成数据。
// 克制美学: 大字号货币 + 安静 uppercase 标签 + 单色 sparkline + 周环比 ▲▼% (中性色, 涨跌不褒贬)。
// 总花费 + 趋势一瞥 + 实际/估算拆分。
export function SpendWidget(): React.ReactElement {
  const { t } = useTranslation()
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const agentView = useAppStore((s) => s.agentView)
  const { usage, loading } = useUsageSummary(30, agentView, projectPath)

  const trend = useMemo(() => costTrend(usage?.dailyCosts ?? []), [usage?.dailyCosts])

  if (loading && !usage) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-28 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted/60" />
      </div>
    )
  }
  if (!usage || (usage.totalCost === 0 && usage.dailyCosts.length === 0)) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('overview.dashboard.heatmap.empty')}</p>
  }

  const header = (
    <div className="min-w-0">
      <div className="flex items-end gap-3">
        <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
          {formatCurrency(usage.totalCost)}
        </span>
        {trend.deltaPct != null && (
          <span className="mb-0.5 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            {trend.deltaPct >= 0 ? '▲' : '▼'} {Math.abs(Math.round(trend.deltaPct))}%
          </span>
        )}
      </div>
      <div className="mt-2 truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {t('overview.dashboard.spend.subtitle')}
      </div>
    </div>
  )

  return (
    <div className="flex h-full flex-col gap-3">
      {header}
      {trend.series.length > 1 && (
        <div title={t('overview.dashboard.metrics.vsLastWeek')}>
          <Sparkline data={trend.series} />
        </div>
      )}

      {(usage.actualCost > 0 || usage.estimatedCost > 0) && (
        <dl className="flex gap-6 text-xs">
          <div className="min-w-0">
            <dt className="text-muted-foreground">{t('overview.dashboard.spend.actual')}</dt>
            <dd className="mt-0.5 font-medium tabular-nums text-foreground">{formatCurrency(usage.actualCost)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">{t('overview.dashboard.spend.estimated')}</dt>
            <dd className="mt-0.5 font-medium tabular-nums text-foreground">{formatCurrency(usage.estimatedCost)}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

// MARKERTEST
