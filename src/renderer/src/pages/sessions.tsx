import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  Clock,
  Coins,
  Hash,
  FolderOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatOptionalCurrency,
  formatOptionalDuration,
  formatOptionalRelativeTime,
  truncatePath
} from '@/lib/utils'
import { useSessions } from '@/hooks/use-ipc'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { useAppStore } from '@/stores/app'
import { TokenUsageDisplay } from '@/components/shared/token-usage-display'
import { sessionGuide, type FeatureGuideEvidence } from '@/lib/feature-guidance'
import { projectPathForScope } from '@shared/scope'
import { usePageChrome, type PageChromeConfig } from '@/components/layout/page-chrome'
import { VirtualGroupedList, type VirtualGroupedListHandle } from '@/components/shared/virtual-grouped-list'
import { CategoryJumpNav } from '@/components/shared/category-jump-nav'
import { buildJumpNavItems, type VirtualListGroup } from '@/lib/virtual-list-model'
import type { SessionSummary } from '@shared/types/asset'

type GroupBy = 'project' | 'date'

function getDateGroupKey(dateStr: string | null, unknownLabel: string): string {
  if (!dateStr) return unknownLabel
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return unknownLabel
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function Sessions(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const agentView = useAppStore((s) => s.agentView)
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const { sessions, loading, stale } = useSessions({ agentView, projectPath })

  const [filter, setFilter] = useState('')
  const deferredFilter = useDeferredValue(filter)
  const [groupBy, setGroupBy] = useState<GroupBy>('project')
  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(undefined)
  const listRef = useRef<VirtualGroupedListHandle | null>(null)

  const filtered = useMemo(() => {
    if (!deferredFilter.trim()) return sessions
    const q = deferredFilter.toLowerCase()
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.project.toLowerCase().includes(q) ||
        s.projectPath.toLowerCase().includes(q) ||
        s.model.toLowerCase().includes(q)
    )
  }, [sessions, deferredFilter])
  const sessionGroups = useMemo(
    () => buildSessionGroups(filtered, groupBy, t('common.unknown')),
    [filtered, groupBy, t]
  )
  const jumpItems = useMemo(() => buildJumpNavItems(sessionGroups), [sessionGroups])

  useEffect(() => {
    setActiveGroupId((current) => {
      if (current && sessionGroups.some((group) => group.id === current)) return current
      return sessionGroups[0]?.id
    })
  }, [sessionGroups])

  const handleJumpSelect = useCallback((groupId: string) => {
    setActiveGroupId(groupId)
    listRef.current?.scrollToGroup(groupId)
  }, [])

  const evidence = useMemo<FeatureGuideEvidence[]>(() => {
    const projects = new Set(sessions.map((session) => session.projectPath || session.project).filter(Boolean))
    const agents = new Set(sessions.map((session) => session.agentId).filter(Boolean))
    return [
      { labelKey: 'sessions.evidence.sessions', value: sessions.length },
      { labelKey: 'sessions.evidence.projects', value: projects.size },
      { labelKey: 'sessions.evidence.agents', value: agents.size }
    ]
  }, [sessions])

  const hasFilter = filter.trim().length > 0
  const showInitialLoading = loading && sessions.length === 0
  const toolbarStatus = useMemo(() => {
    if (loading && stale && sessions.length > 0) {
      return {
        ariaLabel: t('sessions.refreshing'),
        label: t('sessions.refreshing')
      }
    }
    return null
  }, [loading, sessions.length, stale, t])
  const pageChromeActions = useMemo<React.ReactNode>(() => (
    <>
      <div
        data-testid="sessions-toolbar-status-slot"
        className="hidden h-9 w-56 shrink-0 items-center justify-end md:flex"
        aria-live="polite"
      >
        {toolbarStatus && (
          <div
            role="status"
            aria-label={toolbarStatus.ariaLabel}
            className="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary motion-safe:animate-pulse" aria-hidden="true" />
            <span className="truncate">{toolbarStatus.label}</span>
          </div>
        )}
      </div>
      <div className="flex h-9 items-center gap-2">
        <span className="text-xs text-muted-foreground">{t('sessions.groupBy')}</span>
        <div className="flex rounded-md border border-input">
          <button
            onClick={() => setGroupBy('project')}
            className={cn(
              'px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
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
              'px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              groupBy === 'date'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('sessions.date')}
          </button>
        </div>
      </div>
    </>
  ), [groupBy, t, toolbarStatus])
  const pageChrome = useMemo<PageChromeConfig>(() => ({
    title: t('sessions.title'),
    sectionLabelKey: 'nav.sections.work',
    search: {
      value: filter,
      onValueChange: setFilter,
      placeholder: t('sessions.filter'),
      ariaLabel: t('sessions.filter')
    },
    guide: {
      definition: sessionGuide,
      evidence,
      agentView
    },
    actions: pageChromeActions
  }), [agentView, evidence, filter, pageChromeActions, t])
  usePageChrome(pageChrome, [pageChrome])

  return (
    <div className="space-y-6">
      {showInitialLoading ? (
        <LoadingState
          icon={MessageSquare}
          title={t('sessions.loadingList')}
          description={t('sessions.loadingListDescription')}
          rows={5}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={t(hasFilter ? 'sessions.empty.noResultsTitle' : 'sessions.empty.title')}
          description={t(hasFilter ? 'sessions.empty.noResultsDescription' : 'sessions.empty.description')}
        />
      ) : (
        <div className="flex min-h-[520px] gap-4 max-lg:flex-col">
          <CategoryJumpNav
            items={jumpItems}
            activeId={activeGroupId}
            onSelect={handleJumpSelect}
            label={t('sessions.groupNavigation')}
            testId="sessions-category-jump-nav"
          />
          <VirtualGroupedList<SessionSummary>
            ref={listRef}
            groups={sessionGroups}
            getItemKey={(session) => session.id}
            onActiveGroupChange={setActiveGroupId}
            renderGroup={(group) => (
              <div className="flex items-center gap-2 rounded-t-lg border border-border bg-card px-4 py-2.5">
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate text-sm font-medium text-card-foreground">{group.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">{group.count}</span>
              </div>
            )}
            renderItem={(session) => (
              <SessionRow
                session={session}
                agentView={agentView}
                unknownLabel={t('common.unknown')}
                fallbackTitle={t('sessions.fallbackTitle', { id: session.id.slice(0, 8) })}
                onOpen={() => navigate(`/sessions/${session.id}`)}
              />
            )}
            className="min-w-0 flex-1"
            listClassName="rounded-lg border border-border bg-card"
            defaultItemHeight={72}
            testId="sessions-virtual-list"
          />
        </div>
      )}
    </div>
  )
}

function buildSessionGroups(
  sessions: readonly SessionSummary[],
  groupBy: GroupBy,
  unknownLabel: string
): VirtualListGroup<SessionSummary>[] {
  const groups = new Map<string, VirtualListGroup<SessionSummary>>()

  for (const session of sessions) {
    const rawGroup =
      groupBy === 'project'
        ? session.projectPath || session.project || unknownLabel
        : getDateGroupKey(session.startedAt, unknownLabel)
    const groupId = `${groupBy}:${rawGroup}`
    const label = groupBy === 'project' ? truncatePath(rawGroup, 72) : rawGroup
    const existing = groups.get(groupId)

    if (existing) {
      existing.items = [...existing.items, session]
      existing.count = existing.items.length
    } else {
      groups.set(groupId, {
        id: groupId,
        label,
        count: 1,
        items: [session]
      })
    }
  }

  return [...groups.values()]
}

interface SessionRowProps {
  session: SessionSummary
  agentView: 'all' | SessionSummary['agentId']
  unknownLabel: string
  fallbackTitle: string
  onOpen: () => void
}

function SessionRow({
  session,
  agentView,
  unknownLabel,
  fallbackTitle,
  onOpen
}: SessionRowProps): React.ReactElement {
  return (
    <button
      type="button"
      data-testid={`session-row-${session.id}`}
      onClick={onOpen}
      className="flex w-full items-center gap-4 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-card-foreground">
          {session.title || fallbackTitle}
        </p>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatOptionalRelativeTime(session.startedAt)}
          </span>
          <span>{formatOptionalDuration(session.duration)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
        {agentView === 'all' && (
          <span className="inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {session.agentId === 'codex' ? 'Codex' : 'Claude'}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Coins className="h-3 w-3" />
          {formatOptionalCurrency(session.cost)}
        </span>
        <span className="flex items-center gap-1">
          <Hash className="h-3 w-3" />
          <TokenUsageDisplay usage={session.tokenUsage} />
        </span>
        <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          {session.model || unknownLabel}
        </span>
      </div>
    </button>
  )
}
