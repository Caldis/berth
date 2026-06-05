import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, X } from 'lucide-react'
import { cn, truncatePath } from '@/lib/utils'
import { isMacPlatform, isWindowsPlatform } from '@/lib/platform'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

const FILE_VIEWER_DEFAULT_WIDTH = 672
const FILE_VIEWER_MIN_WIDTH = 420
const FILE_VIEWER_MAX_WIDTH = 960

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getAttribute('aria-hidden') !== 'true'
  )
}

function clampFileViewerWidth(
  width: number,
  viewportWidth = typeof window === 'undefined' ? FILE_VIEWER_DEFAULT_WIDTH : window.innerWidth
): number {
  const viewportMax = Math.max(FILE_VIEWER_MIN_WIDTH, Math.min(FILE_VIEWER_MAX_WIDTH, viewportWidth))
  if (!Number.isFinite(width)) return Math.min(FILE_VIEWER_DEFAULT_WIDTH, viewportMax)
  return Math.max(FILE_VIEWER_MIN_WIDTH, Math.min(viewportMax, Math.round(width)))
}

interface FileViewerDrawerProps {
  open: boolean
  path: string | null
  content: string | null
  onClose: () => void
}

export function FileViewerDrawer({ open, path, content, onClose }: FileViewerDrawerProps): React.ReactElement | null {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [width, setWidth] = useState(FILE_VIEWER_DEFAULT_WIDTH)
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dragCleanupRef = useRef<(() => void) | null>(null)
  const isWindows = isWindowsPlatform()
  const isMac = isMacPlatform()
  const drawerStyle: CSSProperties = {
    width: `min(100vw, ${width}px)`
  }

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

  const handleResizeMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault()

    const startX = event.clientX
    const startWidth = width
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect

    const handleMouseMove = (moveEvent: globalThis.MouseEvent): void => {
      setWidth(clampFileViewerWidth(startWidth + startX - moveEvent.clientX))
    }

    const cleanup = (): void => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      dragCleanupRef.current = null
    }

    const handleMouseUp = (): void => cleanup()

    dragCleanupRef.current = cleanup
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.()
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (!open) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
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
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    setWidth((current) => clampFileViewerWidth(current))
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        aria-hidden="true"
        data-testid="file-viewer-backdrop"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[9980] bg-black/30',
          isMac ? 'top-10' : 'top-0'
        )}
        onClick={onClose}
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('common.viewRaw')}
        className={cn(
          'titlebar-no-drag fixed right-0 z-[9990] flex flex-col border-l border-border bg-background shadow-2xl',
          'top-0 h-full',
          'animate-in slide-in-from-right duration-200'
        )}
        style={drawerStyle}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t('inspector.resize')}
          className={cn(
            'titlebar-no-drag absolute left-[-4px] top-0 h-full w-2 cursor-col-resize',
            'before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-transparent',
            'hover:before:bg-primary/40'
          )}
          onMouseDown={handleResizeMouseDown}
        />

        {/* macOS hiddenInset: a draggable spacer keeps the header buttons below
            the top system title-bar strip, where -webkit-app-region: no-drag is
            unreliable, while the drawer background still sits flush to the top. */}
        {isMac && (
          <div
            aria-hidden="true"
            data-testid="file-viewer-mac-titlebar"
            className="titlebar-drag h-10 w-full shrink-0"
          />
        )}

        <div
          data-testid="file-viewer-header"
          className={cn(
            'titlebar-no-drag flex items-center gap-3 border-b border-border px-4 py-3',
            isWindows && 'pr-48'
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {path ? truncatePath(path, 80) : ''}
            </p>
            {path && (
              <p className="truncate font-mono text-xs text-muted-foreground">{path}</p>
            )}
          </div>
          <button
            type="button"
            aria-label={t('inspector.copy')}
            onClick={handleCopy}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={t('common.close')}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <pre className="whitespace-pre-wrap break-all rounded-lg bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground">
            {content ?? ''}
          </pre>
        </div>
      </div>
    </>
  )
}
