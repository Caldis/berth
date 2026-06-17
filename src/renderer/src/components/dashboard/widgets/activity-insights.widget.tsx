import { useTranslation } from 'react-i18next'
import { useInsights } from '../insights-context'
import { formatCompactNumber } from '@/lib/utils'

// GH-138: 活动洞察 widget (Codex 风格) — label/value 行列表, 发丝线分隔, 只展 berth 可支撑字段。
export function ActivityInsightsWidget(): React.ReactElement {
  const { t } = useTranslation()
  const { insights, loading } = useInsights()
  const data = insights?.insights

  if (loading && !insights) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
            <div className="h-3 w-10 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  const rows = [
    { label: t('overview.dashboard.insights.skillsExplored'), value: data ? String(data.skillsExplored) : '—' },
    { label: t('overview.dashboard.insights.skillInvocations'), value: data ? formatCompactNumber(data.totalSkillInvocations) : '—' },
    { label: t('overview.dashboard.insights.totalSessions'), value: data ? formatCompactNumber(data.totalSessions) : '—' },
    { label: t('overview.dashboard.insights.pluginsInstalled'), value: data ? String(data.pluginsInstalled) : '—' },
    { label: t('overview.dashboard.insights.topModel'), value: data?.topModel ?? '—' }
  ]

  return (
    <dl className="divide-y divide-border/60">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 py-2">
          <dt className="min-w-0 truncate text-sm text-muted-foreground">{row.label}</dt>
          <dd className="shrink-0 max-w-[55%] truncate text-sm font-medium tabular-nums text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
