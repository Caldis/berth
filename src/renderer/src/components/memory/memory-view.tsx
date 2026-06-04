import { useState, useMemo, useCallback, useEffect, useRef, useDeferredValue } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Brain,
  Database,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Tag,
  Loader2,
  RefreshCw,
  Link2,
  AlertTriangle,
  Search,
  X
} from 'lucide-react'
import { cn, truncatePath, formatOptionalRelativeTime } from '@/lib/utils'
import { useMemory } from '@/hooks/use-memory'
import { useAppStore } from '@/stores/app'
import { EmptyState, PAGE_EMPTY_FILL } from '@/components/shared/empty-state'
import { usePageChrome, type PageChromeConfig } from '@/components/layout/page-chrome'
import { FileViewerButton } from '@/components/shared/file-viewer-button'
import { instructionGuideMap, type FeatureGuideEvidence } from '@/lib/feature-guidance'
import type { MemoryNote, MemorySourceStatus, MemoryImportance } from '@shared/types/memory'
import { VirtualGroupedList, type VirtualGroupedListHandle } from '@/components/shared/virtual-grouped-list'
import { CategoryJumpNav } from '@/components/shared/category-jump-nav'
import { buildJumpNavItems, type VirtualListGroup } from '@/lib/virtual-list-model'

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

const importanceLabelFallback: Record<MemoryImportance, string> = {
  core: 'Core',
  active: 'Active',
  archive: 'Archive',
  unknown: 'Unknown'
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

const FOCUS_PULSE_MS = 2000
const DETAILS_COLLAPSE_MS = 220
const WIKI_LINK_PREFIX = '#berth-memory='
const importanceOrder: MemoryImportance[] = ['core', 'active', 'archive', 'unknown']

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
      {formatImportanceLabel(t, importance)}
    </span>
  )
}

function formatImportanceLabel(t: ReturnType<typeof useTranslation>['t'], importance: MemoryImportance): string {
  return t(`memory.importanceLabel.${importance}`, importanceLabelFallback[importance])
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

function wikiHref(target: string): string {
  return `${WIKI_LINK_PREFIX}${encodeURIComponent(target)}`
}

function targetFromWikiHref(href?: string): string | null {
  if (!href?.startsWith(WIKI_LINK_PREFIX)) return null
  try {
    return decodeURIComponent(href.slice(WIKI_LINK_PREFIX.length))
  } catch {
    return null
  }
}

function linkifyWikiLinks(markdown: string): string {
  return markdown.replace(/\[\[([^\]\r\n]+?)\]\]/g, (match, raw: string) => {
    const target = raw.trim()
    return target ? `[${target}](${wikiHref(target)})` : match
  })
}

