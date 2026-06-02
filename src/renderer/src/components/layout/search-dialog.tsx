import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Plug,
  MessageSquare,
  BarChart3,
  Search,
  Wrench
} from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { cn } from '@/lib/utils'
import type { Asset } from '@shared/types/asset'
import type { SearchResult } from '@shared/types/ipc'

interface QuickAction {
  id: string
  labelKey: string
  icon: ComponentType<{ className?: string }>
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
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const normalizedQuery = query.trim()
  const hasQuery = normalizedQuery.length > 0

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent): void => {
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

  useEffect(() => {
    if (open) return
    setQuery('')
    setResults([])
    setLoading(false)
    setError(false)
    setActiveIndex(-1)
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!normalizedQuery) {
      setResults([])
      setLoading(false)
      setError(false)
      setActiveIndex(-1)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(false)
    setResults([])
    setActiveIndex(-1)

    const timer = window.setTimeout(() => {
      window.api.assets.search(normalizedQuery)
        .then((nextResults) => {
          if (cancelled) return
          setResults(nextResults)
          setActiveIndex(nextResults.length > 0 ? 0 : -1)
        })
        .catch(() => {
          if (cancelled) return
          setResults([])
          setActiveIndex(-1)
          setError(true)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [normalizedQuery, open])

  if (!open) return null

  const handleSelect = (path: string): void => {
    navigate(path)
    setOpen(false)
  }

  const handleSelectResult = (result: SearchResult): void => {
    handleSelect(routeForAsset(result.asset))
  }

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (!hasQuery || results.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % results.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1))
      return
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      handleSelectResult(results[activeIndex])
    }
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
        onKeyDown={handleDialogKeyDown}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
      >
        <div className="flex items-center border-b border-border px-4">
          <Search aria-hidden="true" className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            aria-label={t('search.placeholder')}
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search.placeholder')}
            className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2" aria-busy={loading}>
          {!hasQuery ? (
            <>
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
            </>
          ) : (
            <SearchResults
              activeIndex={activeIndex}
              error={error}
              loading={loading}
              results={results}
              onSelect={handleSelectResult}
            />
          )}
        </div>
      </div>
    </div>
  )
}

interface SearchResultsProps {
  activeIndex: number
  error: boolean
  loading: boolean
  results: SearchResult[]
  onSelect: (result: SearchResult) => void
}

function SearchResults({
  activeIndex,
  error,
  loading,
  results,
  onSelect
}: SearchResultsProps): React.ReactElement {
  const { t } = useTranslation()

  if (loading) {
    return <SearchState>{t('search.loading')}</SearchState>
  }

  if (error) {
    return <SearchState>{t('search.error')}</SearchState>
  }

  if (results.length === 0) {
    return <SearchState>{t('search.noResults')}</SearchState>
  }

  return (
    <div role="listbox" aria-label={t('search.results')} className="space-y-1">
      {results.map((result, index) => (
        <SearchResultRow
          key={result.id}
          result={result}
          selected={index === activeIndex}
          onSelect={() => onSelect(result)}
        />
      ))}
    </div>
  )
}

function SearchState({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

interface SearchResultRowProps {
  result: SearchResult
  selected: boolean
  onSelect: () => void
}

function SearchResultRow({ result, selected, onSelect }: SearchResultRowProps): React.ReactElement {
  const { t } = useTranslation()
  const asset = result.asset
  const Icon = iconForAsset(asset)
  const match = result.matches[0]
  const matchText = match
    ? t('search.match', {
      field: t(`search.fields.${match.field}`, { defaultValue: match.field }),
      snippet: match.snippet
    })
    : null
  const pathText = displayPathForAsset(asset)

  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      title={pathText}
      className={cn(
        'flex min-h-[64px] w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors',
        selected
          ? 'bg-accent text-accent-foreground'
          : 'text-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background">
        <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{asset.name}</span>
          <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">
            {t(`healthChecks.text.assetTypes.${asset.type}`, { defaultValue: asset.type })}
          </span>
          <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">
            {formatAgentId(asset.agentId)}
          </span>
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">{asset.scope}</span>
          <span aria-hidden="true" className="text-border">/</span>
          <span className="shrink-0">{asset.category}</span>
          <span aria-hidden="true" className="text-border">/</span>
          <span className="truncate">{pathText}</span>
        </span>
        {matchText ? (
          <span className="mt-1 block truncate text-xs text-muted-foreground">{matchText}</span>
        ) : null}
      </span>
    </button>
  )
}

function routeForAsset(asset: Asset): string {
  if (asset.type === 'session') return `/sessions/${asset.id}`
  if (asset.type === 'usage-data' || asset.type === 'stats-cache') return '/usage'
  if (['hook', 'mcp-server', 'permission', 'plugin', 'statusline', 'env'].includes(asset.type)) {
    return '/configuration/capabilities'
  }
  if (['claude-md', 'agents-md', 'command', 'agent', 'skill', 'output-mode', 'team'].includes(asset.type)) {
    return '/configuration/instructions'
  }
  return '/'
}

function iconForAsset(asset: Asset): ComponentType<{ className?: string }> {
  if (asset.type === 'session') return MessageSquare
  if (asset.type === 'usage-data' || asset.type === 'stats-cache') return BarChart3
  if (['hook', 'mcp-server', 'plugin', 'permission', 'env', 'statusline'].includes(asset.type)) return Plug
  if (['command', 'agent', 'skill'].includes(asset.type)) return Wrench
  return FileText
}

function displayPathForAsset(asset: Asset): string {
  const transcriptPath = typeof asset.meta.transcriptPath === 'string' ? asset.meta.transcriptPath : ''
  return transcriptPath || asset.path
}

function formatAgentId(agentId: string): string {
  if (agentId === 'claude-code') return 'Claude Code'
  if (agentId === 'codex') return 'Codex'
  return agentId
}
