import type { WidgetRenderProps } from '../widget-types'
import { useTranslation } from 'react-i18next'
import { useInsights } from '../insights-context'
import { formatCompactNumber } from '@/lib/utils'

// GH-138: 模型强度 widget — 各模型"每会话平均 token" (与 model 总量 breakdown 互补; 高=每会话越重)。
// 单色相横条 (长度 = avg / maxAvg)。取 Top-5。
export function ModelEfficiencyWidget({ h }: WidgetRenderProps): React.ReactElement {
  const { t } = useTranslation()
  const { insights, loading } = useInsights()
  const eff = insights?.modelEfficiency
  // 行数随高度 span 弹性 (与 recent-sessions/top-usage 同律); 无宽度档分支 (仅 W2)。
  const limit = Math.max(4, Math.round((h ?? 3) * 1.8))
  const models = (eff?.models ?? []).slice(0, limit)
  const maxAvg = eff?.maxAvg ?? 0

  if (loading && !insights) {
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
    <ul className="space-y-2.5">
      {models.map((m) => {
        const width = maxAvg > 0 ? Math.max(4, (m.avgTokens / maxAvg) * 100) : 0
        return (
          <li key={m.model} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-foreground">{m.model}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                <span className="font-medium text-foreground/80">{formatCompactNumber(m.avgTokens)}</span>{' '}
                {t('overview.dashboard.efficiency.perSession')}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted/50">
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${width}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
