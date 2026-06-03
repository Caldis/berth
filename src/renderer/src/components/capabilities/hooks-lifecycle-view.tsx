import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  CircleAlert,
  CircleSlash,
  Check,
  Copy,
  ExternalLink,
  FileCode2,
  FolderOpen,
  Info,
  RotateCcw,
  Trash2,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScopeBadge } from '@/components/shared/scope-badge'
import { useHealthChecks } from '@/hooks/use-ipc'
import {
  getHookManagementState,
  getHookRiskHints,
  getVisibleStageSupport,
  groupHookAssetsByStage,
  type HookSchemaMap,
  type HookAgentStageSupport,
  type HookLifecycleSupport,
  type HookManagementAction,
  type HookManagementState,
  type HookRiskHint,
  type HookStageGroup
} from '@/lib/hook-lifecycle'
import { localizeHealthCheck, localizeHealthCheckScope } from '@/lib/health-check-i18n'
import type { AgentView, Asset, AssetScope } from '@shared/types/asset'
import type {
  AgentCapabilityPlugin,
  AgentCapabilityPluginHookHandlerDescriptor,
  AgentCapabilityPluginHookHandlerFieldDescriptor,
  AgentPluginAgentId
} from '@shared/types/agent-plugin'
import type { HealthCheck, HookRecoveryIssue, HookRecoveryListResult, HookRecoveryPoint, HooksAgentId } from '@shared/types/ipc'

interface HooksLifecycleViewProps {
  assets: Asset[]
  agentView: AgentView
  search: string
  scope: 'all' | AssetScope
  plugins?: AgentCapabilityPlugin[]
}

const supportIconMap = {
  supported: CheckCircle2,
  partial: CircleAlert,
  unsupported: CircleSlash
} satisfies Record<HookLifecycleSupport, React.ComponentType<{ className?: string }>>

const supportClassMap = {
  supported: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  partial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  unsupported: 'bg-muted text-muted-foreground'
} satisfies Record<HookLifecycleSupport, string>

