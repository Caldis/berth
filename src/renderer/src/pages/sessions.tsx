import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Clock, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSessions } from '@/hooks/use-ipc'
import { EmptyState, PAGE_EMPTY_FILL } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { LoadingState } from '@/components/shared/loading-state'
import { useAppStore } from '@/stores/app'
import { SessionRow } from '@/components/sessions/session-row'
import { SessionFilterBar } from '@/components/sessions/session-filter-bar'
import { sessionGuide, type FeatureGuideEvidence } from '@/lib/feature-guidance'
import { projectPathForScope } from '@shared/scope'
import { usePageChrome, type PageChromeConfig } from '@/components/layout/page-chrome'
import { VirtualGroupedList, type VirtualGroupedListHandle } from '@/components/shared/virtual-grouped-list'
import { CategoryJumpNav } from '@/components/sessions/category-jump-nav'
import { buildJumpNavItems, type VirtualListGroup } from '@/lib/virtual-list-model'
import { buildSessionProjectGroups } from '@/lib/session-location-groups'
import {
  SESSION_DATE_BUCKET_ORDER,
  applySessionFilters,
  sessionAgentCounts,
  sessionDateBucket,
  sessionModelOptions,
  sortSessions,
  type SessionAgentFilter,
  type SessionGroupBy,
  type SessionSortBy
} from '@/lib/session-list-filters'
import type { SessionSummary } from '@shared/types/asset'

