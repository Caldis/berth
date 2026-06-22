import { useTranslation } from 'react-i18next'
import { useInsights } from '../insights-context'
import { formatCompactNumber } from '@/lib/utils'
import type { WidgetRenderProps } from '../widget-types'

const BUCKET_LABEL_KEYS: Record<string, string> = {
  lt5m: 'overview.dashboard.duration.lt5m',
  lt15m: 'overview.dashboard.duration.lt15m',
  lt1h: 'overview.dashboard.duration.lt1h',
  lt4h: 'overview.dashboard.duration.lt4h',
  gte4h: 'overview.dashboard.duration.gte4h'
}

// GH-138: 会话时长分布 widget — <5m / 5-15m / 15-60m / 1-4h / 4h+ 分桶横条 ("快修 vs 长跑")。
// 单色相 primary (同质量级, 长度即占比); L 增显 占比% + 主区间洞察头, 拉开 M/L 区分。
export function SessionDurationWidget({ h }: WidgetRenderProps): React.ReactElement {
  const { t } = useTranslation()
  const { insights, loading } = useInsights()
  const hist = insights?.durationHistogram

  if (loading && !insights) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-3 w-full animate-pulse rounded bg-muted/60" />
        ))}
      </div>
    )
  }
  if (!hist || hist.total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('overview.dashboard.heatmap.empty')}</p>
  }

  const isL = h === 'tall'
  const dominant = hist.buckets.reduce((best, b) => (b.count > best.count ? b : best), hist.buckets[0])

  return (
    <div className="flex h-full flex-col gap-3">
      {isL && dominant.count > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('overview.dashboard.duration.summary', {
            count: hist.total,
            bucket: t(BUCKET_LABEL_KEYS[dominant.id])
          })}
        </p>
      )}
      <ul className="space-y-2.5">
        {hist.buckets.map((b) => {
          const pct = hist.total > 0 ? Math.round((b.count / hist.total) * 100) : 0
          const width = hist.maxCount > 0 ? (b.count > 0 ? Math.max(4, (b.count / hist.maxCount) * 100) : 0) : 0
          return (
            <li key={b.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-foreground">{t(BUCKET_LABEL_KEYS[b.id])}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatCompactNumber(b.count)}
                  {isL && <span className="ml-1">{pct}%</span>}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${width}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
