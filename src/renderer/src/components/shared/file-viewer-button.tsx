import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'

type FileViewerButtonState = 'idle' | 'loading' | 'unavailable'

interface FileViewerButtonProps {
  path: string
  loadContent: () => Promise<string | null | undefined>
  label?: string
  className?: string
}

const DEFAULT_BUTTON_CLASS = 'flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent'

export function FileViewerButton({ path, loadContent, label, className }: FileViewerButtonProps): React.ReactElement {
  const { t } = useTranslation()
  const openInspector = useAppStore((s) => s.openInspector)
  const [state, setState] = useState<FileViewerButtonState>('idle')

  useEffect(() => {
    setState('idle')
  }, [path])

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
      const content = await loadContent()
      if (content) {
        openInspector(path, content)
        setState('idle')
        return
      }
      setState('unavailable')
    } catch {
      setState('unavailable')
    }
  }, [isBusy, isUnavailable, loadContent, openInspector, path])

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
