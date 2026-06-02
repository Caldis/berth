import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Minus, Pin, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function WindowControls(): React.ReactElement {
  const { t } = useTranslation()
  const [maximized, setMaximized] = useState(false)
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)

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
    'titlebar-no-drag pointer-events-auto flex h-7 w-10 items-center justify-center rounded-md text-muted-foreground',
    'transition-colors duration-150 hover:bg-muted hover:text-foreground active:bg-muted/80'
  )

  return (
    <div
      className="titlebar-no-drag pointer-events-auto fixed right-3 top-1.5 z-[10000] flex items-center gap-1"
      data-testid="window-controls"
    >
      <button
        aria-label={alwaysOnTop ? t('windowControls.unpin') : t('windowControls.pin')}
        aria-pressed={alwaysOnTop}
        className={cn(buttonClass, alwaysOnTop && 'bg-muted text-foreground')}
        type="button"
        onClick={() => {
          const next = !alwaysOnTop
          setAlwaysOnTop(next)
          void window.api.window.setAlwaysOnTop(next)
        }}
      >
        <Pin className={cn('h-3.5 w-3.5', !alwaysOnTop && 'rotate-45')} />
      </button>
      <button
        aria-label={t('windowControls.minimize')}
        className={buttonClass}
        type="button"
        onClick={() => void window.api.window.minimize()}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        aria-label={maximized ? t('windowControls.restore') : t('windowControls.maximize')}
        className={buttonClass}
        type="button"
        onClick={() => void window.api.window.toggleMaximize()}
      >
        {maximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3 w-3" />}
      </button>
      <button
        aria-label={t('windowControls.close')}
        className={cn(
          buttonClass,
          'hover:bg-destructive hover:text-destructive-foreground active:bg-destructive/80'
        )}
        type="button"
        onClick={() => void window.api.window.close()}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
