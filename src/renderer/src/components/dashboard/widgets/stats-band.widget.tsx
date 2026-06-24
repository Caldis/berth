import { useTranslation } from 'react-i18next'
import { useInsights } from '../insights-context'
import { formatCompactNumber, formatOptionalDuration } from '@/lib/utils'
import { tokenTrend } from '@/lib/activity-trend'
import { Sparkline } from './sparkline'

// GH-138: Codex 风格指标带 (克制编辑感) — 大字号等宽数字 + 安静 uppercase 标签, 无卡片框。
// 头部「累计 token」cell 注入近况 (14 天 sparkline + 周环比 ▲▼%), 让指标带"活"起来;
// 数据复用 insights.heatmap.days, 随 agentView/scope 过滤联动 (不新增引擎聚合)。
export function StatsBandWidget(): React.ReactElement {
  const { t } = useTranslation()
  const { insights, loading } = useInsights()
  const peak = insights?.peak
  const streak = insights?.streak
  const trend = tokenTrend(insights?.heatmap?.days ?? [])

  if (loading && !insights) {
    return (
      <div className="h-full grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-7 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>
    )
  }

  const metrics: { label: string; value: string; trend?: boolean }[] = [
    { label: t('overview.dashboard.metrics.cumulativeTokens'), value: peak ? formatCompactNumber(peak.cumulativeTokens) : '—', trend: true },
    { label: t('overview.dashboard.metrics.peakDailyTokens'), value: peak ? formatCompactNumber(peak.peakDailyTokens) : '—' },
    {
      label: t('overview.dashboard.metrics.longestSession'),
      value: peak?.maxSessionDurationSeconds ? formatOptionalDuration(peak.maxSessionDurationSeconds) : '—'
    },
    { label: t('overview.dashboard.metrics.currentStreak'), value: streak ? t('overview.dashboard.metrics.dayUnit', { count: streak.current }) : '—' },
    { label: t('overview.dashboard.metrics.longestStreak'), value: streak ? t('overview.dashboard.metrics.dayUnit', { count: streak.longest }) : '—' }
  ]

  return (
    <div className="grid h-full content-center items-start gap-x-6 gap-y-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-0">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="min-w-0 lg:border-l lg:border-border/50 lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
        >
          <div className="truncate text-[26px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
            {m.value}
          </div>
          <div className="mt-2 truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{m.label}</div>
          {m.trend && (trend.series.length > 1 || trend.deltaPct != null) && (
            <div className="mt-2 flex items-center gap-2" title={t('overview.dashboard.metrics.vsLastWeek')}>
              <Sparkline data={trend.series} />
              {trend.deltaPct != null && (
                <span className="shrink-0 text-[11px] font-medium tabular-nums text-foreground">
                  {trend.deltaPct >= 0 ? '▲' : '▼'} {Math.abs(Math.round(trend.deltaPct))}%
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
