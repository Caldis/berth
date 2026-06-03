import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import type { Asset } from '@shared/types/asset'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'

type ViewRawButtonState = 'idle' | 'loading' | 'unavailable'

interface ViewRawButtonProps {
  asset: Asset
  label?: string
  className?: string
}

const DEFAULT_BUTTON_CLASS = 'flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent'

export function ViewRawButton({ asset, label, className }: ViewRawButtonProps): React.ReactElement {
  const { t } = useTranslation()
  const openInspector = useAppStore((s) => s.openInspector)
  const [state, setState] = useState<ViewRawButtonState>('idle')

  useEffect(() => {
    setState('idle')
  }, [asset.id])

  const idleLabel = label ?? t('common.viewRaw')
  const loadingLabel = t('inspector.loadingRaw')
  const unavailableLabel = t('inspector.rawUnavailable')
  const isBusy = state === 'loading'
  const isUnavailable = state === 'unavailable'
  const buttonLabel = isBusy ? loadingLabel : isUnavailable ? unavailableLabel : idleLabel

  const handleClick = useCallback(async () => {
    if (isBusy || isUnavailable) return

    setState('loading')
    try {
      const full = await window.api?.assets.get(asset.id) as Asset | null | undefined
      const raw = full?.raw ?? asset.raw
      if (raw) {
        openInspector(asset.path, raw)
        setState('idle')
        return
      }
      setState('unavailable')
    } catch {
      setState('unavailable')
    }
  }, [asset.id, asset.path, asset.raw, isBusy, isUnavailable, openInspector])

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy || isUnavailable}
      title={isUnavailable ? t('inspector.rawUnavailableDetail') : idleLabel}
      className={cn(DEFAULT_BUTTON_CLASS, className)}
    >
      <Eye aria-hidden="true" className="h-3 w-3" />
      {buttonLabel}
    </button>
  )
}
