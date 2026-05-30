import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Brain, Database, ChevronDown, ChevronRight, FolderOpen, Tag, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { truncatePath } from '@/lib/utils'
import { useMemory } from '@/hooks/use-memory'
import type { MemoryNote, MemorySourceStatus, MemoryImportance } from '@shared/types/memory'

const importanceColors: Record<MemoryImportance, string> = {
  core: 'bg-red-500/10 text-red-600 dark:text-red-400',
  active: 'bg-green-500/10 text-green-600 dark:text-green-400',
  archive: 'bg-muted text-muted-foreground',
  unknown: 'bg-muted text-muted-foreground'
}

function sourceIcon(id: string): React.ComponentType<{ className?: string }> {
  return id === 'united-memory' ? Database : Brain
}

function ImportanceBadge({ importance }: { importance: MemoryImportance }): React.ReactElement {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', importanceColors[importance] ?? importanceColors.unknown)}>
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

function NoteCard({ note }: { note: MemoryNote }): React.ReactElement {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [body, setBody] = useState<string | null>(note.body ?? null)
  const [loadingBody, setLoadingBody] = useState(false)

  const toggle = useCallback(async () => {
    const next = !expanded
    setExpanded(next)
    if (next && body == null && window.api?.memory?.get) {
      setLoadingBody(true)
      try {
        const full = await window.api.memory.get(note.id)
        setBody(full?.body ?? '')
      } catch {
        setBody('')
      } finally {
        setLoadingBody(false)
      }
    }
  }, [expanded, body, note.id])

  const showInExplorer = useCallback(() => {
    if (note.path) window.api?.shell.openPath(note.path)
  }, [note.path])

  return (
    <div className="rounded-lg border border-border bg-card transition-colors hover:bg-accent/5">
      <button onClick={toggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{note.title || note.id}</span>
            <SourceBadge label={note.sourceLabel} id={note.sourceId} />
            <ImportanceBadge importance={note.importance} />
          </div>
          {note.summary && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{note.summary}</p>}
        </div>
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
          {loadingBody ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />{t('common.loading')}</div>
          ) : body ? (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs text-foreground">{body}</pre>
          ) : null}
          {note.path && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="truncate text-xs text-muted-foreground font-mono">{truncatePath(note.path)}</span>
              <button onClick={showInExplorer} className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent">
                <FolderOpen className="h-3 w-3" />
                {t('instructions.showInExplorer')}
              </button>
            </div>
          )}
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
  const chip = (id: string, label: string, count: number, available = true): React.ReactElement => (
    <button
      key={id}
      onClick={() => onChange(id)}
      disabled={!available && id !== 'all'}
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
      {chip('all', t('memory.allSources'), total)}
      {sources.map((s) => chip(s.id, s.label, s.noteCount, s.available))}
    </div>
  )
}

export function MemoryView(): React.ReactElement {
  const { t } = useTranslation()
  const { result, loading } = useMemory()
  const [activeSource, setActiveSource] = useState('all')

  const notes = useMemo(() => {
    if (activeSource === 'all') return result.notes
    return result.notes.filter((n) => n.sourceId === activeSource)
  }, [result.notes, activeSource])

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
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Brain className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t('memory.empty')}</p>
          {result.sources.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground/70">{t('memory.noSources')}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => <NoteCard key={note.id} note={note} />)}
        </div>
      )}
    </div>
  )
}
