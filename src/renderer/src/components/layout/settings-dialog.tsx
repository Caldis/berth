import { useEffect, useRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { SettingsContent } from '@/pages/settings'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusRef?: RefObject<HTMLElement | null>
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => (
    element.tabIndex >= 0 &&
    !element.hidden &&
    element.getAttribute('aria-hidden') !== 'true'
  ))
}

export function SettingsDialog({
  open,
  onOpenChange,
  returnFocusRef
}: SettingsDialogProps): React.ReactElement | null {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onOpenChange(false)
        return
      }

      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return

      const focusableElements = getFocusableElements(dialog)
      if (focusableElements.length === 0) return

      const firstFocusable = focusableElements[0]
      const lastFocusable = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey) {
        if (activeElement === firstFocusable || !dialog.contains(activeElement)) {
          event.preventDefault()
          lastFocusable.focus()
        }
        return
      }

      if (activeElement === lastFocusable || !dialog.contains(activeElement)) {
        event.preventDefault()
        firstFocusable.focus()
      }
    }

    closeButtonRef.current?.focus()
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      returnFocusRef?.current?.focus()
    }
  }, [open, onOpenChange, returnFocusRef])

  if (!open) return null

  return (
    <div className="titlebar-no-drag fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-black/45" onMouseDown={() => onOpenChange(false)} />
      <section
        ref={dialogRef}
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
            ref={closeButtonRef}
            autoFocus
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-5">
          <SettingsContent showTitle={false} className="max-w-none" />
        </div>
      </section>
    </div>
  )
}
