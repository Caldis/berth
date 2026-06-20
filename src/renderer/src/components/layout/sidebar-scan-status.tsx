import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Pause, Play, X } from 'lucide-react'
import type { AssetType } from '@shared/types/asset'
import type { AssetRuntimeStatus } from '@shared/types/ipc'
import { Chip, Progress } from '@/components/ui'
import { FloatingPopover } from '@/components/shared/floating-popover'
import { IndexPulse } from '@/components/shared/index-activity'
import { useScanEngineInfo } from '@/hooks/use-ipc'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'

/** Basename of a scanned file path for the flowing per-file progress (GH-10).
 * Cross-platform: splits on both POSIX and Windows separators so the renderer
 * shows a short, readable file name regardless of where the scan ran. */
function fileNameOf(filePath: string): string {
  const parts = filePath.split(/[\\/]/)
  return parts[parts.length - 1] || filePath
}

/** Wall-clock HH:MM for the "next scan" hint (GH-135). */
function formatClock(value: string | undefined, language: string): string {
  if (!value) return ''
  const time = new Date(value)
  if (Number.isNaN(time.getTime())) return ''
  return new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(time)
}

/**
 * Unified sidebar loading/scan indicator (GH-110 P4.1) with a hover progress
 * popover (P4.6).
 *
 * Single source of truth for scan feedback: reflects the central asset runtime
 * status (initial scan, manual refresh, watcher rescans, project switches) plus
 * surfaced scan errors. Hidden in the steady ready/idle state with no issues.
 * Hovering/focusing the indicator opens a panel that visualizes per-category
 * live counts and the overall scan progress as already-scanned assets stream in.
 */

// Curated asset taxonomy shown in the progress panel — mirrors the user-facing
// categories (约定/skills/mcp/hooks/…). Counts are derived from the live asset
// list, so they grow as partial scan results arrive.
const CATEGORY_DEFS: { key: string; types: AssetType[] }[] = [
  { key: 'conventions', types: ['claude-md', 'gemini-md', 'agents-md'] },
  { key: 'skills', types: ['skill'] },
  { key: 'subagents', types: ['agent'] },
  { key: 'commands', types: ['command'] },
  { key: 'outputModes', types: ['output-mode'] },
  { key: 'mcp', types: ['mcp-server'] },
  { key: 'hooks', types: ['hook'] },
  { key: 'plugins', types: ['plugin'] },
  { key: 'statusLine', types: ['statusline'] },
  { key: 'env', types: ['env'] },
  { key: 'sessions', types: ['session'] }
]

function scanningLabel(status: AssetRuntimeStatus, scanningText: string): string {
  const progress = status.progress
  if (progress && typeof progress.current === 'number' && typeof progress.total === 'number' && progress.total > 0) {
    return `${scanningText} ${progress.current}/${progress.total}`
  }
  return scanningText
}

