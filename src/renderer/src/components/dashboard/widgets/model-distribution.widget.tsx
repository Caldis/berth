import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useUsageSummary } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import { formatCompactNumber } from '@/lib/utils'
import { projectPathForScope } from '@shared/scope'

// GH-138: 模型分布 widget — byModel Top-N token 占比 (单色相条, 与排行同口径)。
export function ModelDistributionWidget(): React.ReactElement {
  const { t } = useTranslation()
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const { usage, loading } = useUsageSummary(30, undefined, projectPath)

  const models = useMemo(
    () => [...(usage?.byModel ?? [])].sort((a, b) => b.tokens - a.tokens).slice(0, 6),
    [usage?.byModel]
  )
  const max = models.length > 0 ? models[0].tokens : 0

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

  return (
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
  )
}
