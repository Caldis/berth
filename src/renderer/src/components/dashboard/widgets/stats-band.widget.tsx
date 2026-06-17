import { useTranslation } from 'react-i18next'
import { useInsights } from '../insights-context'
import { formatCompactNumber, formatOptionalDuration } from '@/lib/utils'

// GH-138: Codex 风格指标带 (克制编辑感) — 大字号等宽数字 + 安静 uppercase 标签, 无卡片框。
export function StatsBandWidget(): React.ReactElement {
  const { t } = useTranslation()
  const { insights, loading } = useInsights()
  const peak = insights?.peak
  const streak = insights?.streak

  if (loading && !insights) {
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-7 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>
    )
  }

  const metrics = [
    { label: t('overview.dashboard.metrics.cumulativeTokens'), value: peak ? formatCompactNumber(peak.cumulativeTokens) : '—' },
    { label: t('overview.dashboard.metrics.peakDailyTokens'), value: peak ? formatCompactNumber(peak.peakDailyTokens) : '—' },
    {
      label: t('overview.dashboard.metrics.longestSession'),
      value: peak?.maxSessionDurationSeconds ? formatOptionalDuration(peak.maxSessionDurationSeconds) : '—'
    },
    { label: t('overview.dashboard.metrics.currentStreak'), value: streak ? t('overview.dashboard.metrics.dayUnit', { count: streak.current }) : '—' },
    { label: t('overview.dashboard.metrics.longestStreak'), value: streak ? t('overview.dashboard.metrics.dayUnit', { count: streak.longest }) : '—' }
  ]

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
      {metrics.map((m) => (
        <div key={m.label} className="min-w-0">
          <div className="truncate text-[26px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
            {m.value}
          </div>
          <div className="mt-2 truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{m.label}</div>
        </div>
      ))}
    </div>
  )
}
