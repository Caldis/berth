import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'
import { truncatePath } from '@/lib/utils'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getAttribute('aria-hidden') !== 'true'
  )
}

export function InspectorDrawer(): React.ReactElement | null {
  const { t } = useTranslation()
  const open = useAppStore((s) => s.inspectorOpen)
  const path = useAppStore((s) => s.inspectorPath)
  const content = useAppStore((s) => s.inspectorContent)
  const closeInspector = useAppStore((s) => s.closeInspector)
  const [copied, setCopied] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const handleCopy = useCallback(async () => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }, [content])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (!open) return

      if (e.key === 'Escape') {
        e.preventDefault()
        closeInspector()
        return
      }

      if (e.key !== 'Tab') return

      const drawer = drawerRef.current
      if (!drawer) return

      const focusableElements = getFocusableElements(drawer)
      if (focusableElements.length === 0) return

      const firstFocusable = focusableElements[0]
      const lastFocusable = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (e.shiftKey) {
        if (!activeElement || activeElement === firstFocusable || !drawer.contains(activeElement)) {
          e.preventDefault()
          lastFocusable.focus()
        }
        return
      }

      if (!activeElement || activeElement === lastFocusable || !drawer.contains(activeElement)) {
        e.preventDefault()
        firstFocusable.focus()
      }
    }
    window.addEventListener('keydown', handler)

    if (open) {
      closeButtonRef.current?.focus()
    }

    return () => window.removeEventListener('keydown', handler)
  }, [open, closeInspector])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/30" onClick={closeInspector} />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('common.viewRaw')}
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl',
          'animate-in slide-in-from-right duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {path ? truncatePath(path, 80) : ''}
            </p>
            {path && (
              <p className="truncate text-xs text-muted-foreground font-mono">{path}</p>
            )}
          </div>
          <button
            type="button"
            aria-label={t('inspector.copy')}
            onClick={handleCopy}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('inspector.copy')}
          >
            {copied ? (
              <Check aria-hidden="true" className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy aria-hidden="true" className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={t('common.close')}
            onClick={closeInspector}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('common.close')}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="whitespace-pre-wrap break-all rounded-lg bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground">
            {content ?? ''}
          </pre>
        </div>
      </div>
    </>
  )
}
