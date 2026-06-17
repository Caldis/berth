import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInsights } from '../insights-context'
import { cn } from '@/lib/utils'
import type { WidgetRenderProps } from '../widget-types'

type UsageKind = 'skill' | 'mcp'

// GH-138: 最常用排行 widget (skill/mcp 切换) — Top-N 名称 + 次数 + 单色相占比细条 (呼应热力图)。
// 内容驱动 M/L 区分: L 显示更长榜单 (自然更高)。
export function TopUsageWidget({ size }: WidgetRenderProps): React.ReactElement {
  const { t } = useTranslation()
  const { insights, loading } = useInsights()
  const [kind, setKind] = useState<UsageKind>('skill')

  const all = (kind === 'skill' ? insights?.topSkills : insights?.topMcpServers) ?? []
  const entries = all.slice(0, size === 'L' ? 10 : 5)
  const max = entries.length > 0 ? entries[0].count : 0

  // S: 太窄, 收敛为 skill Top-3 (无切换、无占比条) — 仅排名 + 名称 + 次数。
  if (size === 'S') {
    const top = (insights?.topSkills ?? []).slice(0, 3)
    if (loading && !insights) {
      return (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-3 w-full animate-pulse rounded bg-muted/60" />
          ))}
        </div>
      )
    }
    if (top.length === 0) {
      return <p className="py-6 text-center text-sm text-muted-foreground">{t('overview.dashboard.topUsage.empty')}</p>
    }
    return (
      <ul className="space-y-2.5">
        {top.map((entry, i) => (
          <li key={entry.name} className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground/50">{i + 1}</span>
              <span className="min-w-0 truncate text-sm text-foreground">{entry.name}</span>
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {t('overview.dashboard.topUsage.runs', { count: entry.count })}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex w-fit items-center gap-0.5 rounded-md bg-muted/50 p-0.5 text-[11px]">
        {(['skill', 'mcp'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              'rounded px-2 py-0.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              kind === k ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t(`overview.dashboard.topUsage.${k}`)}
          </button>
        ))}
      </div>

      {loading && !insights ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-3 w-full animate-pulse rounded bg-muted/60" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('overview.dashboard.topUsage.empty')}</p>
      ) : (
        <ul className="space-y-2.5">
          {entries.map((entry, i) => (
            <li key={entry.name} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground/50">{i + 1}</span>
                  <span className="min-w-0 truncate text-sm text-foreground">{entry.name}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {t('overview.dashboard.topUsage.runs', { count: entry.count })}
                </span>
              </div>
              <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${max > 0 ? Math.max(4, (entry.count / max) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
