import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { HeatmapDay } from '@shared/types/insights'
import { useInsights } from '../insights-context'
import { cn } from '@/lib/utils'

// GH-138: GitHub 风格年度活动热力图 (单色相 berth 强调色 ramp, 非 GitHub 绿)。
// 周为列、星期为行; 空档为极淡中性 (非灰块)。月份标签随列对齐。

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

function buildWeeks(days: HeatmapDay[]): (HeatmapDay | null)[][] {
  if (days.length === 0) return []
  const leading = new Date(`${days[0].date}T00:00:00Z`).getUTCDay()
  const cells: (HeatmapDay | null)[] = [...Array<HeatmapDay | null>(leading).fill(null), ...days]
  const weeks: (HeatmapDay | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7)
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

function monthLabels(weeks: (HeatmapDay | null)[][], locale: string): (string | null)[] {
  const labels: (string | null)[] = []
  let lastMonth = -1
  for (const week of weeks) {
    const firstReal = week.find((cell): cell is HeatmapDay => cell != null)
    if (!firstReal) {
      labels.push(null)
      continue
    }
    const date = new Date(`${firstReal.date}T00:00:00Z`)
    const month = date.getUTCMonth()
    if (month !== lastMonth) {
      labels.push(date.toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' }))
      lastMonth = month
    } else {
      labels.push(null)
    }
  }
  return labels
}

// 仅 Mon/Wed/Fri 显标签 (GitHub 风格); row 0=周日。2023-01-01(UTC) 为周日, +row 取星期。
function weekdayLabel(row: number, locale: string): string {
  if (row !== 1 && row !== 3 && row !== 5) return ''
  return new Date(Date.UTC(2023, 0, 1 + row)).toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' })
}

export function ActivityHeatmapWidget(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { insights, loading } = useInsights()
  const heatmap = insights?.heatmap

  const weeks = useMemo(() => buildWeeks(heatmap?.days ?? []), [heatmap?.days])
  const labels = useMemo(() => monthLabels(weeks, i18n.language), [weeks, i18n.language])
  const totalSessions = useMemo(() => (heatmap?.days ?? []).reduce((sum, d) => sum + d.sessions, 0), [heatmap?.days])

  if (loading && !insights) {
    return <div className="h-[120px] w-full animate-pulse rounded-lg bg-muted/40" />
  }
  if (!heatmap || totalSessions === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
        {t('overview.dashboard.heatmap.empty')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-[3px]">
            <div className="w-7 shrink-0" />
            {labels.map((label, i) => (
              <div key={i} className="w-[11px] text-[10px] leading-none text-muted-foreground">
                {label ? <span className="relative -left-px whitespace-nowrap">{label}</span> : null}
              </div>
            ))}
          </div>
          <div className="flex gap-[3px]">
            <div className="flex w-7 shrink-0 flex-col gap-[3px] pr-1 text-[9px] leading-none text-muted-foreground">
              {[0, 1, 2, 3, 4, 5, 6].map((row) => (
                <div key={row} className="flex h-[11px] items-center justify-end">
                  {weekdayLabel(row, i18n.language)}
                </div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((cell, di) => {
                  if (!cell) return <div key={di} className="h-[11px] w-[11px]" />
                  const localeDate = new Date(`${cell.date}T00:00:00Z`).toLocaleDateString(i18n.language, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'UTC'
                  })
                  const title =
                    cell.sessions > 0
                      ? t('overview.dashboard.heatmap.dayTooltip', { count: cell.sessions, date: localeDate })
                      : t('overview.dashboard.heatmap.noneTooltip', { date: localeDate })
                  return (
                    <div
                      key={di}
                      title={title}
                      className={cn('h-[11px] w-[11px] rounded-[2px]', LEVEL_CLASS[intensity(cell.sessions, heatmap.maxSessions)])}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{t('overview.dashboard.heatmap.summary', { count: totalSessions })}</span>
        <span className="flex items-center gap-1">
          {t('overview.dashboard.heatmap.less')}
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={cn('h-[10px] w-[10px] rounded-[2px]', LEVEL_CLASS[l])} />
          ))}
          {t('overview.dashboard.heatmap.more')}
        </span>
      </div>
    </div>
  )
}