export function HooksLifecycleView({
  assets,
  agentView,
  search,
  scope,
  plugins = []
}: HooksLifecycleViewProps): React.ReactElement {
  const { t } = useTranslation()
  const hookSchemas = useMemo(() => buildHookSchemaMap(plugins), [plugins])
  const groups = useMemo(
    () => groupHookAssetsByStage(assets, agentView, { hookSchemas }),
    [assets, agentView, hookSchemas]
  )
  const { checks: healthChecks, loading: healthLoading, stale: healthStale } = useHealthChecks()
  const hookHealthChecks = useMemo(
    () => visibleHookHealthChecks(healthChecks, agentView),
    [healthChecks, agentView]
  )
  const hookCount = assets.length
  const hasSearch = search.trim().length > 0
  const hasScopeFilter = scope !== 'all'
  const [activeStageId, setActiveStageId] = useState<string | null>(null)
  const currentStageId = activeStageId ?? groups[0]?.id ?? null
  const connectorLayerRef = useRef<HTMLDivElement | null>(null)
  const connectorLines = useHookStageConnectors(groups, currentStageId, connectorLayerRef)

  useEffect(() => {
    setActiveStageId((current) => {
      if (current && groups.some((group) => group.id === current)) return current
      return groups[0]?.id ?? null
    })
  }, [groups])
  useHookStageScrollSpy(groups, setActiveStageId)

  const scrollToStage = (id: string): void => {
    setActiveStageId(id)
    document.getElementById(`hook-stage-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return (
    <div className="space-y-4">
      {(hasSearch || hasScopeFilter) && (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {t('capabilities.hooks.filteredHint')}
        </div>
      )}
      <div
        ref={connectorLayerRef}
        data-testid="hook-lifecycle-connector-layer"
        className="relative grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]"
      >
        <HookLifecycleConnectors lines={connectorLines} />
        <aside
          aria-label={t('capabilities.hooks.lifecycleIndex')}
          className="relative z-10 space-y-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto lg:pr-1"
        >
          <div className="rounded-lg border border-border bg-card p-2">
            <div className="px-2 pb-2 pt-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('capabilities.hooks.lifecycleIndex')}
                </p>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {t(`agentView.${agentView}`)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('capabilities.hooks.lifecycleCount', { count: hookCount })}
              </p>
            </div>
            <div
              data-testid="hook-lifecycle-stage-list"
              className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0"
            >
              {groups.map((group, index) => {
                const isCurrent = currentStageId === group.id
                return (
                  <button
                    key={group.id}
                    type="button"
                    aria-current={isCurrent ? 'true' : undefined}
                    data-hook-stage-anchor={group.id}
                    onClick={() => scrollToStage(group.id)}
                    className={cn(
                      'flex min-w-[230px] items-center gap-2 rounded-md px-2 py-2 text-left transition-colors lg:w-full lg:min-w-0',
                      isCurrent
                        ? 'bg-foreground text-background shadow-sm ring-1 ring-border/70'
                        : 'hover:bg-muted/70'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold',
                        isCurrent ? 'bg-background text-foreground' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-xs font-medium',
                          isCurrent ? 'text-background' : 'text-foreground'
                        )}
                      >
                        {group.stage ? t(group.stage.titleKey) : t('capabilities.hooks.unknown.title')}
                      </span>
                      <span
                        className={cn(
                          'block truncate text-[11px]',
                          isCurrent ? 'text-background/70' : 'text-muted-foreground'
                        )}
                      >
                        {group.stage ? t(group.stage.summaryKey) : t('capabilities.hooks.unknown.body')}
                      </span>
                    </span>
                    <span
                      title={t('capabilities.hooks.hookCount', { count: group.hooks.length })}
                      className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border border-border bg-background px-1.5 text-[11px] font-semibold text-muted-foreground"
                    >
                      {group.hooks.length}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <HookHealthSignal checks={hookHealthChecks} loading={healthLoading} stale={healthStale} />
          <HookRecoveryCenter />
        </aside>

        <div className="relative z-10 min-w-0 space-y-3">
          {groups.map((group) => (
            <HookStageSection key={group.id} group={group} agentView={agentView} hookSchemas={hookSchemas} />
          ))}
        </div>
      </div>
    </div>
  )
}

interface HookConnectorLine {
  id: string
  path: string
  active: boolean
}

function useHookStageScrollSpy(
  groups: HookStageGroup[],
  setActiveStageId: (stageId: string) => void
): void {
  const stageIds = useMemo(() => groups.map((group) => group.id), [groups])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const targets = stageIds
      .map((id) => document.getElementById(`hook-stage-${id}`))
      .filter((element): element is HTMLElement => element != null)
    if (targets.length === 0) return undefined

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => {
          if (b.intersectionRatio !== a.intersectionRatio) return b.intersectionRatio - a.intersectionRatio
          return a.boundingClientRect.top - b.boundingClientRect.top
        })
      const stageId = visible[0]?.target.getAttribute('data-hook-stage-target')
      if (stageId) setActiveStageId(stageId)
    }, {
      root: findHookScrollRoot(targets[0]),
      rootMargin: '-18% 0px -62% 0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
    })

    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [setActiveStageId, stageIds])
}

function useHookStageConnectors(
  groups: HookStageGroup[],
  activeStageId: string | null,
  layerRef: RefObject<HTMLDivElement | null>
): HookConnectorLine[] {
  const [lines, setLines] = useState<HookConnectorLine[]>([])
  const stageIds = useMemo(() => groups.map((group) => group.id), [groups])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return undefined

    let frameId: number | null = null
    const scrollRoot = findHookScrollRoot(layer)
    const requestFrame = window.requestAnimationFrame ?? ((callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0))
    const cancelFrame = window.cancelAnimationFrame ?? ((id: number) => window.clearTimeout(id))

    const measure = (): void => {
      frameId = null
      const layerRect = layer.getBoundingClientRect()
      const nextLines = stageIds.flatMap((id) => {
        const anchor = findStageElement('data-hook-stage-anchor', id)
        const target = findStageElement('data-hook-stage-target', id)
        if (!anchor || !target) return []

        const anchorRect = anchor.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()
        const startX = anchorRect.right - layerRect.left + 2
        const startY = anchorRect.top + anchorRect.height / 2 - layerRect.top
        const endX = targetRect.left - layerRect.left - 2
        const endY = targetRect.top + Math.min(36, Math.max(24, targetRect.height / 2)) - layerRect.top

        if (![startX, startY, endX, endY].every(Number.isFinite) || endX <= startX + 4) return []
        return [{
          id,
          path: buildRoundedConnectorPath(startX, startY, endX, endY),
          active: activeStageId === id
        }]
      })

      setLines((current) => connectorLinesEqual(current, nextLines) ? current : nextLines)
    }

    const schedule = (): void => {
      if (frameId != null) cancelFrame(frameId)
      frameId = requestFrame(measure)
    }

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    resizeObserver?.observe(layer)
    stageIds.forEach((id) => {
      const anchor = findStageElement('data-hook-stage-anchor', id)
      const target = findStageElement('data-hook-stage-target', id)
      if (anchor) resizeObserver?.observe(anchor)
      if (target) resizeObserver?.observe(target)
    })

    const scrollTarget = scrollRoot ?? window
    scrollTarget.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()

    return () => {
      if (frameId != null) cancelFrame(frameId)
      resizeObserver?.disconnect()
      scrollTarget.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [activeStageId, layerRef, stageIds])

  return lines
}

function HookLifecycleConnectors({ lines }: { lines: HookConnectorLine[] }): React.ReactElement {
  return (
    <svg
      data-testid="hook-lifecycle-connectors"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full overflow-visible lg:block"
    >
      {lines.map((line) => (
        <path
          key={line.id}
          d={line.path}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={line.active ? 1.5 : 1}
          vectorEffect="non-scaling-stroke"
          className={line.active ? 'text-foreground/35' : 'text-border'}
        />
      ))}
    </svg>
  )
}

function findHookScrollRoot(element: Element): Element | null {
  const appScroll = document.querySelector<HTMLElement>('[data-testid="app-content-scroll"]')
  if (appScroll?.contains(element)) return appScroll

  let parent = element.parentElement
  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return parent
    parent = parent.parentElement
  }
  return null
}

function findStageElement(attribute: string, stageId: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(`[${attribute}]`))
    .find((element) => element.getAttribute(attribute) === stageId) ?? null
}

function buildRoundedConnectorPath(startX: number, startY: number, endX: number, endY: number): string {
  const midX = startX + (endX - startX) / 2
  const deltaY = endY - startY
  const direction = deltaY >= 0 ? 1 : -1
  const radius = Math.min(14, Math.abs(endX - startX) / 4, Math.max(0, Math.abs(deltaY) / 2))

  if (radius < 1) return `M ${startX} ${startY} H ${endX}`

  return [
    `M ${startX} ${startY}`,
    `H ${midX - radius}`,
    `Q ${midX} ${startY} ${midX} ${startY + direction * radius}`,
    `V ${endY - direction * radius}`,
    `Q ${midX} ${endY} ${midX + radius} ${endY}`,
    `H ${endX}`
  ].join(' ')
}

function connectorLinesEqual(current: HookConnectorLine[], next: HookConnectorLine[]): boolean {
  if (current.length !== next.length) return false
  return current.every((line, index) => {
    const candidate = next[index]
    return line.id === candidate.id && line.path === candidate.path && line.active === candidate.active
  })
}

function HookRecoveryCenter(): React.ReactElement {
  const { t } = useTranslation()
  const [data, setData] = useState<HookRecoveryListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const loadRecoveries = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.hooks.recoveries()
      setData(result)
    } catch (err) {
      setError(formatHookToggleError(t, err))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadRecoveries()
  }, [loadRecoveries])

  const points = data?.points ?? []
  const issues = data?.issues ?? []
  const hasContent = loading || error || points.length > 0 || issues.length > 0

  return (
    <details className="rounded-lg border border-border bg-card" data-testid="hook-recovery-center">
      <summary className="grid cursor-pointer list-none gap-2 px-3 py-3">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">{t('capabilities.hooks.recovery.title')}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {loading
              ? t('capabilities.hooks.recovery.loading')
              : t('capabilities.hooks.recovery.summary', { count: points.length, issues: issues.length })}
          </span>
        </span>
        <span className="grid gap-1.5">
          <span className="w-fit rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {t('capabilities.hooks.recovery.pointCount', { count: points.length })}
          </span>
          {issues.length > 0 && (
            <span className="w-fit rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
              {t('capabilities.hooks.recovery.issueCount', { count: issues.length })}
            </span>
          )}
        </span>
      </summary>
      <div className="border-t border-border px-3 py-3">
        {loading && <HookRecoverySkeleton />}
        {!loading && error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
            {error}
          </div>
        )}
        {!loading && !hasContent && (
          <div className="rounded-md border border-dashed border-border px-3 py-4">
            <p className="text-sm font-medium text-foreground">{t('capabilities.hooks.recovery.emptyTitle')}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('capabilities.hooks.recovery.emptyBody')}</p>
          </div>
        )}
        {!loading && issues.length > 0 && (
          <div className="mb-3 space-y-2">
            {issues.map((issue) => (
              <HookRecoveryIssueRow key={`${issue.agentId}:${issue.sourcePath}:${issue.message}`} issue={issue} />
            ))}
          </div>
        )}
        {!loading && points.length > 0 && (
          <div className="divide-y divide-border/60 rounded-md border border-border/70">
            {points.map((point) => (
              <HookRecoveryPointRow
                key={point.hookKey}
                point={point}
                busy={busyKey === point.hookKey}
                onBusyChange={setBusyKey}
                onRefresh={() => void loadRecoveries()}
              />
            ))}
          </div>
        )}
      </div>
    </details>
  )
}

function HookRecoverySkeleton(): React.ReactElement {
  const { t } = useTranslation()
  return (
    <div className="space-y-2" aria-label={t('capabilities.hooks.recovery.loadingLabel')}>
      <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      <div className="h-10 animate-pulse rounded-md bg-muted/60" />
    </div>
  )
}

function HookRecoveryIssueRow({ issue }: { issue: HookRecoveryIssue }): React.ReactElement {
  const { t } = useTranslation()
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
          {t(`capabilities.hooks.recovery.issueSeverity.${issue.severity}`)}
        </span>
        <span className="text-xs font-medium text-foreground">{issue.message}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">{issue.sourcePath}</span>
        <button
          type="button"
          onClick={() => void window.api.shell.openPath(issue.sourcePath)}
          className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/70"
        >
          {t('capabilities.hooks.recovery.openSource')}
        </button>
      </div>
    </div>
  )
}

function HookRecoveryPointRow({
  point,
  busy,
  onBusyChange,
  onRefresh
}: {
  point: HookRecoveryPoint
  busy: boolean
  onBusyChange: (hookKey: string | null) => void
  onRefresh: () => void
}): React.ReactElement {
  const { t } = useTranslation()
  const canRestore = point.status === 'recoverable'
  const statusLabel = t(`capabilities.hooks.recovery.status.${point.status}`)
  const statusDescription = point.message ?? t(`capabilities.hooks.recovery.statusDetail.${point.status}`)
  const createdAt = formatRecoveryTime(point.createdAt)
  const [rowError, setRowError] = useState<string | null>(null)

  const restore = async (): Promise<void> => {
    if (!canRestore) return
    const confirmed = window.confirm(t('capabilities.hooks.recovery.confirmRestore', {
      sourcePath: point.sourcePath,
      event: point.event,
      summary: point.summary
    }))
    if (!confirmed) return
    onBusyChange(point.hookKey)
    setRowError(null)
    try {
      await window.api.hooks.setHookEnabled({
        agentId: 'claude-code',
        scope: 'user',
        hookKey: point.hookKey,
        sourcePath: point.sourcePath,
        enabled: true
      })
      onRefresh()
    } catch (err) {
      setRowError(formatHookToggleError(t, err))
    } finally {
      onBusyChange(null)
    }
  }

  const clear = async (): Promise<void> => {
    const confirmed = window.confirm(t('capabilities.hooks.recovery.confirmClear', {
      sourcePath: point.sourcePath,
      event: point.event,
      summary: point.summary
    }))
    if (!confirmed) return
    onBusyChange(point.hookKey)
    setRowError(null)
    try {
      await window.api.hooks.clearRecovery({
        agentId: 'claude-code',
        hookKey: point.hookKey,
        sourcePath: point.sourcePath
      })
      onRefresh()
    } catch (err) {
      setRowError(formatHookToggleError(t, err))
    } finally {
      onBusyChange(null)
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-3 px-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', hookRecoveryStatusClass(point.status))}>
            {statusLabel}
          </span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
            {point.hookType}
          </span>
          <span className="font-mono text-xs font-medium text-foreground">{point.event}</span>
          {point.matcher && (
            <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {point.matcher}
            </span>
          )}
          {createdAt && <span className="text-[11px] text-muted-foreground">{createdAt}</span>}
        </div>
        <p className="mt-1 break-words font-mono text-xs text-foreground">{point.summary}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{statusDescription}</p>
        {rowError && <p className="mt-1 text-xs leading-5 text-destructive">{rowError}</p>}
        <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{point.sourcePath}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <button
          type="button"
          disabled={!canRestore || busy}
          onClick={() => void restore()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:text-muted-foreground/50 disabled:hover:bg-transparent"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {busy ? t('capabilities.hooks.recovery.working') : t('capabilities.hooks.recovery.restore')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void clear()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:text-muted-foreground/50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t('capabilities.hooks.recovery.clear')}
        </button>
        <button
          type="button"
          onClick={() => void window.api.shell.openPath(point.sourcePath)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t('capabilities.hooks.recovery.openSource')}
        </button>
      </div>
    </div>
  )
}

function hookRecoveryStatusClass(status: HookRecoveryPoint['status']): string {
  if (status === 'recoverable') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  if (status === 'already-restored') return 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
  if (status === 'source-missing' || status === 'invalid') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
  return 'bg-muted text-muted-foreground'
}

function formatRecoveryTime(value: string | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function HookHealthSignal({
  checks,
  loading,
  stale
}: {
  checks: HealthCheck[]
  loading: boolean
  stale: boolean
}): React.ReactElement {
  const { t } = useTranslation()
  const counts = countHealthSeverities(checks)
  const hasChecks = checks.length > 0
  const sortedChecks = useMemo(
    () => [...checks].sort((a, b) => healthSeverityRank(a.severity) - healthSeverityRank(b.severity)),
    [checks]
  )
  const overallTone = healthOverallTone(checks)

  return (
    <div data-testid="hook-health-panel" className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{t('capabilities.hooks.health.title')}</span>
      </div>
      <div className="mt-2">
        {loading && stale ? (
          <HealthStatusTip
            id="hook-health-refreshing"
            tone="loading"
            label={t('capabilities.hooks.health.refreshing')}
            detail={t('capabilities.hooks.health.staleDetail')}
            checks={sortedChecks}
            buttonClassName="w-full justify-start px-2 py-1.5 text-left"
            labelClassName="min-w-0 truncate"
          />
        ) : loading ? (
          <HealthStatusTip
            id="hook-health-loading"
            tone="loading"
            label={t('capabilities.hooks.health.loading')}
            detail={t('capabilities.hooks.health.loadingDetail')}
            checks={[]}
            buttonClassName="w-full justify-start px-2 py-1.5 text-left"
            labelClassName="min-w-0 truncate"
          />
        ) : hasChecks ? (
          <HealthStatusTip
            id="hook-health-summary"
            tone={overallTone}
            label={t('capabilities.hooks.health.summary', { count: checks.length })}
            detail={t('capabilities.hooks.health.detailsBody')}
            checks={sortedChecks}
            buttonClassName="w-full justify-start px-2 py-1.5 text-left"
            labelClassName="min-w-0 truncate"
          />
        ) : (
          <HealthStatusTip
            id="hook-health-ok"
            tone="ok"
            label={t('capabilities.hooks.health.ok')}
            detail={t('capabilities.hooks.health.okDetail')}
            checks={[]}
            buttonClassName="w-full justify-start px-2 py-1.5 text-left"
            labelClassName="min-w-0 truncate"
          />
        )}
      </div>
      {hasChecks && (
        <div data-testid="hook-health-severity-list" className="mt-2 space-y-1">
          {counts.error > 0 && <HealthSeverityTip severity="error" count={counts.error} checks={sortedChecks} />}
          {counts.warning > 0 && <HealthSeverityTip severity="warning" count={counts.warning} checks={sortedChecks} />}
          {counts.info > 0 && <HealthSeverityTip severity="info" count={counts.info} checks={sortedChecks} />}
        </div>
      )}
    </div>
  )
}

function HealthSeverityTip({
  severity,
  count,
  checks
}: {
  severity: HealthCheck['severity']
  count: number
  checks: HealthCheck[]
}): React.ReactElement {
  const { t } = useTranslation()
  const severityChecks = checks.filter((check) => check.severity === severity)

  return (
    <HealthStatusTip
      id={`hook-health-${severity}`}
      tone={severity}
      label={t(`capabilities.hooks.health.severity.${severity}`, { count })}
      detail={t(`capabilities.hooks.health.severityDetail.${severity}`)}
      checks={severityChecks}
      buttonClassName="w-full justify-start px-2 py-1.5 text-left"
      labelClassName="min-w-0 truncate"
    />
  )
}

type HealthTipTone = HealthCheck['severity'] | 'ok' | 'loading'

function HealthStatusTip({
  id,
  tone,
  label,
  detail,
  checks,
  buttonClassName,
  labelClassName
}: {
  id: string
  tone: HealthTipTone
  label: string
  detail: string
  checks: HealthCheck[]
  buttonClassName?: string
  labelClassName?: string
}): React.ReactElement {
  const [open, setOpen] = useState(false)
  const Icon = healthToneIcon(tone)

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          healthToneClass(tone),
          buttonClassName
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className={labelClassName}>{label}</span>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          <span className="block text-xs font-semibold text-foreground">{label}</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span>
          {checks.length > 0 && (
            <span className="mt-3 block space-y-2">
              {checks.map((check) => (
                <HookHealthCheckTipRow key={check.id} check={check} />
              ))}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

function HookHealthCheckTipRow({ check }: { check: HealthCheck }): React.ReactElement {
  const { t } = useTranslation()
  const displayCheck = localizeHealthCheck(check, t)
  const targetPath = check.target?.path ?? check.path

  return (
    <span className="block rounded-md border border-border/70 bg-background/80 p-2">
      <span className="flex flex-wrap items-center gap-1.5">
        <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', healthSeverityClass(check.severity))}>
          {t(`capabilities.hooks.health.severityLabel.${check.severity}`)}
        </span>
        <span className="text-xs font-medium text-foreground">{displayCheck.title}</span>
      </span>
      <span className="mt-1 flex flex-wrap gap-1.5">
        <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {check.agentName}
        </span>
        {check.scope && (
          <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {localizeHealthCheckScope(check.scope, t)}
          </span>
        )}
      </span>
      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{displayCheck.message}</span>
      {displayCheck.fix ? (
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          <span className="font-medium text-foreground">{displayCheck.fix.label}: </span>
          {displayCheck.fix.description}
        </span>
      ) : displayCheck.suggestion ? (
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{displayCheck.suggestion}</span>
      ) : null}
      {targetPath && <span className="mt-1 block break-all font-mono text-[11px] text-muted-foreground">{targetPath}</span>}
      {targetPath && (
        <button
          type="button"
          onClick={() => void window.api?.shell.openPath(targetPath)}
          className="mt-2 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/70 active:translate-y-px"
        >
          {t('capabilities.hooks.health.openSource')}
        </button>
      )}
    </span>
  )
}

function HookStageSection({
  group,
  agentView,
  hookSchemas
}: {
  group: HookStageGroup
  agentView: AgentView
  hookSchemas: HookSchemaMap
}): React.ReactElement {
  const { t } = useTranslation()

  if (!group.stage) {
    return <UnknownHookSection group={group} agentView={agentView} hookSchemas={hookSchemas} />
  }

  const supports = getVisibleStageSupport(group.stage, agentView, { hookSchemas })

  return (
    <section
      id={`hook-stage-${group.id}`}
      data-hook-stage-target={group.id}
      className="scroll-mt-4 rounded-lg border border-border bg-card"
    >
      <div className="border-b border-border px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">{t(group.stage.titleKey)}</h3>
            <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">{t(group.stage.behaviorKey)}</p>
          </div>
          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            {t('capabilities.hooks.hookCount', { count: group.hooks.length })}
          </span>
        </div>
        <HookStageRecommendations recommendationKeys={group.stage.recommendationKeys} />
        <AgentSupportTips stageId={group.stage.id} supports={supports} />
      </div>

      <div className="px-4 py-4">
        <HookEventList group={group} agentView={agentView} hookSchemas={hookSchemas} />
      </div>
    </section>
  )
}

function HookStageRecommendations({ recommendationKeys }: { recommendationKeys: string[] }): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-foreground">{t('capabilities.hooks.recommendations.title')}</span>
      {recommendationKeys.map((key) => (
        <span key={key} className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {t(key)}
        </span>
      ))}
    </div>
  )
}

function AgentSupportTips({ stageId, supports }: { stageId: string; supports: HookAgentStageSupport[] }): React.ReactElement | null {
  const { t } = useTranslation()
  if (supports.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{t('capabilities.hooks.agentTips.label')}</span>
      {supports.map((support) => (
        <AgentSupportTip key={support.agent} stageId={stageId} support={support} />
      ))}
    </div>
  )
}

function AgentSupportTip({ stageId, support }: { stageId: string; support: HookAgentStageSupport }): React.ReactElement {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const Icon = supportIconMap[support.support]
  const tooltipId = `hook-${stageId}-${support.agent}-support-tip`
  const agentName = support.agent === 'claude' ? 'Claude Code' : 'Codex'

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {agentName}
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-foreground">{agentName}</span>
            <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium', supportClassMap[support.support])}>
              <Icon className="h-3 w-3" />
              {t(`capabilities.hooks.support.${support.support}`)}
            </span>
          </span>
          <span className="mt-2 flex flex-wrap gap-1">
            {support.events.map((event) => (
              <span key={event.eventType} className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] font-mono text-foreground">
                {event.eventType}
              </span>
            ))}
          </span>
          <span className="mt-2 block text-xs leading-5 text-muted-foreground">{t(support.summaryKey)}</span>
          {support.limitationKeys.length > 0 && (
            <span className="mt-2 block space-y-1">
              {support.limitationKeys.map((key) => (
                <span key={key} className="flex gap-1.5 text-xs leading-5 text-amber-600 dark:text-amber-400">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{t(key)}</span>
                </span>
              ))}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

function UnknownHookSection({
  group,
  agentView,
  hookSchemas
}: {
  group: HookStageGroup
  agentView: AgentView
  hookSchemas: HookSchemaMap
}): React.ReactElement {
  const { t } = useTranslation()

  return (
    <section
      id={`hook-stage-${group.id}`}
      data-hook-stage-target={group.id}
      className="scroll-mt-4 rounded-lg border border-border bg-card"
    >
      <div className="border-b border-border px-4 py-4">
        <h3 className="text-base font-semibold text-foreground">{t('capabilities.hooks.unknown.title')}</h3>
        <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">{t('capabilities.hooks.unknown.body')}</p>
      </div>
      <div className="px-4 py-4">
        <HookEventList group={group} agentView={agentView} hookSchemas={hookSchemas} />
      </div>
    </section>
  )
}

function HookEventList({
  group,
  agentView,
  hookSchemas
}: {
  group: HookStageGroup
  agentView: AgentView
  hookSchemas: HookSchemaMap
}): React.ReactElement {
  const { t } = useTranslation()

  if (group.hooks.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-3 py-4">
        <p className="text-sm text-foreground">{t('capabilities.hooks.emptyStage.title')}</p>
        <p className="mt-1 max-w-[68ch] text-xs leading-5 text-muted-foreground">{t('capabilities.hooks.emptyStage.body')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {group.events.map((eventGroup) => (
        <div key={eventGroup.eventType} className="rounded-md border border-border/70">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2">
            <span className="font-mono text-xs font-medium text-foreground">{eventGroup.eventType}</span>
            <span className="text-xs text-muted-foreground">
              {t(`capabilities.hooks.nativeEvents.${eventGroup.eventType}.description`, { defaultValue: t('capabilities.hooks.nativeEvents.unknown.description') })}
            </span>
          </div>
          <div className="divide-y divide-border/60">
            {eventGroup.hooks.map((hook) => (
              <HookAssetRow key={hook.id} hook={hook} agentView={agentView} hookSchemas={hookSchemas} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function HookAssetRow({
  hook,
  agentView,
  hookSchemas
}: {
  hook: Asset
  agentView: AgentView
  hookSchemas: HookSchemaMap
}): React.ReactElement {
  const { t } = useTranslation()
  const matcher = typeof hook.meta.matcher === 'string' ? hook.meta.matcher : ''
  const handlerDescriptor = findHookHandlerDescriptor(hook, hookSchemas)
  const supportNote = typeof hook.meta.supportNote === 'string'
    ? hook.meta.supportNote
    : handlerDescriptor?.supportNoteKey ?? ''
  const display = hookDisplayDetails(hook, handlerDescriptor)
  const rawHookJson = formatRawHookJson(hook.meta.rawHook)
  const managementStates = getHookManagementState(hook, agentView)
  const riskHints = getHookRiskHints(hook)
  const toggleState = managementStates.find((state) => state.action === 'toggle-hook')
  const initialHookEnabled = hookEnabledValue(hook)
  const equivalentSourceCount = hookEquivalentSourceCount(hook)
  const [hookEnabled, setHookEnabled] = useState(initialHookEnabled)
  const [toggleBusy, setToggleBusy] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [rawCopied, setRawCopied] = useState(false)
  const effectiveEnabled = hookEffectiveEnabledValue(hook, hookEnabled)
  const equivalentSourcesTitle = hookEquivalentSourcesTitle(t, hook, hookEnabled)

  useEffect(() => {
    setHookEnabled(initialHookEnabled)
    setToggleError(null)
    setRawCopied(false)
  }, [hook.id, initialHookEnabled])

  const toggleHook = async (): Promise<void> => {
    if (!toggleState?.hookKey || toggleState.availability !== 'needs-confirmation') return
    const agentId = hookToggleAgentId(hook)
    if (!agentId) return
    const enabled = !hookEnabled
    const confirmMessage = getHookToggleConfirmMessage(t, agentId, enabled, hook)

    if (!window.confirm(confirmMessage)) return

    setToggleBusy(true)
    setToggleError(null)
    try {
      const result = await window.api.hooks.setHookEnabled({
        agentId,
        scope: 'user',
        hookKey: toggleState.hookKey,
        sourcePath: hook.path,
        enabled,
        managed: hook.meta.managed === true
      })
      setHookEnabled(result.enabled)
    } catch (err) {
      setToggleError(formatHookToggleError(t, err))
    } finally {
      setToggleBusy(false)
    }
  }

  const copyRawHookJson = async (): Promise<void> => {
    if (!rawHookJson || !navigator.clipboard) return
    await navigator.clipboard.writeText(rawHookJson)
    setRawCopied(true)
  }

  return (
    <div className="px-3 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              title={display.type}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {display.typeLabelKey ? t(display.typeLabelKey, { defaultValue: display.type }) : display.type}
            </span>
            {display.runMode && display.runMode !== 'runnable' && (
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                {t(`capabilities.hooks.runMode.${display.runMode}`)}
              </span>
            )}
            <span className="min-w-0 max-w-full break-all font-mono text-xs text-foreground">{display.primary}</span>
            <ScopeBadge scope={hook.scope} />
            {hookCanShowEnabledBadge(hook, toggleState) && (
              <span className={cn(
                'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                hookEnabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
              )}>
                {hookEnabled ? t('capabilities.hooks.management.enabled') : t('capabilities.hooks.management.disabled')}
              </span>
            )}
            {equivalentSourceCount > 1 && (
              <span
                title={equivalentSourcesTitle}
                className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {t('capabilities.hooks.management.sourceCount', { count: equivalentSourceCount })}
              </span>
            )}
            {equivalentSourceCount > 1 && (
              <span className={cn(
                'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                effectiveEnabled
                  ? hookEnabled
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'bg-muted text-muted-foreground'
              )}>
                {t(hookEffectiveLabelKey(hookEnabled, effectiveEnabled))}
              </span>
            )}
            {agentView === 'all' && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {hook.agentId === 'codex' ? 'Codex' : 'Claude Code'}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {matcher && (
              <span>
                {t('capabilities.hooks.matcher')}: <span className="font-mono text-foreground">{matcher}</span>
              </span>
            )}
            {display.configItems.map((item) => (
              <span key={`${item.labelKey ?? item.label}:${item.value}`}>
                {item.labelKey ? t(item.labelKey) : item.label}: <span className="font-mono text-foreground">{item.value}</span>
              </span>
            ))}
            <span className="min-w-0 truncate font-mono">{hook.path}</span>
          </div>
          {rawHookJson && (
            <div className="mt-2 flex items-start gap-2">
              <details className="min-w-0 flex-1">
                <summary className="inline-flex cursor-pointer select-none items-center rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                  {t('capabilities.hooks.management.rawJson')}
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border/70 bg-muted/40 p-3 text-[11px] leading-5 text-foreground">
                  {rawHookJson}
                </pre>
              </details>
              <button
                type="button"
                aria-label={rawCopied ? t('capabilities.hooks.management.copiedRawJson') : t('capabilities.hooks.management.copyRawJson')}
                title={rawCopied ? t('capabilities.hooks.management.copiedRawJson') : t('capabilities.hooks.management.copyRawJson')}
                onClick={() => void copyRawHookJson()}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                {rawCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
          {supportNote && (
            <p className="mt-2 flex gap-1.5 text-xs leading-5 text-amber-600 dark:text-amber-400">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{t(supportNote)}</span>
            </p>
          )}
          <HookRiskHints hints={riskHints} />
          {toggleState?.availability === 'unavailable' && toggleState.reasonKey && (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{t(toggleState.reasonKey)}</p>
          )}
          {toggleError && <p className="mt-2 text-xs leading-5 text-destructive">{toggleError}</p>}
        </div>

        {toggleState?.availability === 'needs-confirmation' && (
          <button
            type="button"
            disabled={toggleBusy}
            onClick={() => void toggleHook()}
            className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:text-muted-foreground/60 disabled:hover:bg-transparent"
          >
            {hookEnabled ? t('capabilities.hooks.management.disableHook') : t('capabilities.hooks.management.enableHook')}
          </button>
        )}
        <HookActions states={managementStates} />
      </div>
    </div>
  )
}

interface HookConfigItem {
  labelKey?: string
  label?: string
  value: string
}

interface HookDisplayDetails {
  type: string
  typeLabelKey?: string
  primary: string
  configItems: HookConfigItem[]
  runMode?: AgentCapabilityPluginHookHandlerDescriptor['runMode']
}

function hookDisplayDetails(
  hook: Asset,
  handlerDescriptor?: AgentCapabilityPluginHookHandlerDescriptor
): HookDisplayDetails {
  const hookType = firstMetaString(hook, 'hookType') ?? 'unknown'
  const command = firstMetaString(hook, 'command')
  const commandWindows = firstMetaString(hook, 'commandWindows')
  const url = firstMetaString(hook, 'url')
  const server = firstMetaString(hook, 'server')
  const tool = firstMetaString(hook, 'tool')
  const prompt = firstMetaString(hook, 'prompt')
  const model = firstMetaString(hook, 'model')

  const configItems: HookConfigItem[] = []
  addConfigItem(configItems, 'capabilities.hooks.config.condition', firstMetaString(hook, 'ifCondition'))
  addConfigItem(configItems, 'capabilities.hooks.config.timeout', formatSeconds(hook.meta.timeout))
  addConfigItem(configItems, 'capabilities.hooks.config.statusMessage', firstMetaString(hook, 'statusMessage'))
  addConfigItem(configItems, 'capabilities.hooks.config.commandWindows', commandWindows)
  addConfigItem(configItems, 'capabilities.hooks.config.args', formatStringArray(hook.meta.args))
  addConfigItem(configItems, 'capabilities.hooks.config.shell', firstMetaString(hook, 'shell'))
  addConfigItem(configItems, 'capabilities.hooks.config.async', hook.meta.async === true ? 'true' : undefined)
  addConfigItem(configItems, 'capabilities.hooks.config.asyncRewake', hook.meta.asyncRewake === true ? 'true' : undefined)
  addConfigItem(configItems, 'capabilities.hooks.config.model', model)

  if (hookType === 'http') {
    return applyHandlerDescriptor(hook, handlerDescriptor, {
      type: hookType,
      primary: url ?? hook.name,
      configItems
    })
  }
  if (hookType === 'mcp_tool') {
    return applyHandlerDescriptor(hook, handlerDescriptor, {
      type: hookType,
      primary: server && tool ? `${server}.${tool}` : server ?? tool ?? hook.name,
      configItems
    })
  }
  if (hookType === 'prompt' || hookType === 'agent') {
    return applyHandlerDescriptor(hook, handlerDescriptor, {
      type: hookType,
      primary: truncateInline(prompt ?? hook.name, 120),
      configItems
    })
  }
  return applyHandlerDescriptor(hook, handlerDescriptor, {
    type: hookType,
    primary: command ?? commandWindows ?? hook.name,
    configItems
  })
}

function applyHandlerDescriptor(
  hook: Asset,
  handlerDescriptor: AgentCapabilityPluginHookHandlerDescriptor | undefined,
  fallback: HookDisplayDetails
): HookDisplayDetails {
  if (!handlerDescriptor) return fallback
  const primary = formatPrimaryFromHandlerSchema(hook, handlerDescriptor) ?? fallback.primary
  const configItems = configItemsFromHandlerSchema(hook, handlerDescriptor)

  return {
    type: fallback.type,
    typeLabelKey: handlerDescriptor.labelKey,
    primary: truncateInline(primary, 160),
    configItems: configItems.length > 0 ? configItems : fallback.configItems,
    runMode: handlerDescriptor.runMode
  }
}

function formatPrimaryFromHandlerSchema(
  hook: Asset,
  handlerDescriptor: AgentCapabilityPluginHookHandlerDescriptor
): string | undefined {
  const names = handlerDescriptor.primaryFieldNames.length > 0
    ? handlerDescriptor.primaryFieldNames
    : handlerDescriptor.fields.filter((field) => field.primary).map((field) => field.name)
  const values = names.flatMap((name) => {
    const value = formatHookFieldValue(hook, name)
    return value ? [value] : []
  })

  if (names.includes('server') && names.includes('tool')) {
    const server = firstMetaString(hook, 'server')
    const tool = firstMetaString(hook, 'tool')
    if (server && tool) return `${server}.${tool}`
  }
  if (values.length === 0) return undefined
  return values.join(' ')
}

function configItemsFromHandlerSchema(
  hook: Asset,
  handlerDescriptor: AgentCapabilityPluginHookHandlerDescriptor
): HookConfigItem[] {
  const primaryNames = new Set(handlerDescriptor.primaryFieldNames)
  const items: HookConfigItem[] = []

  for (const field of handlerDescriptor.fields) {
    if (field.name === 'type' || primaryNames.has(field.name) || field.primary) continue
    const value = formatHookFieldValue(hook, field.name)
    if (!value) continue
    items.push({
      labelKey: hookFieldConfigLabelKey(field),
      label: hookFieldConfigLabelKey(field) ? undefined : field.name,
      value
    })
  }

  return items
}

function hookFieldConfigLabelKey(field: AgentCapabilityPluginHookHandlerFieldDescriptor): string | undefined {
  const labels: Record<string, string> = {
    if: 'capabilities.hooks.config.condition',
    ifCondition: 'capabilities.hooks.config.condition',
    timeout: 'capabilities.hooks.config.timeout',
    statusMessage: 'capabilities.hooks.config.statusMessage',
    status_message: 'capabilities.hooks.config.statusMessage',
    commandWindows: 'capabilities.hooks.config.commandWindows',
    command_windows: 'capabilities.hooks.config.commandWindows',
    args: 'capabilities.hooks.config.args',
    shell: 'capabilities.hooks.config.shell',
    async: 'capabilities.hooks.config.async',
    asyncRewake: 'capabilities.hooks.config.asyncRewake',
    model: 'capabilities.hooks.config.model'
  }
  return labels[field.name]
}

function formatHookFieldValue(hook: Asset, name: string): string | undefined {
  if (name === 'timeout') return formatSeconds(hook.meta.timeout)
  const value = hook.meta[name]
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'true' : undefined
  return formatStringArray(value)
}

function addConfigItem(items: HookConfigItem[], labelKey: string, value: string | undefined): void {
  if (value) items.push({ labelKey, value })
}

function firstMetaString(hook: Asset, key: string): string | undefined {
  const value = hook.meta[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function formatSeconds(value: unknown): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}s` : undefined
}

function formatStringArray(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined
  const values = value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  if (values.length === 0) return undefined
  return values.join(' ')
}

function buildHookSchemaMap(plugins: AgentCapabilityPlugin[]): HookSchemaMap {
  const hookSchemas: HookSchemaMap = {}
  for (const plugin of plugins) {
    hookSchemas[plugin.hookSchema.agentId] = plugin.hookSchema
  }
  return hookSchemas
}

function findHookHandlerDescriptor(
  hook: Asset,
  hookSchemas: HookSchemaMap
): AgentCapabilityPluginHookHandlerDescriptor | undefined {
  const hookType = firstMetaString(hook, 'hookType')
  if (!hookType) return undefined
  const agentId = hookSchemaAgentId(hook)
  const schema = agentId ? hookSchemas[agentId] : undefined
  return schema?.handlers.find((handler) => handler.type === hookType)
}

function hookSchemaAgentId(hook: Asset): AgentPluginAgentId | null {
  if (hook.agentId === 'claude-code' || hook.agentId === 'claude') return 'claude-code'
  if (hook.agentId === 'codex') return 'codex'
  return null
}

function truncateInline(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value
}

function formatRawHookJson(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return null
  }
}

function hookToggleAgentId(hook: Asset): HooksAgentId | null {
  if (hook.agentId === 'claude-code') return 'claude-code'
  if (hook.agentId === 'codex') return 'codex'
  return null
}

function hookCanShowEnabledBadge(hook: Asset, toggleState: HookManagementState | undefined): boolean {
  return toggleState?.hookKey != null || typeof hook.meta.enabled === 'boolean' || hook.meta.disabledByBerth === true
}

function hookEquivalentSourceCount(hook: Asset): number {
  const value = hook.meta.equivalentSourceCount
  return typeof value === 'number' && Number.isFinite(value) && value > 1 ? value : 0
}

interface HookEquivalentSource {
  id: string
  agentId: string
  scope: string
  name: string
  path: string
  enabled: boolean
  managed: boolean
}

function hookEquivalentSources(hook: Asset, hookEnabled: boolean): HookEquivalentSource[] {
  if (!Array.isArray(hook.meta.equivalentSources)) return []
  return hook.meta.equivalentSources.flatMap((source) => {
    if (!source || typeof source !== 'object') return []
    const record = source as Record<string, unknown>
    const id = typeof record.id === 'string' ? record.id : ''
    const path = typeof record.path === 'string' ? record.path : ''
    if (!id || !path) return []
    return [{
      id,
      agentId: typeof record.agentId === 'string' ? record.agentId : hook.agentId,
      scope: typeof record.scope === 'string' ? record.scope : 'unknown',
      name: typeof record.name === 'string' ? record.name : id,
      path,
      enabled: id === hook.id ? hookEnabled : record.enabled !== false,
      managed: record.managed === true
    }]
  })
}

function hookEquivalentSourcesTitle(
  t: ReturnType<typeof useTranslation>['t'],
  hook: Asset,
  hookEnabled: boolean
): string | undefined {
  const sources = hookEquivalentSources(hook, hookEnabled)
  if (sources.length === 0) return undefined
  return sources
    .map((source) => {
      const enabled = source.enabled
        ? t('capabilities.hooks.management.sourceStatus.enabled')
        : t('capabilities.hooks.management.sourceStatus.disabled')
      const managed = source.managed ? `, ${t('capabilities.hooks.management.sourceStatus.managed')}` : ''
      return `${source.scope}: ${enabled}${managed} - ${source.path}`
    })
    .join('\n')
}

function hookEffectiveEnabledValue(hook: Asset, hookEnabled: boolean): boolean {
  if (hook.meta.effectiveEnabled === true) return true
  if (hook.meta.effectiveEnabled === false) return hookEnabled
  return hookEnabled
}

function hookEffectiveLabelKey(hookEnabled: boolean, effectiveEnabled: boolean): string {
  if (effectiveEnabled && !hookEnabled) return 'capabilities.hooks.management.effectiveElsewhere'
  if (effectiveEnabled) return 'capabilities.hooks.management.effectiveEnabled'
  return 'capabilities.hooks.management.effectiveDisabled'
}

function getHookToggleConfirmMessage(
  t: ReturnType<typeof useTranslation>['t'],
  agentId: HooksAgentId,
  enabled: boolean,
  hook: Asset
): string {
  const event = typeof hook.meta.eventType === 'string' ? hook.meta.eventType : ''
  const command = typeof hook.meta.command === 'string' ? hook.meta.command : hook.name
  const disabledAt = typeof hook.meta.disabledAt === 'string' ? hook.meta.disabledAt : ''
  if (agentId === 'claude-code') {
    return enabled
      ? t('capabilities.hooks.management.confirmRestoreClaudeHook', { command, disabledAt, event, path: hook.path })
      : t('capabilities.hooks.management.confirmSoftDisableClaudeHook', { command, event, path: hook.path })
  }
  return enabled
    ? t('capabilities.hooks.management.confirmEnableHook', { path: hook.path })
    : t('capabilities.hooks.management.confirmDisableHook', { path: hook.path })
}

function formatHookToggleError(t: ReturnType<typeof useTranslation>['t'], error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('no longer exists in the target scenario')) {
    return t('capabilities.hooks.management.errorStaleTarget')
  }
  if (message.includes('target changed or was removed')) {
    return t('capabilities.hooks.management.errorTargetChanged')
  }
  if (message.includes('source changed while Berth was updating')) {
    return t('capabilities.hooks.management.errorSourceChanged')
  }
  if (message.includes('restore point was not found')) {
    return t('capabilities.hooks.management.errorRestorePointMissing')
  }
  if (message.includes('Invalid Claude hooks state')) {
    return t('capabilities.hooks.management.errorRestorePointInvalid')
  }
  if (message.includes('already being modified')) {
    return t('capabilities.hooks.management.errorConcurrentWrite')
  }
  return message
}