function MarkdownBody({
  body,
  sourceId,
  onNavigate
}: {
  body: string
  sourceId: string
  onNavigate: (globalId: string) => void
}): React.ReactElement {
  const markdown = useMemo(() => linkifyWikiLinks(body), [body])
  const components = useMemo<Components>(() => ({
    h1: ({ children }) => <h3 className="mt-1 text-sm font-semibold text-foreground">{children}</h3>,
    h2: ({ children }) => <h4 className="mt-3 text-sm font-semibold text-foreground">{children}</h4>,
    h3: ({ children }) => <h5 className="mt-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</h5>,
    p: ({ children }) => <p className="text-xs leading-5 text-foreground">{children}</p>,
    ul: ({ children }) => <ul className="ml-4 list-disc space-y-1 text-xs leading-5 text-foreground">{children}</ul>,
    ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1 text-xs leading-5 text-foreground">{children}</ol>,
    li: ({ children }) => <li className="pl-1">{children}</li>,
    blockquote: ({ children }) => <blockquote className="border-l border-border pl-3 text-xs text-muted-foreground">{children}</blockquote>,
    code: ({ children, className }) => (
      <code className={cn('rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground', className)}>
        {children}
      </code>
    ),
    pre: ({ children }) => <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs leading-5">{children}</pre>,
    table: ({ children }) => (
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="min-w-full border-collapse text-xs">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border-b border-border bg-muted/40 px-2 py-1 text-left font-semibold">{children}</th>,
    td: ({ children }) => <td className="border-t border-border px-2 py-1 align-top">{children}</td>,
    a: ({ href, children }) => {
      const target = targetFromWikiHref(href)
      if (target) {
        return (
          <button
            type="button"
            onClick={() => onNavigate(`${sourceId}:${target}`)}
            className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-primary transition-colors hover:bg-muted/70"
          >
            {children}
          </button>
        )
      }
      return (
        <a href={href} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
          {children}
        </a>
      )
    }
  }), [onNavigate, sourceId])

  return (
    <div className="space-y-2 rounded-md bg-muted/30 p-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
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
  const [detailsMounted, setDetailsMounted] = useState(false)
  const [body, setBody] = useState<string | null>(note.body ?? null)
  const [loadingBody, setLoadingBody] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const collapseTimerRef = useRef<number | null>(null)

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
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = null
    }
    if (next) setDetailsMounted(true)
    setExpanded(next)
    if (next && !note.missing) void ensureBody()
  }, [expanded, ensureBody, note.missing])

  useEffect(() => {
    if (expanded || !detailsMounted) return
    collapseTimerRef.current = window.setTimeout(() => {
      setDetailsMounted(false)
      collapseTimerRef.current = null
    }, DETAILS_COLLAPSE_MS)
    return () => {
      if (collapseTimerRef.current !== null) {
        window.clearTimeout(collapseTimerRef.current)
        collapseTimerRef.current = null
      }
    }
  }, [detailsMounted, expanded])

  // When this card becomes the navigation target, expand + scroll into view.
  useEffect(() => {
    if (focused) {
      if (collapseTimerRef.current !== null) {
        window.clearTimeout(collapseTimerRef.current)
        collapseTimerRef.current = null
      }
      setDetailsMounted(true)
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

  return (
    <div
      ref={ref}
      data-testid={`memory-note-card-${note.id}`}
      className={cn(
        'rounded-lg border bg-card transition-colors hover:bg-accent/5',
        focused ? 'border-primary ring-1 ring-primary motion-safe:animate-pulse' : 'border-border'
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

      <div
        data-testid={`memory-note-details-${note.id}`}
        aria-hidden={!expanded}
        inert={!expanded}
        className={cn(
          'grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {detailsMounted && (
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
                      className="rounded-md border border-border px-2 py-0.5 text-xs font-mono text-primary transition-colors hover:bg-muted/70"
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
                <div className="max-h-80 overflow-auto">
                  <MarkdownBody body={body} sourceId={note.sourceId} onNavigate={onNavigate} />
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2 pt-1">
                <span title={note.path} className="truncate text-xs text-muted-foreground font-mono">{truncatePath(note.path)}</span>
                <div className="flex shrink-0 gap-2">
                  {!note.missing && body !== '' && (
                    <FileViewerButton path={note.path} loadContent={ensureBody} />
                  )}
                  {!note.missing && (
                    <button onClick={showInExplorer} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70">
                      <FolderOpen className="h-3 w-3" />
                      {t('instructions.showInExplorer')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
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
        active === id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/70',
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

function FilterGroup({
  label,
  allLabel,
  active,
  options,
  onChange
}: {
  label: string
  allLabel: string
  active: string
  options: Array<{ id: string; label: string; count: number }>
  onChange: (id: string) => void
}): React.ReactElement | null {
  if (options.length === 0) return null
  const chip = (id: string, chipLabel: string, count?: number): React.ReactElement => (
    <button
      key={id}
      type="button"
      aria-pressed={active === id}
      onClick={() => onChange(id)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active === id ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:bg-muted/70'
      )}
    >
      {chipLabel}
      {count != null && <span className={cn('rounded-full px-1.5 text-[10px]', active === id ? 'bg-background/15' : 'bg-muted')}>{count}</span>}
    </button>
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">{label}</span>
      {chip('all', allLabel)}
      {options.map((option) => chip(option.id, option.label, option.count))}
    </div>
  )
}

// Tags are the density hot spot (60-100+ in real use). A always-on chip wall
// devours the page, so the browse grid is collapsed by default (progressive
// disclosure): the resting state is just a search box plus the current
// selection. Search is the fast path for "find one tag"; the grid is the
// opt-in "browse everything" path that expands in place (no floating overlay,
// no hover). Selections surface as removable pills so active filters stay
// visible — and AND together, each one narrowing the result.
function TagFilter({
  label,
  summaryLabel,
  searchPlaceholder,
  emptyText,
  selected,
  options,
  onToggle,
  testId
}: {
  label: string
  summaryLabel: string
  searchPlaceholder: string
  emptyText: string
  selected: string[]
  options: Array<{ id: string; label: string; count: number }>
  onToggle: (id: string) => void
  testId?: string
}): React.ReactElement | null {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const q = query.trim().toLowerCase()
  // Typing always reveals matches; the toggle reveals the full browse grid.
  const showGrid = open || q !== ''

  // Collapse back to the resting state when the user clicks away, so the grid
  // only occupies space while it is actively in use.
  useEffect(() => {
    if (!showGrid) return
    const handlePointerDown = (event: PointerEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [showGrid])

  if (options.length === 0) return null

  const selectedSet = new Set(selected)
  const selectedOptions = options.filter((option) => selectedSet.has(option.id))
  const visible = options.filter((option) => q === '' || option.label.toLowerCase().includes(q))
  const hasSelection = selected.length > 0

  return (
    <div ref={containerRef} data-testid={testId} className="flex items-start gap-2">
      <span className="w-16 shrink-0 pt-2 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search aria-hidden="true" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setOpen(true)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              data-testid={testId ? `${testId}-search` : undefined}
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs outline-none ring-ring focus:ring-1"
            />
          </div>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={showGrid}
            data-testid={testId ? `${testId}-toggle` : undefined}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors',
              hasSelection ? 'border-foreground bg-foreground text-background' : 'border-input text-muted-foreground hover:bg-muted/70'
            )}
          >
            {summaryLabel}
            <ChevronDown aria-hidden="true" className={cn('h-3.5 w-3.5 transition-transform duration-200', showGrid && 'rotate-180')} />
          </button>
        </div>

        {hasSelection && (
          <div data-testid={testId ? `${testId}-selected` : undefined} className="flex flex-wrap gap-1.5">
            {selectedOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggle(option.id)}
                className="inline-flex items-center gap-1 rounded-full border border-foreground bg-foreground py-0.5 pl-2.5 pr-1.5 text-[11px] font-medium text-background transition-opacity hover:opacity-80"
              >
                {option.label}
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        <div
          aria-hidden={!showGrid}
          inert={!showGrid}
          data-testid={testId ? `${testId}-grid` : undefined}
          className={cn(
            'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
            showGrid ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          <div className="overflow-hidden">
            <div
              data-testid={testId ? `${testId}-panel` : undefined}
              className="max-h-[12rem] overflow-y-auto rounded-md border border-border bg-muted/20 p-2"
            >
              <div className="flex flex-wrap gap-2">
                {visible.map((option) => {
                  const isActive = selectedSet.has(option.id)
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => onToggle(option.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        isActive ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:bg-muted/70'
                      )}
                    >
                      {option.label}
                      <span className={cn('rounded-full px-1.5 text-[10px]', isActive ? 'bg-background/15' : 'bg-muted')}>{option.count}</span>
                    </button>
                  )
                })}
              </div>
              {visible.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">{emptyText}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function countBy<T extends string>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

function buildMemoryGroups(notes: readonly MemoryNote[]): VirtualListGroup<MemoryNote>[] {
  const groups = new Map<string, VirtualListGroup<MemoryNote>>()

  for (const note of notes) {
    const groupId = `source:${note.sourceId}`
    const existing = groups.get(groupId)
    if (existing) {
      existing.items = [...existing.items, note]
      existing.count = existing.items.length
    } else {
      groups.set(groupId, {
        id: groupId,
        label: note.sourceLabel,
        count: 1,
        items: [note],
        meta: { sourceId: note.sourceId }
      })
    }
  }

  return [...groups.values()]
}

export function MemoryView(): React.ReactElement {
  const { t } = useTranslation()
  const { result, loading, refreshing, refresh } = useMemory()
  const agentView = useAppStore((s) => s.agentView)
  const [activeSource, setActiveSource] = useState('all')
  const [search, setSearch] = useState('')
  const [importanceFilter, setImportanceFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [focusId, setFocusId] = useState<string | null>(null)
  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(undefined)
  const deferredSearch = useDeferredValue(search)
  const focusTimerRef = useRef<number | null>(null)
  const listRef = useRef<VirtualGroupedListHandle | null>(null)

  const importanceOptions = useMemo(() => {
    const counts = countBy(result.notes.map((note) => note.importance))
    return importanceOrder
      .filter((importance) => counts.has(importance))
      .map((importance) => ({ id: importance, label: formatImportanceLabel(t, importance), count: counts.get(importance) ?? 0 }))
  }, [result.notes, t])

  const tagOptions = useMemo(() => {
    const counts = countBy(result.notes.flatMap((note) => note.tags))
    return [...counts.entries()]
      .map(([tag, count]) => ({ id: tag, label: tag, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  }, [result.notes])

  const notes = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return result.notes
      .filter((n) => activeSource === 'all' || n.sourceId === activeSource)
      .filter((n) => importanceFilter === 'all' || n.importance === importanceFilter)
      .filter((n) => tagFilter.length === 0 || tagFilter.every((tag) => n.tags.includes(tag)))
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
  }, [result.notes, activeSource, importanceFilter, tagFilter, deferredSearch])

  const memoryGroups = useMemo(() => buildMemoryGroups(notes), [notes])
  const jumpItems = useMemo(() => buildJumpNavItems(memoryGroups), [memoryGroups])

  useEffect(() => {
    setActiveGroupId((current) => {
      if (current && memoryGroups.some((group) => group.id === current)) return current
      return memoryGroups[0]?.id
    })
  }, [memoryGroups])

  const handleJumpSelect = useCallback((groupId: string) => {
    setActiveGroupId(groupId)
    listRef.current?.scrollToGroup(groupId)
  }, [])

  // Distinguish the three "nothing to show" states so the empty copy is honest:
  // no sources at all / sources exist but hold no notes / this query filtered all out.
  const hasFilters = search.trim().length > 0 || activeSource !== 'all' || importanceFilter !== 'all' || tagFilter.length > 0
  const emptyKind =
    result.sources.length === 0
      ? 'noSources'
      : result.notes.length === 0
        ? 'empty'
        : 'noResults'
  const evidence = useMemo<FeatureGuideEvidence[]>(() => {
    const availableSources = result.sources.filter((source) => source.available).length
    return [
      { labelKey: 'memory.evidence.notes', value: result.notes.length },
      { labelKey: 'memory.evidence.sources', value: result.sources.length },
      { labelKey: 'memory.evidence.availableSources', value: availableSources }
    ]
  }, [result.notes.length, result.sources])
  const pageChromeActions = useMemo<React.ReactNode>(() => (
    <button
      onClick={refresh}
      disabled={refreshing}
      title={t('memory.refresh', 'Refresh')}
      aria-label={t('memory.refresh', 'Refresh')}
      className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
    >
      <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
    </button>
  ), [refresh, refreshing, t])
  const pageChrome = useMemo<PageChromeConfig>(() => ({
    title: t('instructions.tabs.memories'),
    sectionLabelKey: 'nav.sections.instructions',
    search: {
      value: search,
      onValueChange: setSearch,
      placeholder: t('memory.searchPlaceholder', 'Search memories...'),
      ariaLabel: t('memory.searchPlaceholder', 'Search memories...')
    },
    guide: {
      definition: instructionGuideMap.memories,
      evidence,
      agentView
    },
    actions: pageChromeActions
  }), [agentView, evidence, pageChromeActions, search, t])
  usePageChrome(pageChrome, [pageChrome])

  const clearFilters = useCallback(() => {
    setSearch('')
    setActiveSource('all')
    setImportanceFilter('all')
    setTagFilter([])
  }, [])

  const toggleTag = useCallback((id: string) => {
    setTagFilter((current) => (current.includes(id) ? current.filter((tag) => tag !== id) : [...current, id]))
  }, [])

  const navigate = useCallback((globalId: string) => {
    // Clear filters so the target is guaranteed visible, then focus it.
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current)
      focusTimerRef.current = null
    }
    clearFilters()
    setFocusId(globalId)
    window.setTimeout(() => {
      listRef.current?.scrollToItem(globalId, 'center')
    }, 0)
    focusTimerRef.current = window.setTimeout(() => {
      setFocusId((current) => (current === globalId ? null : current))
      focusTimerRef.current = null
    }, FOCUS_PULSE_MS)
  }, [clearFilters])

  useEffect(() => {
    return () => {
      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current)
      }
    }
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
      <SourceFilter sources={result.sources} active={activeSource} total={result.notes.length} onChange={setActiveSource} />
      <div className="space-y-2">
        <FilterGroup
          label={t('memory.importance', 'Importance')}
          allLabel={t('memory.allImportance', 'All importance')}
          active={importanceFilter}
          options={importanceOptions}
          onChange={setImportanceFilter}
        />
        <TagFilter
          label={t('memory.tags', 'Tags')}
          summaryLabel={tagFilter.length === 0 ? t('memory.allTags', 'All tags') : t('memory.tagsSelected', { count: tagFilter.length })}
          searchPlaceholder={t('memory.tagSearchPlaceholder', 'Filter tags…')}
          emptyText={t('memory.noMatchingTags', 'No matching tags')}
          selected={tagFilter}
          options={tagOptions}
          onToggle={toggleTag}
          testId="memory-tags-filter"
        />
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
          >
            {t('memory.clearFilters', 'Clear filters')}
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <div className={cn('flex flex-col', PAGE_EMPTY_FILL)}>
          <EmptyState
            fullHeight
            icon={Brain}
            title={t(`memory.${emptyKind}.title`, emptyFallback[emptyKind].title)}
            description={t(`memory.${emptyKind}.hint`, emptyFallback[emptyKind].hint)}
            action={null}
          />
        </div>
      ) : (
        <div className="flex min-h-[520px] gap-4 max-lg:flex-col">
          <CategoryJumpNav
            items={jumpItems}
            activeId={activeGroupId}
            onSelect={handleJumpSelect}
            label={t('memory.groupNavigation', 'Memory groups')}
            testId="memory-category-jump-nav"
          />
          <VirtualGroupedList<MemoryNote>
            ref={listRef}
            groups={memoryGroups}
            getItemKey={(note) => note.id}
            onActiveGroupChange={(groupId) => setActiveGroupId(groupId)}
            renderGroup={(group) => {
              const sourceId = typeof group.meta?.sourceId === 'string' ? group.meta.sourceId : ''
              const Icon = sourceIcon(sourceId)
              return (
                <div className="flex items-center gap-2 px-1 py-2">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">{group.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{group.count}</span>
                </div>
              )
            }}
            renderItem={(note) => (
              <div className="pb-2">
                <NoteCard
                  note={note}
                  focused={note.id === focusId}
                  onNavigate={navigate}
                />
              </div>
            )}
            className="min-w-0 flex-1"
            listClassName="min-h-[520px]"
            defaultItemHeight={96}
            testId="memory-virtual-list"
          />
        </div>
      )}
    </div>
  )
}
