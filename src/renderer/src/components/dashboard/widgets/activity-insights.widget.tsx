import { useTranslation } from 'react-i18next'
import { useInsights } from '../insights-context'
import { cn, formatCompactNumber } from '@/lib/utils'
import { agentDisplayName } from '@/lib/agent-meta'

const AGENT_BAR_CLASS = ['bg-primary/80', 'bg-primary/45', 'bg-primary/25']

// GH-138: 活动洞察 widget (Codex 风格) — label/value 行 + 底部 agent 占比条 (增实质/填满高度)。
export function ActivityInsightsWidget(): React.ReactElement {
  const { t } = useTranslation()
  const { insights, loading } = useInsights()
  const data = insights?.insights

  if (loading && !insights) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
            <div className="h-3.5 w-12 animate-pulse rounded bg-muted" />
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

  const split = data?.agentSplit ?? []
  const splitTotal = split.reduce((sum, a) => sum + a.count, 0)

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <dl className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0">
            <dt className="min-w-0 truncate text-sm text-muted-foreground">{row.label}</dt>
            <dd className="max-w-[55%] shrink-0 truncate text-base font-semibold tabular-nums text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>

      {splitTotal > 0 && (
        <div className="space-y-1.5">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-muted/40">
            {split.map((agent, i) => (
              <div
                key={agent.agentId}
                className={cn(AGENT_BAR_CLASS[i] ?? 'bg-primary/15')}
                style={{ width: `${(agent.count / splitTotal) * 100}%` }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {split.map((agent, i) => (
              <span key={agent.agentId} className="inline-flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-[2px]', AGENT_BAR_CLASS[i] ?? 'bg-primary/15')} />
                {agentDisplayName(agent.agentId)}
                <span className="tabular-nums text-foreground/70">{agent.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
