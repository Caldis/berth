import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useInsights } from '../insights-context'
import { cn } from '@/lib/utils'
import type { WidgetRenderProps } from '../widget-types'

// GH-138 R2-E: 活动节律 punch-card — 星期×小时 会话分布 ("何时工作")。
// 单色相 primary ramp (与年度热力图同视觉语言); 行 0=周日 (与 activity-heatmap 同约定),
// 仅 Mon/Wed/Fri 显星期标签, 顶部每 6h 显小时刻度。数据按用户本地时区聚合 (engine 注入偏移)。

const LEVEL_CLASS: Record<number, string> = {
  0: 'bg-muted/50',
  1: 'bg-primary/25',
  2: 'bg-primary/45',
  3: 'bg-primary/70',
  4: 'bg-primary'
}

function intensity(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0
  const ratio = count / max
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}

// row 0=周日; 2023-01-01(UTC) 为周日, +row 取该星期。仅 Mon/Wed/Fri 显标签 (与年度热力图一致)。
function weekdayLabel(row: number, locale: string, full = false): string {
  return new Date(Date.UTC(2023, 0, 1 + row)).toLocaleDateString(locale, {
    weekday: full ? 'long' : 'short',
    timeZone: 'UTC'
  })
}

export function ActivityRhythmWidget({ size }: WidgetRenderProps): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { insights, loading } = useInsights()
  const rhythm = insights?.rhythm

  const peakLabel = useMemo(() => {
    if (!rhythm?.peak) return null
    return {
      weekday: weekdayLabel(rhythm.peak.weekday, i18n.language, true),
      time: `${String(rhythm.peak.hour).padStart(2, '0')}:00`
    }
  }, [rhythm?.peak, i18n.language])

  if (loading && !insights) {
    return <div className="h-[140px] w-full animate-pulse rounded-lg bg-muted/40" />
  }
  if (!rhythm || rhythm.totalSessions === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center text-sm text-muted-foreground">
        {t('overview.dashboard.rhythm.empty')}
      </div>
    )
  }

  const hourTicks = size === 'XL' ? [0, 3, 6, 9, 12, 15, 18, 21] : [0, 6, 12, 18]

  return (
    <div className="flex flex-col gap-2.5">
      {peakLabel && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {t('overview.dashboard.rhythm.peakInsight', { weekday: peakLabel.weekday, time: peakLabel.time })}
          </span>
        </p>
      )}

      <div className="flex flex-col gap-1">
        {/* 顶部小时刻度: 24 列 flex-1, 仅 tick 小时显数字 */}
        <div className="flex gap-[3px]">
          <div className="w-8 shrink-0" />
          <div className="flex flex-1 gap-[3px]">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="min-w-0 flex-1 text-[9px] leading-none text-muted-foreground">
                {hourTicks.includes(h) ? <span className="whitespace-nowrap">{h}</span> : null}
              </div>
            ))}
          </div>
        </div>

        {/* 7 行 (星期) × 24 列 (小时) */}
        {[0, 1, 2, 3, 4, 5, 6].map((weekday) => (
          <div key={weekday} className="flex items-center gap-[3px]">
            <div className="w-8 shrink-0 pr-1 text-right text-[9px] leading-none text-muted-foreground">
              {weekday === 1 || weekday === 3 || weekday === 5 ? weekdayLabel(weekday, i18n.language) : ''}
            </div>
            <div className="flex flex-1 gap-[3px]">
              {rhythm.grid[weekday].map((count, hour) => {
                const time = `${String(hour).padStart(2, '0')}:00`
                const title =
                  count > 0
                    ? t('overview.dashboard.rhythm.cellTooltip', {
                        count,
                        weekday: weekdayLabel(weekday, i18n.language),
                        time
                      })
                    : `${weekdayLabel(weekday, i18n.language)} ${time}`
                return (
                  <div
                    key={hour}
                    title={title}
                    className={cn('h-[14px] w-full rounded-[2px]', LEVEL_CLASS[intensity(count, rhythm.maxSessions)])}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
        {t('overview.dashboard.heatmap.less')}
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={cn('h-[10px] w-[10px] rounded-[2px]', LEVEL_CLASS[l])} />
        ))}
        {t('overview.dashboard.heatmap.more')}
      </div>
    </div>
  )
}
