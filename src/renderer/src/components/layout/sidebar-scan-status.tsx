import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import type { AssetRuntimeStatus } from '@shared/types/ipc'
import { Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'

/**
 * Unified sidebar loading/scan indicator (GH-110 P4.1).
 *
 * Single source of truth for scan feedback: reflects the central asset runtime
 * status (initial scan, manual refresh, watcher rescans, project switches) plus
 * surfaced scan errors. Hidden in the steady ready/idle state with no issues.
 */
function scanningLabel(status: AssetRuntimeStatus, scanningText: string): string {
  const progress = status.progress
  if (progress && typeof progress.current === 'number' && typeof progress.total === 'number' && progress.total > 0) {
    return `${scanningText} ${progress.current}/${progress.total}`
  }
  return scanningText
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

  if (collapsed) {
    return (
      <div
        className="flex h-8 w-full items-center justify-center"
        data-sidebar-scan-status
        role="status"
        aria-live="polite"
        title={label}
        aria-label={label}
      >
        {icon}
      </div>
    )
  }

  return (
    <div
      className="flex h-8 items-center gap-2 rounded-md px-2.5 text-xs text-muted-foreground"
      data-sidebar-scan-status
      role="status"
      aria-live="polite"
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  )
}
