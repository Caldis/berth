import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Minus, Pin, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEFAULT_NAVIGATION_HEIGHT = 72
const ICON_STROKE_WIDTH = 1.8

interface WindowControlsProps {
  navigationHeight?: number
}

export function WindowControls({ navigationHeight = DEFAULT_NAVIGATION_HEIGHT }: WindowControlsProps): React.ReactElement {
  const { t } = useTranslation()
  const [maximized, setMaximized] = useState(false)
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)
  const containerStyle = useMemo<CSSProperties>(() => ({
    top: Math.max(DEFAULT_NAVIGATION_HEIGHT, navigationHeight) / 2
  }), [navigationHeight])

  useEffect(() => {
    let mounted = true

    window.api.window.isMaximized().then((value) => {
      if (mounted) setMaximized(value)
    })
    window.api.window.isAlwaysOnTop().then((value) => {
      if (mounted) setAlwaysOnTop(value)
    })

    const removeListener = window.api.window.onMaximizedChange(setMaximized)
    return () => {
      mounted = false
      removeListener()
    }
  }, [])

  const buttonClass = cn(
    'titlebar-no-drag pointer-events-auto flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground/80',
    'transition-[background-color,color,transform] duration-150 hover:bg-muted/70 hover:text-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px active:bg-muted/80'
  )

  return (
    <div
      className="titlebar-no-drag pointer-events-auto fixed right-[1.15rem] z-[10000] flex -translate-y-1/2 items-center gap-1"
      style={containerStyle}
      data-testid="window-controls"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none h-6 w-px shrink-0 bg-border/80"
        data-testid="window-controls-divider"
      />
      <button
        aria-label={alwaysOnTop ? t('windowControls.unpin') : t('windowControls.pin')}
        aria-pressed={alwaysOnTop}
        className={cn(buttonClass, alwaysOnTop && 'bg-muted/70 text-foreground')}
        type="button"
        onClick={() => {
          const next = !alwaysOnTop
          setAlwaysOnTop(next)
          void window.api.window.setAlwaysOnTop(next)
        }}
      >
        <Pin
          className={cn('h-4 w-4', !alwaysOnTop && 'rotate-45')}
          strokeWidth={ICON_STROKE_WIDTH}
        />
      </button>
      <button
        aria-label={t('windowControls.minimize')}
        className={buttonClass}
        type="button"
        onClick={() => void window.api.window.minimize()}
      >
        <Minus className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
      </button>
      <button
        aria-label={maximized ? t('windowControls.restore') : t('windowControls.maximize')}
        className={buttonClass}
        type="button"
        onClick={() => void window.api.window.toggleMaximize()}
      >
        {maximized ? (
          <Copy className="h-3.5 w-3.5" strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <Square className="h-3.5 w-3.5" strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </button>
      <button
        aria-label={t('windowControls.close')}
        className={cn(
          buttonClass,
          'hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20'
        )}
        type="button"
        onClick={() => void window.api.window.close()}
      >
        <X className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
      </button>
    </div>
  )
}
