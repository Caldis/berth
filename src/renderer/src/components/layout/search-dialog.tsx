import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Plug,
  MessageSquare,
  BarChart3,
  Search
} from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { cn } from '@/lib/utils'

interface QuickAction {
  id: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  path: string
}

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

const quickActions: QuickAction[] = [
  { id: 'overview', labelKey: 'nav.overview', icon: Search, path: '/' },
  { id: 'sessions', labelKey: 'nav.sessions', icon: MessageSquare, path: '/sessions' },
  {
    id: 'instructions',
    labelKey: 'nav.instructions',
    icon: FileText,
    path: '/configuration/instructions'
  },
  {
    id: 'capabilities',
    labelKey: 'nav.capabilities',
    icon: Plug,
    path: '/configuration/capabilities'
  },
  { id: 'usage', labelKey: 'nav.usage', icon: BarChart3, path: '/usage' }
]

export function SearchDialog(): React.ReactElement | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const open = useAppStore((s) => s.searchOpen)
  const setOpen = useAppStore((s) => s.setSearchOpen)
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
        return
      }

      if (!open) return

      if (e.key === 'Escape' && open) {
        setOpen(false)
        return
      }

      if (e.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return

      const focusableElements = getFocusableElements(dialog)
      if (focusableElements.length === 0) return

      const firstFocusable = focusableElements[0]
      const lastFocusable = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (e.shiftKey) {
        if (!activeElement || activeElement === firstFocusable || !dialog.contains(activeElement)) {
          e.preventDefault()
          lastFocusable.focus()
        }
        return
      }

      if (!activeElement || activeElement === lastFocusable || !dialog.contains(activeElement)) {
        e.preventDefault()
        firstFocusable.focus()
      }
    }
    window.addEventListener('keydown', handler)

    if (open) {
      inputRef.current?.focus()
    }

    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  if (!open) return null

  const handleSelect = (path: string): void => {
    navigate(path)
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('search.placeholder')}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
      >
        <div className="flex items-center border-b border-border px-4">
          <Search aria-hidden="true" className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            aria-label={t('search.placeholder')}
            autoFocus
            placeholder={t('search.placeholder')}
            className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {t('search.hint')}
          </div>
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleSelect(action.path)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm',
                'text-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <action.icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              <span>{t(action.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