export function Sessions(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const agentView = useAppStore((s) => s.agentView)
  const { sessions, loading, stale, error, reload } = useSessions({ projectPath, agentView })

  const [filter, setFilter] = useState('')
  const deferredFilter = useDeferredValue(filter)
  const [groupBy, setGroupBy] = useState<SessionGroupBy>('project')
  const [agentFilter, setAgentFilter] = useState<SessionAgentFilter>('all')
  const [modelFilter, setModelFilter] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<SessionSortBy>('recent')
  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(undefined)
  const listRef = useRef<VirtualGroupedListHandle | null>(null)

  // 过滤管线: 文本 → agent/model 结构化筛选 → 排序 → 分组
  const textFiltered = useMemo(() => {
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
  const filtered = useMemo(
    () => applySessionFilters(textFiltered, { agent: agentFilter, models: modelFilter }),
    [agentFilter, modelFilter, textFiltered]
  )
  const sorted = useMemo(() => sortSessions(filtered, sortBy), [filtered, sortBy])
  const agentCounts = useMemo(() => sessionAgentCounts(textFiltered), [textFiltered])
  const modelOptions = useMemo(() => sessionModelOptions(sessions), [sessions])

  const sessionGroups = useMemo(
    () =>
      buildSessionGroups(sorted, groupBy, {
        root: t('sessions.location.root'),
        unknown: t('common.unknown'),
        bucket: (bucket) => t(`sessions.dateBuckets.${bucket}`)
      }, projectPath),
    [sorted, groupBy, projectPath, t]
  )
  const jumpItems = useMemo(
    () => (groupBy === 'none' ? [] : buildJumpNavItems(sessionGroups)),
    [groupBy, sessionGroups]
  )

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

  const hasAnyFilter = filter.trim().length > 0 || agentFilter !== 'all' || modelFilter.size > 0
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
  ), [toolbarStatus])
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
      evidence
    },
    actions: pageChromeActions
  }), [evidence, filter, pageChromeActions, t])
  usePageChrome(pageChrome, [pageChrome])

  return (
    <div className="space-y-4">
      {showInitialLoading ? (
        <LoadingState
          icon={MessageSquare}
          title={t('sessions.loadingList')}
          description={t('sessions.loadingListDescription')}
          rows={5}
        />
      ) : error && sessions.length === 0 ? (
        <div className={cn('flex flex-col', PAGE_EMPTY_FILL)}>
          <ErrorState
            fullHeight
            title={t('sessions.errorTitle')}
            description={t('sessions.errorDescription')}
            onRetry={reload}
          />
        </div>
      ) : sessions.length === 0 ? (
        <div className={cn('flex flex-col', PAGE_EMPTY_FILL)}>
          <EmptyState
            fullHeight
            icon={MessageSquare}
            title={t('sessions.empty.title')}
            description={t('sessions.empty.description')}
          />
        </div>
      ) : (
        <>
          <SessionFilterBar
            agentFilter={agentFilter}
            onAgentFilterChange={setAgentFilter}
            agentCounts={agentCounts}
            modelOptions={modelOptions}
            modelFilter={modelFilter}
            onModelFilterChange={setModelFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            shownCount={sorted.length}
            totalCount={sessions.length}
          />
          {sorted.length === 0 ? (
            <div className={cn('flex flex-col', PAGE_EMPTY_FILL)}>
              <EmptyState
                fullHeight
                icon={MessageSquare}
                title={t(hasAnyFilter ? 'sessions.empty.noResultsTitle' : 'sessions.empty.title')}
                description={t(hasAnyFilter ? 'sessions.empty.noResultsDescription' : 'sessions.empty.description')}
              />
            </div>
          ) : (
            <div className="flex min-h-[520px] gap-4 max-lg:flex-col">
              {groupBy !== 'none' && (
                <CategoryJumpNav
                  items={jumpItems}
                  activeId={activeGroupId}
                  onSelect={handleJumpSelect}
                  label={t('sessions.groupNavigation')}
                  testId="sessions-category-jump-nav"
                />
              )}
              <VirtualGroupedList<SessionSummary>
                ref={listRef}
                groups={sessionGroups}
                getItemKey={(session) => session.id}
                onActiveGroupChange={setActiveGroupId}
                renderGroup={(group) => {
                  if (groupBy === 'none') {
                    // 平铺模式: 无组头, 仅保留与分组模式一致的顶部留白带
                    return <div className="h-3 bg-background" aria-hidden="true" />
                  }
                  const groupTitle = typeof group.meta?.pathTitle === 'string' ? group.meta.pathTitle : group.label
                  const parentLabel = typeof group.meta?.parentLabel === 'string' ? group.meta.parentLabel : ''
                  const GroupIcon = groupBy === 'project' ? FolderOpen : Clock
                  return (
                    <div
                      title={groupTitle}
                      // Gutter offset lives in the header's own top PADDING (not margin): when the
                      // header is sticky-pinned, its opaque bg fills the gutter band above the label so
                      // absolutely-positioned virtuoso rows can't bleed into it. Same offset in flow + stuck.
                      className="flex items-center gap-2 border-b border-border bg-background px-4 pb-2 pt-6"
                    >
                      <GroupIcon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {group.label}
                        </span>
                        {parentLabel && (
                          <span className="truncate text-[10px] leading-tight text-muted-foreground">{parentLabel}</span>
                        )}
                      </span>
                      <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{group.count}</span>
                    </div>
                  )
                }}
                renderItem={(session) => (
                  <SessionRow
                    session={session}
                    unknownLabel={t('common.unknown')}
                    skillsLabel={t('sessions.skillsUsed')}
                    mcpLabel={t('sessions.mcpConnected')}
                    fallbackTitle={t('sessions.fallbackTitle', { id: session.id.slice(0, 8) })}
                    showProject={groupBy !== 'project'}
                    onOpen={() => navigate(`/sessions/${session.id}`)}
                  />
                )}
                className="min-w-0 flex-1"
                listClassName="bg-transparent"
                defaultItemHeight={64}
                testId="sessions-virtual-list"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function buildSessionGroups(
  sessions: readonly SessionSummary[],
  groupBy: SessionGroupBy,
  labels: { root: string; unknown: string; bucket: (bucket: string) => string },
  currentProjectPath?: string | null
): VirtualListGroup<SessionSummary>[] {
  if (groupBy === 'project') {
    return buildSessionProjectGroups(sessions, {
      labels: { root: labels.root, unknown: labels.unknown },
      currentProjectPath
    })
  }

  if (groupBy === 'none') {
    if (sessions.length === 0) return []
    return [
      {
        id: 'none:all',
        label: '',
        count: sessions.length,
        items: [...sessions]
      }
    ]
  }

  const now = new Date()
  const groups = new Map<string, VirtualListGroup<SessionSummary>>()
  for (const session of sessions) {
    const bucket = sessionDateBucket(session.startedAt, now)
    const groupId = `date:${bucket}`
    const existing = groups.get(groupId)
    if (existing) {
      existing.items = [...existing.items, session]
      existing.count = existing.items.length
    } else {
      groups.set(groupId, {
        id: groupId,
        label: labels.bucket(bucket),
        count: 1,
        items: [session]
      })
    }
  }
  return SESSION_DATE_BUCKET_ORDER
    .map((bucket) => groups.get(`date:${bucket}`))
    .filter((group): group is VirtualListGroup<SessionSummary> => group != null)
}
