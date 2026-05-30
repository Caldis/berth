import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { SettingsContent } from '@/pages/settings'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({
  open,
  onOpenChange
}: SettingsDialogProps): React.ReactElement | null {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="titlebar-no-drag fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-black/45" onMouseDown={() => onOpenChange(false)} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        className="relative z-10 flex max-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl"
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <h2 id="settings-dialog-title" className="text-base font-semibold">
            {t('settings.title')}
          </h2>
          <button
            autoFocus
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-5">
          <SettingsContent showTitle={false} className="max-w-none" />
        </div>
      </section>
    </div>
  )
}