// Exported for unit testing the GH-135 control surface directly: the hover
// popover detaches too fast in jsdom for live-tree queries against its buttons.
export function ScanProgressPanel(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const language = i18n.language || 'en'
  const status = useAppStore((s) => s.assetRuntimeStatus)
  const assets = useAppStore((s) => s.assets)
  const errorCount = useAppStore((s) => s.assetErrors.length)
  const { info, pause, resume, cancel } = useScanEngineInfo()

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const asset of assets) counts.set(asset.type, (counts.get(asset.type) ?? 0) + 1)
    return counts
  }, [assets])

  const progress = status.progress
  const scanning = status.state === 'scanning' || status.state === 'stale'
  const pct = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  // Determinate bar only for the bulk per-adapter `parsing` phase; the short
  // discovering/indexing/deriving tails animate indeterminately rather than
  // pretending to a 0% reset.
  const indeterminate = scanning && (progress?.phase !== 'parsing' || progress.total === 0)
  const phaseLabel = progress ? t(`nav.scanStatus.phase.${progress.phase}`) : ''
  // GH-135: engine-computed ETA/rate (single source of truth) + next periodic scan.
  const paused = info?.scheduler.paused ?? false
  const nextScanAt = info?.scheduler.periodicScan.nextScanAt
  const etaSeconds = progress?.etaMs !== undefined ? Math.ceil(progress.etaMs / 1000) : undefined

  return (
    <div className="flex w-64 flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{t('nav.scanStatus.title')}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {t('nav.scanStatus.scannedTotal', { count: assets.length })}
        </span>
      </div>

      {scanning && (
        <div className="flex flex-col gap-1">
          <Progress
            aria-label={t('nav.scanStatus.title')}
            size="sm"
            value={pct}
            isIndeterminate={indeterminate}
            className="w-full"
          />
          {phaseLabel && (
            <span className="truncate text-xs text-muted-foreground" title={progress?.currentPath ?? undefined}>
              {phaseLabel}
              {/* GH-10: prefer the flowing per-file path (basename — full path is too
                  long for the truncated row, available on hover); fall back to the
                  adapter-level label when no per-file path is streaming. */}
              {progress?.currentPath
                ? ` · ${fileNameOf(progress.currentPath)}`
                : progress?.label
                  ? ` · ${progress.label}`
                  : ''}
            </span>
          )}
          {(etaSeconds !== undefined || progress?.ratePerSec) && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {etaSeconds !== undefined ? t('nav.scanStatus.eta', { seconds: etaSeconds }) : ''}
              {progress?.ratePerSec
                ? `${etaSeconds !== undefined ? ' · ' : ''}${t('nav.scanStatus.rate', { rate: progress.ratePerSec })}`
                : ''}
            </span>
          )}
        </div>
      )}

      {!scanning && paused && (
        <span className="text-xs text-muted-foreground">{t('nav.scanStatus.paused')}</span>
      )}
      {!scanning && !paused && nextScanAt && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {t('nav.scanStatus.nextScan', { time: formatClock(nextScanAt, language) })}
        </span>
      )}

      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {CATEGORY_DEFS.map((def) => {
          const count = def.types.reduce((sum, type) => sum + (typeCounts.get(type) ?? 0), 0)
          return (
            <li key={def.key} className="flex items-center justify-between gap-2 text-xs">
              <span className={cn('truncate', count === 0 ? 'text-muted-foreground/60' : 'text-muted-foreground')}>
                {t(`nav.scanStatus.categories.${def.key}`)}
              </span>
              <Chip size="sm" variant="flat" tone="neutral">
                {count}
              </Chip>
            </li>
          )
        })}
      </ul>

      {errorCount > 0 && (
        <span className="text-xs text-amber-500">{t('nav.scanStatus.issues', { count: errorCount })}</span>
      )}

      {/* GH-115 T6: 扫描故障消息此前全 renderer 零渲染 — 故障链最后一跳接到 UI */}
      {status.state === 'error' && status.error && (
        <span data-testid="scan-status-error-message" className="break-all text-xs text-red-500">
          {status.error}
        </span>
      )}

      {/* GH-135: index controls — quiet text buttons (no loud accent), per design taste. */}
      <div className="flex items-center gap-3 border-t border-border pt-2">
        {paused ? (
          <button
            type="button"
            onClick={resume}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Play className="h-3 w-3" aria-hidden="true" />
            {t('nav.scanStatus.resume')}
          </button>
        ) : (
          <button
            type="button"
            onClick={pause}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Pause className="h-3 w-3" aria-hidden="true" />
            {t('nav.scanStatus.pause')}
          </button>
        )}
        {scanning && (
          <button
            type="button"
            onClick={cancel}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            {t('nav.scanStatus.cancel')}
          </button>
        )}
      </div>
    </div>
  )
}

export function SidebarScanStatus({ collapsed }: { collapsed: boolean }): React.ReactElement | null {
  const { t } = useTranslation()
  const status = useAppStore((s) => s.assetRuntimeStatus)
  const errorCount = useAppStore((s) => s.assetErrors.length)

  const scanning = status.state === 'scanning'
  const stale = status.state === 'stale'
  const errored = status.state === 'error'

  // Idle with no issues: keep a fixed-size, transparent slot in the footer instead
  // of unmounting. The old conditional row in the top block unmounted on idle and
  // remounted on every watcher rescan, jumping the whole nav list below it;
  // reserving the slot here makes scan feedback layout-neutral. (GH-113)
  // BUT when collapsed the footer stacks vertically, so an empty slot becomes a
  // blank row that visibly inflates the footer (GH-135) — drop it there; reflow on
  // scan start only nudges the footer's own height, not the nav above it.
  if (!scanning && !stale && !errored && errorCount === 0) {
    return collapsed ? null : <div data-sidebar-scan-slot className="h-8 w-8 shrink-0" aria-hidden="true" />
  }

  const showSpinner = scanning || stale
  let label: string
  let iconClass = ''
  if (scanning) {
    label = scanningLabel(status, t('nav.scanStatus.scanning'))
  } else if (stale) {
    label = t('nav.scanStatus.updating')
  } else if (errored) {
    label = t('nav.scanStatus.error')
    iconClass = 'text-red-500'
  } else {
    label = t('nav.scanStatus.issues', { count: errorCount })
    iconClass = 'text-amber-500'
  }

  const icon = showSpinner ? (
    <IndexPulse />
  ) : (
    <AlertTriangle className={cn('h-3.5 w-3.5 shrink-0', iconClass)} />
  )

  // A calm, icon-sized presence in the footer status row beside Settings; the label
  // and per-category progress live in the hover panel. Same footprint as the idle
  // slot above, so toggling scan state never reflows the footer or the nav.
  const trigger = (
    <div
      className="flex h-8 w-8 shrink-0 cursor-default items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/10"
      data-sidebar-scan-status
      role="status"
      aria-live="polite"
      title={label}
      aria-label={label}
    >
      {icon}
    </div>
  )

  return (
    <FloatingPopover
      trigger={trigger}
      side={collapsed ? 'right' : 'top'}
      align="end"
      role="dialog"
      triggerTestId="sidebar-scan-status-trigger"
      contentTestId="sidebar-scan-progress"
      hoverBridge
    >
      <ScanProgressPanel />
    </FloatingPopover>
  )
}
