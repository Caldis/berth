import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Brain,
  Database,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Tag,
  Loader2,
  Search,
  RefreshCw,
  Link2,
  Eye,
  AlertTriangle
} from 'lucide-react'
import { cn, truncatePath, formatOptionalRelativeTime } from '@/lib/utils'
import { useMemory } from '@/hooks/use-memory'
import { useAppStore } from '@/stores/app'
import { EmptyState } from '@/components/shared/empty-state'
import type { MemoryNote, MemorySourceStatus, MemoryImportance } from '@shared/types/memory'

// Color marks the exception, not the rule: `core` gets an emphasis hue (amber,
// not red — these are important, not errors), archive/unknown fade into neutral.
// `active` (the common case) stays quiet so the rare cases stand out.
const importanceColors: Record<MemoryImportance, string> = {
  core: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  active: 'bg-muted text-muted-foreground',
  archive: 'bg-muted/60 text-muted-foreground/70',
  unknown: 'bg-muted/60 text-muted-foreground/70'
}

// i18n defaults live in-component so the view stays readable even when the shared
// en/zh.json locale files lag behind (they are edited concurrently by other work).
// When the real keys land, t() picks them up automatically.
const importanceHintFallback: Record<MemoryImportance, string> = {
  core: 'Core — loaded into context every session',
  active: 'Active — loaded on demand when relevant',
  archive: 'Archive — kept for reference, not auto-loaded',
  unknown: 'Importance not specified'
}

const emptyFallback: Record<string, { title: string; hint: string }> = {
  noSources: {
    title: 'No memory sources found',
    hint: 'Berth looks for native Claude Code memory and united-memory (~/.united-memory).'
  },
  empty: {
    title: 'No memories yet',
    hint: 'Your memory sources are connected but hold no notes.'
  },
  noResults: {
    title: 'No matching memories',
    hint: 'No notes match the current search or source filter.'
  }
}

function sourceIcon(id: string): React.ComponentType<{ className?: string }> {
  return id === 'united-memory' ? Database : Brain
}

/** Most-recent-first; notes without a date sort last, tiebroken by title. */
function byRecency(a: MemoryNote, b: MemoryNote): number {
  const ta = a.updatedAt ? Date.parse(a.updatedAt) : NaN
  const tb = b.updatedAt ? Date.parse(b.updatedAt) : NaN
  const va = Number.isNaN(ta) ? -Infinity : ta
  const vb = Number.isNaN(tb) ? -Infinity : tb
  if (va !== vb) return vb - va
  return a.title.localeCompare(b.title)
}

function ImportanceBadge({ importance }: { importance: MemoryImportance }): React.ReactElement {
  const { t } = useTranslation()
  return (
    <span
      title={t(`memory.importanceHint.${importance}`, importanceHintFallback[importance])}
      className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', importanceColors[importance] ?? importanceColors.unknown)}
    >
      {importance}
    </span>
  )
}

function SourceBadge({ label, id }: { label: string; id: string }): React.ReactElement {
  const Icon = sourceIcon(id)
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  )
}

function MissingBadge(): React.ReactElement {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
      <AlertTriangle className="h-2.5 w-2.5" />
      {t('memory.fileMissing', 'File missing')}
    </span>
  )
}

