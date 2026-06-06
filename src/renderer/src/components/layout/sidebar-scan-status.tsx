import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import type { AssetType } from '@shared/types/asset'
import type { AssetRuntimeStatus } from '@shared/types/ipc'
import { Chip, Progress, Spinner } from '@/components/ui'
import { FloatingPopover } from '@/components/shared/floating-popover'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'

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
  { key: 'conventions', types: ['claude-md', 'agents-md'] },
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

function ScanProgressPanel(): React.ReactElement {
  const { t } = useTranslation()
  const status = useAppStore((s) => s.assetRuntimeStatus)
  const assets = useAppStore((s) => s.assets)
  const errorCount = useAppStore((s) => s.assetErrors.length)

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

  return (
    <div className="flex w-64 flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{t('nav.scanStatus.title')}</span>
        <span className="text-xs text-muted-foreground">
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
            <span className="truncate text-xs text-muted-foreground">
              {phaseLabel}
              {progress?.label ? ` · ${progress.label}` : ''}
            </span>
          )}
        </div>
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

  if (!scanning && !stale && !errored && errorCount === 0) return null

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
    <Spinner size="sm" />
  ) : (
    <AlertTriangle className={cn('h-3.5 w-3.5 shrink-0', iconClass)} />
  )

  const trigger = collapsed ? (
    <div
      className="flex h-8 w-full cursor-default items-center justify-center"
      data-sidebar-scan-status
      role="status"
      aria-live="polite"
      title={label}
      aria-label={label}
    >
      {icon}
    </div>
  ) : (
    <div
      className="flex h-8 cursor-default items-center gap-2 rounded-md px-2.5 text-xs text-muted-foreground"
      data-sidebar-scan-status
      role="status"
      aria-live="polite"
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  )

  return (
    <FloatingPopover
      trigger={trigger}
      side="right"
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