function HookRiskHints({ hints }: { hints: HookRiskHint[] }): React.ReactElement | null {
  const { t } = useTranslation()
  if (hints.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {hints.map((hint) => (
        <span
          key={hint.key}
          className={cn(
            'rounded-md px-1.5 py-0.5 text-[11px] font-medium',
            hint.level === 'warning'
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {t(hint.key)}
        </span>
      ))}
    </div>
  )
}

function hookEnabledValue(hook: Asset): boolean {
  return hook.meta.enabled !== false
}

function HookActions({ states }: { states: HookManagementState[] }): React.ReactElement {
  const { t } = useTranslation()
  const openStates = states.filter((state) => state.action.startsWith('open-'))
  const availableCount = openStates.filter((state) => state.availability === 'available').length

  const openPath = async (state: HookManagementState): Promise<void> => {
    const targetPath = targetPathForAction(state)
    if (!targetPath) return
    await window.api?.shell.openPath(targetPath)
  }

  return (
    <details className="relative shrink-0">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70">
        <MoreHorizontal className="h-3.5 w-3.5" />
        {t('capabilities.hooks.actions.menu')}
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-border bg-popover p-1 shadow-lg">
        {openStates.map((state) => (
          <button
            key={state.action}
            type="button"
            disabled={state.availability !== 'available'}
            onClick={() => void openPath(state)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:text-muted-foreground/60 disabled:hover:bg-transparent"
          >
            {iconForAction(state.action)}
            <span className="min-w-0 flex-1">{t(`capabilities.hooks.actions.${state.action}`)}</span>
          </button>
        ))}
        {availableCount === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">{t('capabilities.hooks.actions.noOpenTargets')}</p>
        )}
      </div>
    </details>
  )
}

function iconForAction(action: HookManagementAction): React.ReactElement {
  if (action === 'open-source-directory' || action === 'open-entry-directory') {
    return <FolderOpen className="h-3.5 w-3.5 shrink-0" />
  }
  if (action === 'open-entry-file') return <FileCode2 className="h-3.5 w-3.5 shrink-0" />
  return <ExternalLink className="h-3.5 w-3.5 shrink-0" />
}

function targetPathForAction(state: HookManagementState): string | undefined {
  if (!state.targetPath) return undefined
  if (state.action === 'open-source-directory' || state.action === 'open-entry-directory') {
    return dirname(state.targetPath)
  }
  return state.targetPath
}

function dirname(filePath: string): string {
  const normalized = filePath.replace(/[/\\]+$/, '')
  const index = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'))
  return index > 0 ? normalized.slice(0, index) : normalized
}

function visibleHookHealthChecks(checks: HealthCheck[], agentView: AgentView): HealthCheck[] {
  return checks.filter((check) => isHookHealthCheck(check) && healthCheckMatchesAgent(check, agentView))
}

function isHookHealthCheck(check: HealthCheck): boolean {
  return check.assetType === 'hook' || check.target?.route?.includes('tab=hooks') === true
}

function healthCheckMatchesAgent(check: HealthCheck, agentView: AgentView): boolean {
  if (check.agentId === 'all') return true
  if (agentView === 'all') return check.agentId === 'claude-code' || check.agentId === 'codex'
  if (agentView === 'claude') return check.agentId === 'claude-code'
  return check.agentId === 'codex'
}

function countHealthSeverities(checks: HealthCheck[]): Record<HealthCheck['severity'], number> {
  return checks.reduce<Record<HealthCheck['severity'], number>>(
    (counts, check) => {
      counts[check.severity] += 1
      return counts
    },
    { error: 0, warning: 0, info: 0 }
  )
}

function healthSeverityRank(severity: HealthCheck['severity']): number {
  if (severity === 'error') return 0
  if (severity === 'warning') return 1
  return 2
}

function healthOverallTone(checks: HealthCheck[]): HealthCheck['severity'] {
  if (checks.some((check) => check.severity === 'error')) return 'error'
  if (checks.some((check) => check.severity === 'warning')) return 'warning'
  return 'info'
}

function healthToneIcon(tone: HealthTipTone): React.ComponentType<{ className?: string }> {
  if (tone === 'ok') return CheckCircle2
  if (tone === 'loading') return Info
  if (tone === 'error' || tone === 'warning') return CircleAlert
  return Info
}

function healthToneClass(tone: HealthTipTone): string {
  if (tone === 'ok') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  if (tone === 'loading') return 'bg-muted text-muted-foreground'
  return healthSeverityClass(tone)
}

function healthSeverityClass(severity: HealthCheck['severity']): string {
  if (severity === 'error') return 'bg-destructive/10 text-destructive'
  if (severity === 'warning') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
  return 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
}