function NoteCard({
  note,
  focused,
  onNavigate
}: {
  note: MemoryNote
  focused: boolean
  onNavigate: (globalId: string) => void
}): React.ReactElement {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [body, setBody] = useState<string | null>(note.body ?? null)
  const [loadingBody, setLoadingBody] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const openInspector = useAppStore((s) => s.openInspector)

  const ensureBody = useCallback(async (): Promise<string> => {
    if (note.missing) return ''
    if (body != null) return body
    if (!window.api?.memory?.get) return ''
    setLoadingBody(true)
    try {
      const full = await window.api.memory.get(note.id)
      const text = full?.body ?? ''
      setBody(text)
      return text
    } catch {
      setBody('')
      return ''
    } finally {
      setLoadingBody(false)
    }
  }, [body, note.id, note.missing])

  const toggle = useCallback(async () => {
    const next = !expanded
    setExpanded(next)
    if (next && !note.missing) void ensureBody()
  }, [expanded, ensureBody, note.missing])

  // When this card becomes the navigation target, expand + scroll into view.
  useEffect(() => {
    if (focused) {
      setExpanded(true)
      if (!note.missing) void ensureBody()
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused])

  const showInExplorer = useCallback(() => {
    if (note.missing) return
    if (note.path) window.api?.shell.openPath(note.path)
  }, [note.missing, note.path])

  const viewRaw = useCallback(async () => {
    const text = await ensureBody()
    openInspector(note.path, text)
  }, [ensureBody, note.path, openInspector])

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-card transition-colors hover:bg-accent/5',
        focused ? 'border-primary ring-1 ring-primary' : 'border-border'
      )}
    >
      <button onClick={toggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{note.title || note.id}</span>
            <SourceBadge label={note.sourceLabel} id={note.sourceId} />
            <ImportanceBadge importance={note.importance} />
            {note.missing && <MissingBadge />}
          </div>
          {note.summary && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{note.summary}</p>}
        </div>
        {note.updatedAt && (
          <span title={note.updatedAt} className="shrink-0 text-[11px] text-muted-foreground">{formatOptionalRelativeTime(note.updatedAt)}</span>
        )}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-border px-4 py-3">
          {note.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {note.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}

          {note.links.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <Link2 className="h-3 w-3 text-muted-foreground" />
              <span className="mr-1 text-xs text-muted-foreground">{t('memory.relations', 'Related')}</span>
              {note.links.map((link) => (
                <button
                  key={link}
                  onClick={() => onNavigate(`${note.sourceId}:${link}`)}
                  className="rounded-md border border-border px-2 py-0.5 text-xs font-mono text-primary transition-colors hover:bg-accent"
                >
                  {link}
                </button>
              ))}
            </div>
          )}

          {note.missing ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t('memory.fileMissingBody', 'The indexed note file is missing on disk.')}</span>
            </div>
          ) : loadingBody ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />{t('common.loading')}</div>
          ) : body ? (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs leading-5 text-foreground">{body}</pre>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-1">
            <span title={note.path} className="truncate text-xs text-muted-foreground font-mono">{truncatePath(note.path)}</span>
            <div className="flex shrink-0 gap-2">
              {!note.missing && body !== '' && (
                <button onClick={viewRaw} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent">
                  <Eye className="h-3 w-3" />
                  {t('common.viewRaw')}
                </button>
              )}
              {!note.missing && (
                <button onClick={showInExplorer} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent">
                  <FolderOpen className="h-3 w-3" />
                  {t('instructions.showInExplorer')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SourceFilter({
  sources,
  active,
  total,
  onChange
}: {
  sources: MemorySourceStatus[]
  active: string
  total: number
  onChange: (id: string) => void
}): React.ReactElement {
  const { t } = useTranslation()
  const chip = (
    id: string,
    label: string,
    count: number,
    available = true,
    hint?: string
  ): React.ReactElement => (
    <button
      key={id}
      onClick={() => onChange(id)}
      disabled={!available && id !== 'all'}
      title={hint}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active === id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent',
        !available && id !== 'all' && 'cursor-not-allowed opacity-50'
      )}
    >
      {label}
      <span className="rounded-full bg-muted px-1.5 text-[10px]">{count}</span>
    </button>
  )
  return (
    <div className="flex flex-wrap gap-2">
      {chip('all', t('memory.allSources', 'All sources'), total)}
      {sources.map((s) =>
        chip(
          s.id,
          s.label,
          s.noteCount,
          s.available,
          // Surface the otherwise-silent source error on hover of a disabled chip.
          s.error
            ? t('memory.sourceError', { defaultValue: 'Source unavailable: {{error}}', error: s.error })
            : s.rootPath
        )
      )}
    </div>
  )
}

export function MemoryView(): React.ReactElement {
  const { t } = useTranslation()
  const { result, loading, refreshing, refresh } = useMemory()
  const [activeSource, setActiveSource] = useState('all')
  const [search, setSearch] = useState('')
  const [focusId, setFocusId] = useState<string | null>(null)

  const notes = useMemo(() => {
    const q = search.trim().toLowerCase()
    return result.notes
      .filter((n) => activeSource === 'all' || n.sourceId === activeSource)
      .filter((n) => {
        if (!q) return true
        return (
          n.title.toLowerCase().includes(q) ||
          (n.summary?.toLowerCase().includes(q) ?? false) ||
          n.tags.some((tag) => tag.toLowerCase().includes(q))
        )
      })
      .slice()
      .sort(byRecency)
  }, [result.notes, activeSource, search])

  // Distinguish the three "nothing to show" states so the empty copy is honest:
  // no sources at all / sources exist but hold no notes / this query filtered all out.
  const hasFilters = search.trim().length > 0 || activeSource !== 'all'
  const emptyKind =
    result.sources.length === 0
      ? 'noSources'
      : result.notes.length === 0
        ? 'empty'
        : 'noResults'

  const navigate = useCallback((globalId: string) => {
    // Clear filters so the target is guaranteed visible, then focus it.
    setSearch('')
    setActiveSource('all')
    setFocusId(globalId)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('common.loading')}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('memory.searchPlaceholder', 'Search memories...')}
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none ring-ring focus:ring-1"
          />
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          title={t('memory.refresh', 'Refresh')}
          aria-label={t('memory.refresh', 'Refresh')}
          className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-60"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
        </button>
      </div>

      <SourceFilter sources={result.sources} active={activeSource} total={result.notes.length} onChange={setActiveSource} />

      {notes.length === 0 ? (
        <EmptyState
          icon={Brain}
          title={t(`memory.${emptyKind}.title`, emptyFallback[emptyKind].title)}
          description={t(`memory.${emptyKind}.hint`, emptyFallback[emptyKind].hint)}
          action={emptyKind === 'noResults' && hasFilters ? (
            <button
              onClick={() => {
                setSearch('')
                setActiveSource('all')
              }}
              className="rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              {t('memory.clearFilters', 'Clear filters')}
            </button>
          ) : null}
        />
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              focused={note.id === focusId}
              onNavigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
