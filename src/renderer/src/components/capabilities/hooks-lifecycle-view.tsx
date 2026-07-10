import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
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
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@/components/ui'
import { ScopeBadge } from '@/components/shared/scope-badge'
import { PluginOriginBadge } from '@/components/shared/plugin-origin-badge'
import { pluginOriginOf } from '@/lib/plugin-origin'
import { useFocusTarget, FOCUS_HIGHLIGHT_CLASS } from '@/hooks/use-focus-target'
import { FloatingPopover } from '@/components/shared/floating-popover'
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
import { matchesAgentView } from '@shared/scope'
import type {
  AgentCapabilityPlugin,
  AgentCapabilityPluginHookHandlerDescriptor,
  AgentCapabilityPluginHookHandlerFieldDescriptor,
  AgentPluginAgentId
} from '@shared/types/agent-plugin'
import type { HealthCheck, HooksAgentId } from '@shared/types/ipc'

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
  const connectorPathRefs = useRef<Map<string, SVGPathElement>>(new Map())
  useHookStageConnectors(groups, connectorLayerRef, connectorPathRefs)
  const { focusId, isFocused } = useFocusTarget()

  // Jumped-to from the plugin page: scroll the focused hook row into view (GH-112).
  useEffect(() => {
    if (!focusId) return
    const id = window.setTimeout(() => {
      document.getElementById(`hook-row-${focusId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 0)
    return () => window.clearTimeout(id)
  }, [focusId])

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
        <HookLifecycleConnectors groups={groups} activeStageId={currentStageId} pathRefs={connectorPathRefs} />
        <aside
          aria-label={t('capabilities.hooks.lifecycleIndex')}
          className="relative z-10 space-y-3 lg:sticky lg:top-[var(--berth-page-gutter,1.5rem)] lg:max-h-[calc(100dvh_-_var(--berth-page-top-offset,6rem)_-_var(--berth-page-gutter,1.5rem))] lg:self-start lg:overflow-y-auto lg:pr-1"
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
        </aside>

        <div className="relative z-10 min-w-0 space-y-3">
          {groups.map((group) => (
            <HookStageSection key={group.id} group={group} agentView={agentView} hookSchemas={hookSchemas} isFocused={isFocused} />
          ))}
        </div>
      </div>
    </div>
  )
}

const HOOK_ACTIVE_STAGE_SCROLL_THROTTLE_MS = 100
const HOOK_CONNECTOR_BEND_OFFSET_PX = -1

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

    let activeStageTimerId: number | null = null
    let pendingStageId: string | null = null
    const scheduleActiveStage = (stageId: string): void => {
      pendingStageId = stageId
      if (activeStageTimerId != null) return
      activeStageTimerId = window.setTimeout(() => {
        activeStageTimerId = null
        const nextStageId = pendingStageId
        pendingStageId = null
        if (nextStageId) setActiveStageId(nextStageId)
      }, HOOK_ACTIVE_STAGE_SCROLL_THROTTLE_MS)
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => {
          if (b.intersectionRatio !== a.intersectionRatio) return b.intersectionRatio - a.intersectionRatio
          return a.boundingClientRect.top - b.boundingClientRect.top
        })
      const stageId = visible[0]?.target.getAttribute('data-hook-stage-target')
      if (stageId) scheduleActiveStage(stageId)
    }, {
      root: findHookScrollRoot(targets[0]),
      rootMargin: '-18% 0px -62% 0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
    })

    targets.forEach((target) => observer.observe(target))
    return () => {
      if (activeStageTimerId != null) window.clearTimeout(activeStageTimerId)
      observer.disconnect()
    }
  }, [setActiveStageId, stageIds])
}

// 连接线跨越 sticky 侧栏与滚动内容两个滚动上下文, 滚动期间必须逐帧重算。
// 抖动治理: 挂载时缓存锚点/目标元素 (热路径零 DOM 查询), 测量结果直接写 path 的
// d 属性 (热路径零 React 渲染), 高亮切换交给 CSS 过渡。
function useHookStageConnectors(
  groups: HookStageGroup[],
  layerRef: RefObject<HTMLDivElement | null>,
  pathRefs: RefObject<Map<string, SVGPathElement>>
): void {
  const stageIds = useMemo(() => groups.map((group) => group.id), [groups])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return undefined

    let frameId: number | null = null
    const scrollRoot = findHookScrollRoot(layer)
    const requestFrame = window.requestAnimationFrame ?? ((callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0))
    const cancelFrame = window.cancelAnimationFrame ?? ((id: number) => window.clearTimeout(id))

    const idSet = new Set<string>(stageIds)
    const collectStageElements = (attribute: string): Map<string, HTMLElement> => {
      const elements = new Map<string, HTMLElement>()
      layer.querySelectorAll<HTMLElement>(`[${attribute}]`).forEach((element) => {
        const id = element.getAttribute(attribute)
        if (id && idSet.has(id)) elements.set(id, element)
      })
      return elements
    }
    const anchors = collectStageElements('data-hook-stage-anchor')
    const targets = collectStageElements('data-hook-stage-target')

    const measure = (): void => {
      frameId = null
      const layerRect = layer.getBoundingClientRect()
      const bendX = findConnectorGapCenterX(layer, layerRect)
      for (const id of stageIds) {
        const path = pathRefs.current.get(id)
        if (!path) continue
        const anchor = anchors.get(id)
        const target = targets.get(id)
        if (!anchor || !target) {
          path.removeAttribute('d')
          continue
        }

        const anchorRect = anchor.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()
        const startX = anchorRect.right - layerRect.left + 2
        const startY = anchorRect.top + anchorRect.height / 2 - layerRect.top
        const endX = targetRect.left - layerRect.left - 2
        const endY = targetRect.top + Math.min(36, Math.max(24, targetRect.height / 2)) - layerRect.top

        if (![startX, startY, endX, endY].every(Number.isFinite) || endX <= startX + 4) {
          path.removeAttribute('d')
          continue
        }
        path.setAttribute('d', buildRoundedConnectorPath(startX, startY, endX, endY, bendX))
      }
    }

    const schedule = (): void => {
      if (frameId != null) return
      frameId = requestFrame(measure)
    }

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    resizeObserver?.observe(layer)
    anchors.forEach((anchor) => resizeObserver?.observe(anchor))
    targets.forEach((target) => resizeObserver?.observe(target))

    const scrollTarget = scrollRoot ?? window
    // 侧栏自身在矮窗口下可内部滚动, 同样会移动锚点
    const sidebar = layer.querySelector('aside')
    scrollTarget.addEventListener('scroll', schedule, { passive: true })
    sidebar?.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()

    return () => {
      if (frameId != null) cancelFrame(frameId)
      resizeObserver?.disconnect()
      scrollTarget.removeEventListener('scroll', schedule)
      sidebar?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [layerRef, pathRefs, stageIds])
}

function HookLifecycleConnectors({
  groups,
  activeStageId,
  pathRefs
}: {
  groups: HookStageGroup[]
  activeStageId: string | null
  pathRefs: RefObject<Map<string, SVGPathElement>>
}): React.ReactElement {
  return (
    <svg
      data-testid="hook-lifecycle-connectors"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full overflow-visible lg:block"
    >
      {[...groups].sort((first, second) => {
        const firstActive = activeStageId === first.id
        const secondActive = activeStageId === second.id
        if (firstActive === secondActive) return 0
        return firstActive ? 1 : -1
      }).map((group) => {
        const active = activeStageId === group.id
        return (
          <path
            key={group.id}
            ref={(element) => {
              if (element) pathRefs.current.set(group.id, element)
              else pathRefs.current.delete(group.id)
            }}
            data-hook-connector-stage={group.id}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className={cn(
              'transition-[color,stroke-width] duration-200',
              active ? 'stroke-[2.75] text-foreground/70' : 'stroke-1 text-border/80'
            )}
          />
        )
      })}
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

function findConnectorGapCenterX(layer: HTMLElement, layerRect: DOMRect): number | null {
  const rail = layer.querySelector<HTMLElement>('aside[aria-label]')
  const stageColumn = rail?.nextElementSibling instanceof HTMLElement ? rail.nextElementSibling : null
  if (!rail || !stageColumn) return null

  const railRect = rail.getBoundingClientRect()
  const stageColumnRect = stageColumn.getBoundingClientRect()
  const gapCenterX = railRect.right + (stageColumnRect.left - railRect.right) / 2 - layerRect.left + HOOK_CONNECTOR_BEND_OFFSET_PX
  return Number.isFinite(gapCenterX) ? gapCenterX : null
}

function buildRoundedConnectorPath(startX: number, startY: number, endX: number, endY: number, bendX?: number | null): string {
  const midX = Number.isFinite(bendX) ? Number(bendX) : startX + (endX - startX) / 2
  const balancedEndX = Math.max(endX, midX + Math.abs(midX - startX))
  const deltaY = endY - startY
  const direction = deltaY >= 0 ? 1 : -1
  const radius = Math.min(
    14,
    Math.abs(midX - startX) / 2,
    Math.abs(balancedEndX - midX) / 2,
    Math.max(0, Math.abs(deltaY) / 2)
  )

  if (radius < 1) return `M ${startX} ${startY} H ${midX} V ${endY} H ${balancedEndX}`

  return [
    `M ${startX} ${startY}`,
    `H ${midX - radius}`,
    `Q ${midX} ${startY} ${midX} ${startY + direction * radius}`,
    `V ${endY - direction * radius}`,
    `Q ${midX} ${endY} ${midX + radius} ${endY}`,
    `H ${balancedEndX}`
  ].join(' ')
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
  const Icon = healthToneIcon(tone)

  return (
    <FloatingPopover
      id={id}
      role="tooltip"
      side="bottom"
      align="start"
      contentClassName="w-80 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg"
      trigger={(
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            healthToneClass(tone),
            buttonClassName
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className={labelClassName}>{label}</span>
        </button>
      )}
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
    </FloatingPopover>
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
  hookSchemas,
  isFocused = () => false
}: {
  group: HookStageGroup
  agentView: AgentView
  hookSchemas: HookSchemaMap
  isFocused?: (id: string) => boolean
}): React.ReactElement {
  const { t } = useTranslation()

  if (!group.stage) {
    return <UnknownHookSection group={group} agentView={agentView} hookSchemas={hookSchemas} isFocused={isFocused} />
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
        <HookEventList group={group} agentView={agentView} hookSchemas={hookSchemas} isFocused={isFocused} />
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
  hookSchemas,
  isFocused = () => false
}: {
  group: HookStageGroup
  agentView: AgentView
  hookSchemas: HookSchemaMap
  isFocused?: (id: string) => boolean
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
        <HookEventList group={group} agentView={agentView} hookSchemas={hookSchemas} isFocused={isFocused} />
      </div>
    </section>
  )
}

function HookEventList({
  group,
  agentView,
  hookSchemas,
  isFocused = () => false
}: {
  group: HookStageGroup
  agentView: AgentView
  hookSchemas: HookSchemaMap
  isFocused?: (id: string) => boolean
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
              <HookAssetRow key={hook.id} hook={hook} agentView={agentView} hookSchemas={hookSchemas} focused={isFocused(hook.id)} />
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
  hookSchemas,
  focused = false
}: {
  hook: Asset
  agentView: AgentView
  hookSchemas: HookSchemaMap
  focused?: boolean
}): React.ReactElement {
  const { t } = useTranslation()
  const origin = pluginOriginOf(hook)
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
    <div
      id={`hook-row-${hook.id}`}
      className={cn('px-3 py-3', focused && cn(FOCUS_HIGHLIGHT_CLASS, 'rounded-md'))}
    >
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
            {origin && <PluginOriginBadge pluginId={origin.pluginId} pluginName={origin.pluginName} />}
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
            {(equivalentSourceCount > 1 || hook.meta.disabledByDisableAllHooks === true) && (
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
  // The global disableAllHooks switch overrides individual enablement.
  if (hook.meta.disabledByDisableAllHooks === true) return false
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

  const disabledKeys = openStates
    .filter((state) => state.availability !== 'available')
    .map((state) => state.action as string)
  const showNote = availableCount === 0
  if (showNote) disabledKeys.push('no-open-targets')

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button
          size="sm"
          variant="bordered"
          startContent={<MoreHorizontal className="h-3.5 w-3.5" />}
          className="h-auto shrink-0 gap-1.5 border-border px-2.5 py-1 text-xs font-medium text-foreground data-[hover=true]:bg-muted/70"
        >
          {t('capabilities.hooks.actions.menu')}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={t('capabilities.hooks.actions.menu')}
        variant="flat"
        disabledKeys={disabledKeys}
        onAction={(key) => {
          const state = openStates.find((item) => item.action === key)
          if (state) void openPath(state)
        }}
        emptyContent={t('capabilities.hooks.actions.noOpenTargets')}
      >
        {[
          ...openStates.map((state) => (
            <DropdownItem key={state.action} startContent={iconForAction(state.action)}>
              {t(`capabilities.hooks.actions.${state.action}`)}
            </DropdownItem>
          )),
          ...(showNote
            ? [
                <DropdownItem
                  key="no-open-targets"
                  textValue={t('capabilities.hooks.actions.noOpenTargets')}
                  className="text-muted-foreground"
                >
                  {t('capabilities.hooks.actions.noOpenTargets')}
                </DropdownItem>
              ]
            : [])
        ]}
      </DropdownMenu>
    </Dropdown>
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
  // agentId==='all' 的健康检查对所有 agent 恒显; 其余走共享任意-agentId 匹配器
  // (取代旧的 claude/codex 钳死分支, 修复任意 agent 过滤时误落 codex 的 bug)。
  if (check.agentId === 'all') return true
  return matchesAgentView(check.agentId, agentView)
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
