import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useUsageSummary } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import { formatCurrency } from '@/lib/utils'
import { costTrend } from '@/lib/activity-trend'
import { projectPathForScope } from '@shared/scope'
import type { WidgetRenderProps } from '../widget-types'
import { Sparkline } from './sparkline'

// GH-138 R2-C: 花费 widget — 唯一的"钱"维度。usage.totalCost/dailyCosts/actualCost/byModel 现成数据。
// 克制美学: 大字号货币 + 安静 uppercase 标签 + 单色 sparkline + 周环比 ▲▼% (中性色, 涨跌不褒贬)。
// 尺寸即信息: S=总花费+趋势一瞥 · M=+实际/估算拆分 · L=+分模型成本榜 (钱花在哪个模型)。
export function SpendWidget({ h }: WidgetRenderProps): React.ReactElement {
  const { t } = useTranslation()
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const agentView = useAppStore((s) => s.agentView)
  const { usage, loading } = useUsageSummary(30, agentView, projectPath)

  const trend = useMemo(() => costTrend(usage?.dailyCosts ?? []), [usage?.dailyCosts])
  const models = useMemo(
    () => [...(usage?.byModel ?? [])].filter((m) => m.cost > 0).sort((a, b) => b.cost - a.cost).slice(0, 5),
    [usage?.byModel]
  )
  const maxModelCost = models.length > 0 ? models[0].cost : 0

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

      {h === 'tall' && models.length > 0 && (
        <ul className="space-y-2 border-t border-border/50 pt-3">
          {models.map((entry) => (
            <li key={entry.model} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-foreground">{entry.model}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatCurrency(entry.cost)}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${maxModelCost > 0 ? Math.max(4, (entry.cost / maxModelCost) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
