import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'
import { truncatePath } from '@/lib/utils'

export function InspectorDrawer(): React.ReactElement | null {
  const { t } = useTranslation()
  const open = useAppStore((s) => s.inspectorOpen)
  const path = useAppStore((s) => s.inspectorPath)
  const content = useAppStore((s) => s.inspectorContent)
  const closeInspector = useAppStore((s) => s.closeInspector)
  const [copied, setCopied] = useState(false)

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
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        closeInspector()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, closeInspector])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={closeInspector} />

      {/* Drawer */}
      <div
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
            onClick={handleCopy}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('inspector.copy')}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={closeInspector}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('common.close')}
          >
            <X className="h-3.5 w-3.5" />
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
