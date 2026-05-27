import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Hash,
  FolderOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatRelativeTime, formatNumber } from '@/lib/utils'
import { useSessions } from '@/hooks/use-ipc'
import { EmptyState } from '@/components/shared/empty-state'

type GroupBy = 'project' | 'date'

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const min = Math.floor(seconds / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  const remainMin = min % 60
  return remainMin > 0 ? `${hr}h ${remainMin}m` : `${hr}h`
}

function getDateGroupKey(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function Sessions(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { sessions, loading } = useSessions()

  const [filter, setFilter] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('project')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    if (!filter.trim()) return sessions
    const q = filter.toLowerCase()
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.project.toLowerCase().includes(q) ||
        s.model.toLowerCase().includes(q)
    )
  }, [sessions, filter])

  const grouped = useMemo(() => {
    const result: Record<string, typeof filtered> = {}
    for (const s of filtered) {
      const key = groupBy === 'project' ? (s.project || 'Unknown') : getDateGroupKey(s.startedAt)
      ;(result[key] ??= []).push(s)
    }
    return result
  }, [filtered, groupBy])

  const toggleGroup = (key: string): void => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('sessions.title')}</h1>

      {/* Filter + group-by */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('sessions.filter')}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus:ring-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('sessions.groupBy')}</span>
          <div className="flex rounded-md border border-input">
            <button
              onClick={() => setGroupBy('project')}
              className={cn(
                'px-2.5 py-1 text-xs transition-colors',
                groupBy === 'project'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('sessions.project')}
            </button>
            <button
              onClick={() => setGroupBy('date')}
              className={cn(
                'px-2.5 py-1 text-xs transition-colors',
                groupBy === 'date'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('sessions.date')}
            </button>
          </div>
        </div>
      </div>

      {/* Session list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} message={t('sessions.noSessions')} />
      ) : (
        <div className="space-y-2">
          {Object.entries(grouped).map(([groupKey, groupSessions]) => {
            const collapsed = collapsedGroups.has(groupKey)
            return (
              <div key={groupKey} className="overflow-hidden rounded-xl border border-border bg-card">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-accent/5"
                >
                  {collapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium text-card-foreground">{groupKey}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {groupSessions.length}
                  </span>
                </button>

                {/* Session rows */}
                {!collapsed && (
                  <div className="divide-y divide-border border-t border-border">
                    {groupSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => navigate(`/sessions/${session.id}`)}
                        className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-card-foreground">
                            {session.title || `Session #${session.id.slice(0, 8)}`}
                          </p>
                          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(new Date(session.startedAt))}
                            </span>
                            <span>{formatDuration(session.duration)}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Coins className="h-3 w-3" />
                            {formatCurrency(session.cost)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {formatNumber(session.tokens)}
                          </span>
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {session.model}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
