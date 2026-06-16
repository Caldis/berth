import { History } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts'
import type { ScanHistoryEntry } from '@shared/types/ipc'

/**
 * GH-135 G7: scan-history trend block. The engine supplies raw entries; this
 * component does all integration + visualization (per 方案 X) — it derives
 * per-scan intervals, the running average, and the last gap, then charts the
 * duration trend (recharts) with a per-bar detail tooltip. Errored scans color
 * their bar destructive so regressions are visible at a glance.
 */

type ChartDatum = ScanHistoryEntry & { durationSec: number; intervalMs: number }

function formatMs(ms: number): string {
  if (ms <= 0) return '—'
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`
}

function formatGap(ms: number): string {
  if (ms <= 0) return '—'
  const minutes = ms / 60_000
  if (minutes < 1) return `${Math.round(ms / 1000)}s`
  if (minutes < 60) return `${Math.round(minutes)}min`
  return `${(minutes / 60).toFixed(1)}h`
}

function HistoryTooltip({
  active,
  payload,
  language,
  t
}: {
  active?: boolean
  payload?: Array<{ payload?: ChartDatum }>
  language: string
  t: ReturnType<typeof useTranslation>['t']
}): React.ReactElement | null {
  const d = payload?.[0]?.payload
  if (!active || !d) return null
  return (
    <div className="rounded-md border border-border bg-card p-2 text-xs shadow-md">
      <div className="font-medium text-foreground">{new Date(d.at).toLocaleString(language)}</div>
      <div className="mt-1 space-y-0.5 text-muted-foreground">
        <div>
          {t('settings.scanEngine.history.tipReason')}:{' '}
          {t(`settings.scanEngine.values.${d.reason}`, { defaultValue: d.reason })}
        </div>
        <div>
          {t('settings.scanEngine.history.tipDuration')}: {formatMs(d.durationMs)}
        </div>
        <div>
          {t('settings.scanEngine.history.tipResult', { assets: d.assetCount, files: d.fileCount })}
        </div>
        {d.errorCount > 0 && (
          <div className="text-destructive">
            {t('settings.scanEngine.history.tipErrors', { count: d.errorCount })}
          </div>
        )}
        {d.intervalMs > 0 && (
          <div>
            {t('settings.scanEngine.history.tipGap')}: {formatGap(d.intervalMs)}
          </div>
        )}
      </div>
    </div>
  )
}

export function ScanHistorySection({ history }: { history: ScanHistoryEntry[] }): React.ReactElement {
  const { t, i18n } = useTranslation()
  const language = i18n.language || 'en'

  if (history.length === 0) {
    return (
      <div className="rounded-md border border-border p-3 text-xs text-muted-foreground" data-testid="scan-history">
        <span className="inline-flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" aria-hidden="true" />
          {t('settings.scanEngine.history.title')}
        </span>
        <span className="ml-2">{t('settings.scanEngine.history.empty')}</span>
      </div>
    )
  }

  // UI-side integration of the raw engine entries (intervals / average / last gap).
  const recent = history.slice(-24)
  const data: ChartDatum[] = recent.map((entry, i) => ({
    ...entry,
    durationSec: Math.round(entry.durationMs / 100) / 10,
    intervalMs: i > 0 ? Math.max(0, Date.parse(entry.at) - Date.parse(recent[i - 1].at)) : 0
  }))
  const avgMs = Math.round(history.reduce((sum, e) => sum + e.durationMs, 0) / history.length)
  const last = history[history.length - 1]
  const lastGapMs = history.length > 1 ? Date.parse(last.at) - Date.parse(history[history.length - 2].at) : 0

  return (
    <div className="space-y-3 rounded-md border border-border p-3" data-testid="scan-history">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          <History className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          {t('settings.scanEngine.history.title')}
        </span>
        <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
          <span>{t('settings.scanEngine.history.count', { count: history.length })}</span>
          <span>{t('settings.scanEngine.history.avg', { value: formatMs(avgMs) })}</span>
          <span>{t('settings.scanEngine.history.lastGap', { value: formatGap(lastGapMs) })}</span>
        </div>
      </div>
      <div className="h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="at" hide />
            <YAxis hide />
            <RechartsTooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
              content={({ active, payload }) => (
                <HistoryTooltip
                  active={active}
                  payload={payload as Array<{ payload?: ChartDatum }> | undefined}
                  language={language}
                  t={t}
                />
              )}
            />
            <Bar dataKey="durationSec" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.at} fill={d.errorCount > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
