import { useMemo, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Sparkles,
  Plug,
  Zap,
  FileText,
  CheckSquare,
  Square,
  History,
  Clock,
  Coins,
  Hash,
  Activity,
  Gauge,
  TimerReset,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  XCircle,
  Circle,
  Info,
  SlidersHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatOptionalCurrency,
  formatOptionalDuration,
  formatOptionalRelativeTime,
  formatNumber,
  truncatePath
} from '@/lib/utils'
import { useSessionDetail } from '@/hooks/use-ipc'
import { ScopeBadge } from '@/components/shared/scope-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { TokenUsageDisplay } from '@/components/shared/token-usage-display'
import { usePageChrome, type PageChromeConfig } from '@/components/layout/page-chrome'
import type { SessionArtifacts, SessionDetailResult, SessionToolEvent } from '@shared/types/ipc'

type Translate = ReturnType<typeof useTranslation>['t']
type SessionDetailTab = 'overview' | 'timeline' | 'artifacts'
type SessionTabCounts = Record<SessionDetailTab, number>

export function SessionDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { detail, loading } = useSessionDetail(id ?? '')

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['tools', 'skills', 'mcp', 'hooks', 'plans', 'todos', 'files', 'checkpoints'])
  )
  const [activeTab, setActiveTab] = useState<SessionDetailTab>('overview')

  const toggleSection = (key: string): void => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const summary = detail?.summary
  const fallbackTitle = t('sessions.fallbackTitle', { id: id?.slice(0, 8) ?? '' })
  const pageTitle = summary?.title || fallbackTitle
  const pageChrome = useMemo<PageChromeConfig>(() => ({
    title: pageTitle,
    parentLabel: t('sessions.title'),
    leading: (
      <button
        type="button"
        onClick={() => navigate('/sessions')}
        aria-label={`${t('common.back')} ${t('sessions.title')}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
    )
  }), [navigate, pageTitle, t])
  usePageChrome(pageChrome, [pageChrome])

  // Group hooks by event
  const hooksByEvent = detail?.hooksFired ?? []
  const artifacts = detail?.artifacts ?? emptyArtifacts()
  const toolTimeline = detail?.toolTimeline ?? []
  const signals = useMemo(() => detail ? buildSessionSignals(detail) : null, [detail])
  const loadedAssetCount = detail
    ? detail.skillsUsed.length + detail.mcpServers.length + hooksByEvent.length
    : 0
  const checkpointCount = artifacts.checkpoints.length || detail?.fileHistoryCount || 0
  const artifactCount = artifacts.plans.length + artifacts.todos.length + artifacts.files.length + checkpointCount
  const tabCounts: SessionTabCounts = {
    overview: loadedAssetCount + countSignalHighlights(signals),
    timeline: toolTimeline.length,
    artifacts: artifactCount
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <LoadingState
          icon={FileText}
          title={t('sessions.loadingDetail')}
          description={t('sessions.loadingDetailDescription')}
          rows={4}
        />
      ) : !detail ? (
        <EmptyState
          icon={FileText}
          title={t('sessions.emptyDetailTitle')}
          description={t('sessions.emptyDetailDescription')}
        />
      ) : (
        <Tabs.Root
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as SessionDetailTab)}
          className="space-y-4"
        >
          <SessionDetailTabs counts={tabCounts} />
          <Tabs.Content
            value="overview"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SessionOverviewTab
              detail={detail}
              signals={signals}
              loadedAssetCount={loadedAssetCount}
              hooksByEvent={hooksByEvent}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          </Tabs.Content>
          <Tabs.Content
            value="timeline"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SessionTimelineTab events={toolTimeline} />
          </Tabs.Content>
          <Tabs.Content
            value="artifacts"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SessionArtifactsTab
              artifacts={artifacts}
              artifactCount={artifactCount}
              checkpointCount={checkpointCount}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          </Tabs.Content>
        </Tabs.Root>
      )}
    </div>
  )
}

/* --- Sub-components --- */

function emptyArtifacts(): SessionArtifacts {
  return {
    plans: [],
    todos: [],
    files: [],
    checkpoints: []
  }
}

function SessionDetailTabs({ counts }: { counts: SessionTabCounts }): React.ReactElement {
  const { t } = useTranslation()
  const items: Array<{
    value: SessionDetailTab
    label: string
    description: string
    count: number
    icon: React.ComponentType<{ className?: string }>
  }> = [
    {
      value: 'overview',
      label: t('sessions.tabs.overview', { defaultValue: 'Overview' }),
      description: t('sessions.tabs.overviewDescription', { defaultValue: 'Run metrics and session signals' }),
      count: counts.overview,
      icon: Activity
    },
    {
      value: 'timeline',
      label: t('sessions.tabs.timeline', { defaultValue: 'Timeline' }),
      description: t('sessions.tabs.timelineDescription', { defaultValue: 'Tool calls, filters, and latency' }),
      count: counts.timeline,
      icon: Wrench
    },
    {
      value: 'artifacts',
      label: t('sessions.tabs.artifacts', { defaultValue: 'Artifacts' }),
      description: t('sessions.tabs.artifactsDescription', { defaultValue: 'Plans, todos, files, checkpoints' }),
      count: counts.artifacts,
      icon: FileText
    }
  ]

  return (
    <Tabs.List
      aria-label={t('sessions.tabs.label', { defaultValue: 'Session detail sections' })}
      className="grid gap-2 rounded-xl border border-border bg-card/80 p-2 shadow-sm sm:grid-cols-3"
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Tabs.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              'group min-w-0 rounded-lg border border-transparent px-3 py-3 text-left transition-colors',
              'hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:shadow-sm'
            )}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-card-foreground">
                    {item.label}
                  </span>
                  <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">
                    {formatNumber(item.count)}
                  </span>
                </span>
                <span className="mt-0.5 hidden truncate text-xs text-muted-foreground md:block">
                  {item.description}
                </span>
              </span>
            </span>
          </Tabs.Trigger>
        )
      })}
    </Tabs.List>
  )
}

function SessionOverviewTab({
  detail,
  signals,
  loadedAssetCount,
  hooksByEvent,
  expandedSections,
  onToggleSection
}: {
  detail: SessionDetailResult
  signals: SessionSignals | null
  loadedAssetCount: number
  hooksByEvent: SessionDetailResult['hooksFired']
  expandedSections: Set<string>
  onToggleSection: (key: string) => void
}): React.ReactElement {
  return (
    <div className="space-y-4">
      <SessionSummaryPanel detail={detail} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]">
        {signals && <SessionSignalsPanel signals={signals} />}
        <LoadedAssetsPanel
          detail={detail}
          hooksByEvent={hooksByEvent}
          loadedAssetCount={loadedAssetCount}
          expandedSections={expandedSections}
          onToggleSection={onToggleSection}
        />
      </div>
    </div>
  )
}

function LoadedAssetsPanel({
  detail,
  hooksByEvent,
  loadedAssetCount,
  expandedSections,
  onToggleSection
}: {
  detail: SessionDetailResult
  hooksByEvent: SessionDetailResult['hooksFired']
  loadedAssetCount: number
  expandedSections: Set<string>
  onToggleSection: (key: string) => void
}): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">{t('sessions.loadedAssets')}</h2>
      </div>

      {loadedAssetCount === 0 && (
        <SectionEmpty
          title={t('sessions.emptyStates.loadedAssets.title')}
          description={t('sessions.emptyStates.loadedAssets.description')}
        />
      )}

      <CollapsibleSection
        title={t('sessions.skillsUsed')}
        count={detail.skillsUsed.length}
        icon={Sparkles}
        expanded={expandedSections.has('skills')}
        onToggle={() => onToggleSection('skills')}
      >
        {detail.skillsUsed.length === 0 ? (
          <SectionEmpty
            title={t('sessions.emptyStates.skills.title')}
            description={t('sessions.emptyStates.skills.description')}
          />
        ) : (
          <div className="divide-y divide-border">
            {detail.skillsUsed.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center gap-3 px-4 py-2 text-sm"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span className="truncate font-medium text-card-foreground">
                  {skill.name}
                </span>
                <ScopeBadge scope={skill.scope} />
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title={t('sessions.mcpConnected')}
        count={detail.mcpServers.length}
        icon={Plug}
        expanded={expandedSections.has('mcp')}
        onToggle={() => onToggleSection('mcp')}
      >
        {detail.mcpServers.length === 0 ? (
          <SectionEmpty
            title={t('sessions.emptyStates.mcp.title')}
            description={t('sessions.emptyStates.mcp.description')}
          />
        ) : (
          <div className="divide-y divide-border">
            {detail.mcpServers.map((server) => {
              const hasError = Boolean(server.meta?.error)
              return (
                <div
                  key={server.id}
                  className="flex items-center gap-3 px-4 py-2 text-sm"
                >
                  <Plug
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      hasError ? 'text-destructive' : 'text-green-500'
                    )}
                  />
                  <span className="truncate font-medium text-card-foreground">
                    {server.name}
                  </span>
                  <ScopeBadge scope={server.scope} />
                  {hasError && (
                    <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title={t('sessions.hooksFired')}
        count={hooksByEvent.reduce((sum, h) => sum + h.count, 0)}
        icon={Zap}
        expanded={expandedSections.has('hooks')}
        onToggle={() => onToggleSection('hooks')}
      >
        {hooksByEvent.length === 0 ? (
          <SectionEmpty
            title={t('sessions.emptyStates.hooks.title')}
            description={t('sessions.emptyStates.hooks.description')}
          />
        ) : (
          <div className="divide-y divide-border">
            {hooksByEvent.map((h) => (
              <div
                key={h.event}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Zap className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
                  <span className="font-mono text-xs text-card-foreground">{h.event}</span>
                </div>
                <span className="text-xs text-muted-foreground">{h.count}x</span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  )
}

function SessionTimelineTab({ events }: { events: SessionToolEvent[] }): React.ReactElement {
  const { t } = useTranslation()

  return (
    <section data-testid="session-timeline-tab" className="min-w-0 space-y-3">
      <div className="flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-card-foreground">{t('sessions.toolTimeline')}</h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            {t('sessions.toolTimelineDescription')}
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground">
          {formatNumber(events.length)}
        </span>
      </div>
      <ToolTimeline events={events} />
    </section>
  )
}

function SessionArtifactsTab({
  artifacts,
  artifactCount,
  checkpointCount,
  expandedSections,
  onToggleSection
}: {
  artifacts: SessionArtifacts
  artifactCount: number
  checkpointCount: number
  expandedSections: Set<string>
  onToggleSection: (key: string) => void
}): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">{t('sessions.artifacts')}</h2>
      </div>

      {artifactCount === 0 ? (
        <SectionEmpty
          title={t('sessions.emptyStates.artifacts.title')}
          description={t('sessions.emptyStates.artifacts.description')}
        />
      ) : (
        <>
          <CollapsibleSection
            title={t('sessions.plans')}
            count={artifacts.plans.length}
            icon={FileText}
            expanded={expandedSections.has('plans')}
            onToggle={() => onToggleSection('plans')}
          >
            {artifacts.plans.length === 0 ? (
              <SectionEmpty
                title={t('sessions.emptyStates.plans.title')}
                description={t('sessions.emptyStates.plans.description')}
              />
            ) : (
              <div className="divide-y divide-border">
                {artifacts.plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center gap-3 px-4 py-2 text-sm"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-card-foreground">{plan.title}</span>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title={t('sessions.todos')}
            count={artifacts.todos.length}
            icon={CheckSquare}
            expanded={expandedSections.has('todos')}
            onToggle={() => onToggleSection('todos')}
          >
            {artifacts.todos.length === 0 ? (
              <SectionEmpty
                title={t('sessions.emptyStates.todos.title')}
                description={t('sessions.emptyStates.todos.description')}
              />
            ) : (
              <div className="divide-y divide-border">
                {artifacts.todos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 px-4 py-2 text-sm"
                  >
                    {todo.done ? (
                      <CheckSquare className="h-3.5 w-3.5 shrink-0 text-green-500" />
                    ) : (
                      <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        'truncate text-card-foreground',
                        todo.done && 'line-through text-muted-foreground'
                      )}
                    >
                      {todo.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title={t('sessions.files')}
            count={artifacts.files.length}
            icon={FileText}
            expanded={expandedSections.has('files')}
            onToggle={() => onToggleSection('files')}
          >
            {artifacts.files.length === 0 ? (
              <SectionEmpty
                title={t('sessions.emptyStates.files.title')}
                description={t('sessions.emptyStates.files.description')}
              />
            ) : (
              <div className="divide-y divide-border">
                {artifacts.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 px-4 py-2 text-sm"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-card-foreground">
                      {truncatePath(file.path, 96)}
                    </span>
                    {file.operation && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {file.operation}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{file.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title={t('sessions.checkpoints')}
            count={checkpointCount}
            icon={History}
            expanded={expandedSections.has('checkpoints')}
            onToggle={() => onToggleSection('checkpoints')}
          >
            <CheckpointsContent
              checkpoints={artifacts.checkpoints}
              totalCount={checkpointCount}
            />
          </CollapsibleSection>
        </>
      )}
    </div>
  )
}

interface SessionSignals {
  toolCount: number
  failedCount: number
  failedRate: number | null
  avgToolDurationMs: number | null
  slowestTool: { name: string; durationMs: number } | null
  tokenRatePerMinute: number | null
  tokenRateSource: SessionDetailResult['activityMetrics']['tokenRateSource']
  cacheReadShare: number | null
  costRatePerMinute: number | null
}

function countSignalHighlights(signals: SessionSignals | null): number {
  if (!signals) return 0
  let count = 0
  if (signals.failedCount > 0) count += 1
  if (signals.slowestTool) count += 1
  if (signals.cacheReadShare != null && signals.cacheReadShare > 50) count += 1
  return count
}

function SessionSummaryPanel({ detail }: { detail: SessionDetailResult }): React.ReactElement {
  const { t } = useTranslation()
  const { summary } = detail

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {summary.agentId === 'codex' ? 'Codex' : 'Claude Code'}
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-card-foreground">
              {t('sessions.sessionOverview')}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
              {truncatePath(summary.projectPath || summary.project, 96)}
            </p>
          </div>
          <ModelBadge
            model={summary.model}
            modelInfo={detail.modelInfo}
            tokenUsage={summary.tokenUsage}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetaItem
          label={t('sessions.duration')}
          value={formatOptionalDuration(summary.duration)}
          icon={Clock}
        />
        <MetaItem
          label={t('sessions.cost')}
          value={formatOptionalCurrency(summary.cost)}
          icon={Coins}
        />
        <MetaItem
          label={t('sessions.tokens')}
          value={
            <TokenUsageDisplay
              usage={summary.tokenUsage}
              mode="detail"
              showTextBreakdown={false}
              legendDensity="compact"
            />
          }
          icon={Hash}
        />
        <MetaItem
          label={t('sessions.time', { defaultValue: 'Time' })}
          value={<TimeMetaValue startedAt={summary.startedAt} />}
          icon={Clock}
        />
      </div>
    </div>
  )
}

function ModelBadge({
  model,
  modelInfo,
  tokenUsage
}: {
  model: string
  modelInfo: SessionDetailResult['modelInfo']
  tokenUsage: SessionDetailResult['summary']['tokenUsage']
}): React.ReactElement {
  const { t } = useTranslation()
  const displayModel = model || t('common.unknown')
  const pricing = modelInfo?.pricing ?? null
  const provider = modelInfo?.provider ?? t('common.unknown')
  const releaseDate = modelInfo?.releaseDate
    ? formatDisplayDate(modelInfo.releaseDate)
    : t('sessions.modelInfo.notRecorded', { defaultValue: 'Not recorded' })
  const knowledgeCutoff = modelInfo?.knowledgeCutoff
    ? formatDisplayDate(modelInfo.knowledgeCutoff)
    : t('sessions.modelInfo.notRecorded', { defaultValue: 'Not recorded' })

  return (
    <span className="group relative inline-flex w-fit">
      <span
        tabIndex={0}
        className="inline-flex max-w-[18rem] items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary outline-none transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="truncate">{displayModel}</span>
        <Info className="h-3 w-3 shrink-0" />
      </span>
      <span className="pointer-events-none absolute right-0 top-8 z-20 hidden w-[24rem] rounded-xl border border-border bg-popover p-3 text-left text-xs text-popover-foreground shadow-lg group-hover:block group-focus-within:block">
        <span className="block truncate text-sm font-semibold text-card-foreground">
          {displayModel}
        </span>
        <span className="mt-2 grid grid-cols-2 gap-2">
          <ModelInfoField
            label={t('sessions.modelInfo.provider', { defaultValue: 'Provider' })}
            value={provider}
            detail={formatProviderSource(modelInfo?.providerSource, t)}
          />
          <ModelInfoField
            label={t('sessions.modelInfo.releaseDate', { defaultValue: 'Model date' })}
            value={releaseDate}
            detail={formatReleaseDateSource(modelInfo?.releaseDateSource, t)}
          />
          <ModelInfoField
            label={t('sessions.modelInfo.contextWindow', { defaultValue: 'Context' })}
            value={pricing?.contextWindow == null ? '—' : `${formatNumber(pricing.contextWindow)} tok`}
          />
          <ModelInfoField
            label={t('sessions.modelInfo.maxOutput', { defaultValue: 'Max output' })}
            value={pricing?.maxOutputTokens == null ? '—' : `${formatNumber(pricing.maxOutputTokens)} tok`}
          />
          <ModelInfoField
            label={t('sessions.modelInfo.knowledgeCutoff', { defaultValue: 'Knowledge cutoff' })}
            value={knowledgeCutoff}
            className="col-span-2"
          />
        </span>

        <span className="mt-3 block rounded-lg bg-muted/40 p-2">
          <span className="block font-medium text-card-foreground">
            {t('sessions.modelInfo.pricingTitle', { defaultValue: 'Price per 1M tokens' })}
          </span>
          {pricing ? (
            <span className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 tabular-nums text-muted-foreground">
              <span>{t('usage.inputTokens')}: {formatPerMillionCost(pricing.inputCostPerMillion)}</span>
              <span>{t('usage.outputTokens')}: {formatPerMillionCost(pricing.outputCostPerMillion)}</span>
              <span>{t('usage.cacheTokens')}: {formatOptionalPerMillionCost(pricing.cacheReadInputCostPerMillion)}</span>
              <span>{t('usage.reasoningTokens')}: {formatOptionalPerMillionCost(pricing.reasoningOutputCostPerMillion)}</span>
            </span>
          ) : (
            <span className="mt-1 block text-muted-foreground">
              {t('sessions.modelInfo.noPricing', { defaultValue: 'No local pricing match for this model id.' })}
            </span>
          )}
          {pricing && (
            <span className="mt-1 block text-[11px] text-muted-foreground/80">
              {t('sessions.modelInfo.pricingSource', {
                defaultValue: 'Source: {{source}} · matched {{model}}',
                source: pricing.source,
                model: pricing.matchedProvider
                  ? `${pricing.matchedProvider}/${pricing.matchedModel}`
                  : pricing.matchedModel
              })}
            </span>
          )}
        </span>

        <span className="mt-2 block text-[11px] leading-4 text-muted-foreground">
          {tokenUsage.hasBreakdown
            ? t('sessions.modelInfo.cacheSourceFromTranscript', {
                defaultValue: 'Cache tokens come from transcript usage fields such as cache_read_input_tokens, cache_creation_input_tokens, and cached_input_tokens. Berth does not infer cache hits from text.'
              })
            : t('sessions.modelInfo.cacheSourceUnavailable', {
                defaultValue: 'This transcript did not expose a token breakdown, so Berth cannot identify cache tokens.'
              })}
        </span>
        {modelInfo?.referenceUrl && (
          <a
            href={modelInfo.referenceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-[11px] font-medium text-primary hover:underline"
          >
            {t('sessions.modelInfo.referenceLink', { defaultValue: 'Open official model reference' })}
          </a>
        )}
      </span>
    </span>
  )
}

function ModelInfoField({
  label,
  value,
  detail,
  className
}: {
  label: string
  value: string
  detail?: string
  className?: string
}): React.ReactElement {
  return (
    <span className={cn('min-w-0 rounded-md border border-border/70 bg-background px-2 py-1.5', className)}>
      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="mt-0.5 block truncate font-medium text-card-foreground">{value}</span>
      {detail && <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{detail}</span>}
    </span>
  )
}

function TimeMetaValue({ startedAt }: { startedAt: string | null }): React.ReactElement {
  return (
    <div className="min-w-0">
      <span className="block text-xl font-semibold tabular-nums text-card-foreground">
        {formatSessionDate(startedAt)}
      </span>
      <span className="mt-1 block truncate text-xs text-muted-foreground">
        {formatOptionalRelativeTime(startedAt)}
      </span>
    </div>
  )
}

function formatProviderSource(
  source: string | undefined,
  t: Translate
): string | undefined {
  if (source === 'model-id') {
    return t('sessions.modelInfo.providerSourceModelId', { defaultValue: 'inferred from model id' })
  }
  if (source === 'pricing-catalog') {
    return t('sessions.modelInfo.providerSourcePricing', { defaultValue: 'from pricing catalog' })
  }
  if (source === 'agent') {
    return t('sessions.modelInfo.providerSourceAgent', { defaultValue: 'inferred from agent' })
  }
  return undefined
}

function formatReleaseDateSource(
  source: string | null | undefined,
  t: Translate
): string | undefined {
  if (source === 'model-id') {
    return t('sessions.modelInfo.releaseSourceModelId', { defaultValue: 'from model id' })
  }
  if (source === 'model-catalog') {
    return t('sessions.modelInfo.releaseSourceModelCatalog', { defaultValue: 'from model reference' })
  }
  return undefined
}

function formatSessionDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}

function formatDisplayDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(date.getUTCDate())}`
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0')
}

function formatPerMillionCost(value: number): string {
  return `${new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value < 1 ? 3 : 2
  }).format(value)}/1M`
}

function formatOptionalPerMillionCost(value: number | undefined): string {
  return value == null ? '—' : formatPerMillionCost(value)
}

function SessionSignalsPanel({ signals }: { signals: SessionSignals }): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">{t('sessions.signals.title')}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('sessions.signals.description')}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border">
        <SignalMetric
          icon={Activity}
          label={t('sessions.signals.toolCalls')}
          value={formatNumber(signals.toolCount)}
        />
        <SignalMetric
          icon={AlertTriangle}
          label={t('sessions.signals.failedTools')}
          value={`${signals.failedCount} / ${signals.toolCount}`}
          detail={formatOptionalPercentage(signals.failedRate)}
          tone={signals.failedCount > 0 ? 'danger' : 'default'}
        />
        <SignalMetric
          icon={TimerReset}
          label={t('sessions.signals.avgToolTime')}
          value={formatNullableDurationMs(signals.avgToolDurationMs)}
        />
        <SignalMetric
          icon={Gauge}
          label={t('sessions.signals.slowestTool')}
          value={signals.slowestTool?.name ?? '—'}
          detail={signals.slowestTool ? formatDurationMs(signals.slowestTool.durationMs) : undefined}
        />
        <SignalMetric
          icon={Hash}
          label={t('sessions.signals.tokenRate')}
          value={signals.tokenRatePerMinute == null ? '—' : `${formatRate(signals.tokenRatePerMinute)} tok/min`}
          detail={tokenRateSourceLabel(signals.tokenRateSource, t)}
        />
        <SignalMetric
          icon={Coins}
          label={t('sessions.signals.costRate')}
          value={signals.costRatePerMinute == null ? '—' : `${formatOptionalCurrency(signals.costRatePerMinute)}/min`}
        />
        <SignalMetric
          icon={Zap}
          label={t('sessions.signals.cacheReadShare')}
          value={formatOptionalPercentage(signals.cacheReadShare)}
          className="col-span-2"
        />
      </div>
    </div>
  )
}

function SignalMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'default',
  className
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  detail?: string
  tone?: 'default' | 'danger'
  className?: string
}): React.ReactElement {
  return (
    <div className={cn('min-w-0 bg-card p-3', className)}>
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className={cn('h-3.5 w-3.5', tone === 'danger' && 'text-destructive')} />
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          'mt-1 truncate text-lg font-semibold tabular-nums text-card-foreground',
          tone === 'danger' && 'text-destructive'
        )}
      >
        {value}
      </div>
      {detail && <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

function CheckpointsContent({
  checkpoints,
  totalCount
}: {
  checkpoints: SessionArtifacts['checkpoints']
  totalCount: number
}): React.ReactElement {
  const { t } = useTranslation()
  const checkpointsWithFiles = checkpoints.filter((checkpoint) => checkpoint.fileCount > 0)
  const checkpointsWithoutDetails = Math.max(0, totalCount - checkpointsWithFiles.length)

  if (totalCount === 0) {
    return (
      <SectionEmpty
        title={t('sessions.emptyStates.checkpoints.title')}
        description={t('sessions.emptyStates.checkpoints.description')}
      />
    )
  }

  if (checkpointsWithFiles.length === 0) {
    return (
      <div className="px-4 py-3">
        <p className="text-xs font-medium text-card-foreground">
          {t('sessions.checkpointSummary.noDetailsTitle', { count: totalCount })}
        </p>
        <p className="mt-1 max-w-[70ch] text-xs leading-5 text-muted-foreground">
          {t('sessions.checkpointSummary.noDetailsDescription')}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <CheckpointMetric
            label={t('sessions.checkpointSummary.recordedCount', { defaultValue: 'Recorded' })}
            value={formatNumber(totalCount)}
          />
          <CheckpointMetric
            label={t('sessions.checkpointSummary.fileLists', { defaultValue: 'File lists' })}
            value={formatNumber(checkpointsWithFiles.length)}
          />
          <CheckpointMetric
            label={t('sessions.checkpointSummary.missingDetails', { defaultValue: 'Missing details' })}
            value={formatNumber(checkpointsWithoutDetails)}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground/80">
          {t('sessions.checkpointSummary.availableFields', {
            defaultValue: 'If the transcript exposes checkpoint timestamps, changed paths, or file counts later, Berth can list those fields here.'
          })}
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {checkpointsWithFiles.map((checkpoint) => (
        <div
          key={checkpoint.id}
          className="flex items-center gap-3 px-4 py-2 text-sm"
        >
          <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-card-foreground">{checkpoint.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatOptionalRelativeTime(checkpoint.timestamp)}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {checkpoint.fileCount}
          </span>
        </div>
      ))}
      {checkpointsWithoutDetails > 0 && (
        <div className="px-4 py-2 text-xs text-muted-foreground">
          {t('sessions.checkpointSummary.omittedNoDetails', { count: checkpointsWithoutDetails })}
        </div>
      )}
    </div>
  )
}

function CheckpointMetric({
  label,
  value
}: {
  label: string
  value: string
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-card-foreground">{value}</p>
    </div>
  )
}

function ToolTimeline({ events }: { events: SessionToolEvent[] }): React.ReactElement {
  const { t } = useTranslation()
  const [durationThresholdMs, setDurationThresholdMs] = useState(0)
  const [statusFilter, setStatusFilter] = useState<'all' | 'failed'>('all')
  const durationRange = useMemo(() => buildDurationFilterRange(events), [events])
  const activeThresholdMs = Math.min(durationThresholdMs, durationRange.maxMs)
  const failedEvents = useMemo(() => events.filter((event) => event.status === 'error'), [events])
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (statusFilter === 'failed' && event.status !== 'error') return false
      if (activeThresholdMs <= 0) return true
      const durationMs = getToolDurationMs(event)
      return durationMs != null && durationMs >= activeThresholdMs
    })
  }, [activeThresholdMs, events, statusFilter])
  const durationProgress = durationRange.maxMs > 0
    ? `${Math.min(100, (activeThresholdMs / durationRange.maxMs) * 100)}%`
    : '0%'

  if (events.length === 0) {
    return (
      <SectionEmpty
        title={t('sessions.emptyStates.toolTimeline.title')}
        description={t('sessions.emptyStates.toolTimeline.description')}
      />
    )
  }

  return (
    <div className="min-w-0">
      <div className="border-b border-border bg-background/80 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t('sessions.toolFilter.showing', {
                  shown: filteredEvents.length,
                  total: events.length
                })}
              </span>
              {activeThresholdMs > 0 && (
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-medium tabular-nums text-primary">
                  {t('sessions.toolFilter.minDuration', {
                    duration: formatDurationMs(activeThresholdMs)
                  })}
                </span>
              )}
            </div>
            <div className="inline-flex rounded-lg border border-border bg-background p-0.5 text-xs">
              <button
                type="button"
                aria-pressed={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors',
                  statusFilter === 'all'
                    ? 'bg-card text-card-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-card-foreground'
                )}
              >
                {t('sessions.toolFilter.allStatuses', { defaultValue: 'All' })}
                <span className="tabular-nums text-muted-foreground">{events.length}</span>
              </button>
              <button
                type="button"
                aria-pressed={statusFilter === 'failed'}
                onClick={() => setStatusFilter('failed')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors',
                  statusFilter === 'failed'
                    ? 'bg-destructive/10 text-destructive'
                    : 'text-muted-foreground hover:text-card-foreground'
                )}
              >
                {t('sessions.toolFilter.failedOnly', { defaultValue: 'Failed' })}
                <span className="tabular-nums text-muted-foreground">{failedEvents.length}</span>
              </button>
            </div>
          </div>

          <label className="grid gap-2 text-xs text-muted-foreground">
            <span className="flex items-center justify-between">
              <span>{t('sessions.toolFilter.label')}</span>
              <span className="font-medium tabular-nums text-card-foreground">
                {formatDurationThreshold(activeThresholdMs, t)}
              </span>
            </span>
            <div className="flex items-center gap-3">
              <span className="w-5 shrink-0 tabular-nums text-muted-foreground">0</span>
              <input
                aria-label={t('sessions.toolFilter.ariaLabel')}
                type="range"
                min={0}
                max={durationRange.maxMs}
                step={durationRange.stepMs}
                value={activeThresholdMs}
                disabled={durationRange.maxMs === 0}
                onChange={(event) => setDurationThresholdMs(Number(event.target.value))}
                style={{ '--duration-filter-progress': durationProgress } as React.CSSProperties & Record<string, string>}
                className="duration-filter-range min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span className="w-12 shrink-0 text-right tabular-nums text-card-foreground">
                {durationRange.maxMs <= 0 ? '—' : formatDurationMs(durationRange.maxMs)}
              </span>
            </div>
          </label>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <SectionEmpty
          title={t('sessions.toolFilter.emptyTitle')}
          description={t('sessions.toolFilter.emptyDescription')}
        />
      ) : (
        <div data-testid="tool-timeline-scroll" className="min-h-[420px] max-h-[calc(100vh-17rem)] overflow-y-auto overflow-x-hidden overscroll-contain pr-2 [scrollbar-gutter:stable]">
          <div className="relative min-w-0">
            <span className="absolute bottom-0 left-[18px] top-0 w-px bg-border" aria-hidden="true" />
            {filteredEvents.map((event) => {
              const durationMs = getToolDurationMs(event)
              const toolTip = getToolTip(event, t)
              const evidence = getToolEvidence(event)
              return (
                <div
                  key={event.id}
                  className="relative grid min-h-8 grid-cols-[1.25rem_minmax(0,1fr)_minmax(3.5rem,4rem)] items-center gap-2 px-2 py-1.5 text-xs transition-colors hover:bg-accent/5 sm:grid-cols-[1.25rem_minmax(0,11rem)_minmax(0,1fr)_minmax(3.75rem,4.5rem)_minmax(3.5rem,4.25rem)]"
                >
                  <span className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-background">
                    <TimelineStatusIcon status={event.status} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-medium text-card-foreground" title={event.name}>
                        {event.name}
                      </span>
                      <ToolTipButton toolName={event.name} tip={toolTip} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="rounded bg-muted px-1 py-0.5 text-[10px] leading-none text-muted-foreground">
                        {event.category}
                      </span>
                      {event.mcpServer && (
                        <span className="truncate rounded bg-green-500/10 px-1 py-0.5 text-[10px] leading-none text-green-600 dark:text-green-400">
                          {event.mcpServer}
                        </span>
                      )}
                      {event.skillName && (
                        <span className="truncate rounded bg-blue-500/10 px-1 py-0.5 text-[10px] leading-none text-blue-600 dark:text-blue-400">
                          {event.skillName}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="hidden min-w-0 truncate text-muted-foreground sm:block" title={evidence}>
                    {evidence}
                  </span>
                  <span className="hidden text-right tabular-nums text-muted-foreground sm:block">
                    {formatOptionalRelativeTime(event.startedAt)}
                  </span>
                  <span className="min-w-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-right font-medium tabular-nums text-primary">
                    {durationMs == null ? t('sessions.durationUnknown') : formatDurationMs(durationMs)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function buildDurationFilterRange(events: SessionToolEvent[]): { maxMs: number; stepMs: number } {
  const maxDuration = events.reduce((max, event) => {
    const durationMs = getToolDurationMs(event)
    return durationMs == null ? max : Math.max(max, durationMs)
  }, 0)
  if (maxDuration <= 0) return { maxMs: 0, stepMs: 1 }
  if (maxDuration <= 1000) return { maxMs: Math.ceil(maxDuration / 100) * 100, stepMs: 50 }
  if (maxDuration <= 10_000) return { maxMs: Math.ceil(maxDuration / 500) * 500, stepMs: 250 }
  if (maxDuration <= 60_000) return { maxMs: Math.ceil(maxDuration / 1000) * 1000, stepMs: 1000 }
  return { maxMs: Math.ceil(maxDuration / 10_000) * 10_000, stepMs: 5000 }
}

function getToolEvidence(event: SessionToolEvent): string {
  if (event.summary) return event.summary
  if (event.filePaths.length > 0) return event.filePaths.map((filePath) => truncatePath(filePath, 96)).join(', ')
  if (event.skillName) return event.skillName
  if (event.mcpServer) return event.mcpServer
  return '—'
}

function getToolTip(event: SessionToolEvent, t: Translate): string {
  return t(`sessions.toolTips.${getToolTipKey(event)}`)
}

function getToolTipKey(event: SessionToolEvent): string {
  const name = event.name.toLowerCase()
  if (name === 'askuserquestion') return 'askUser'
  if (name === 'agent' || name === 'task') return 'agent'
  if (name === 'skill') return 'skill'
  if (name === 'bash' || name === 'powershell' || name.includes('shell') || name.includes('exec')) return 'shell'
  if (name === 'read' || name === 'ls' || name.includes('readmcpresource')) return 'fileRead'
  if (name === 'edit' || name === 'multiedit' || name === 'write' || name === 'notebookedit') return 'fileWrite'
  if (name === 'grep' || name === 'glob' || name === 'lsp' || name.includes('search_openai_docs')) return 'fileSearch'
  if (name === 'webfetch' || name === 'websearch' || name === 'web_search' || name.includes('fetch_openai_doc')) return 'web'
  if (name.startsWith('task') || name === 'todowrite' || name === 'update_plan') return 'tasks'
  if (name === 'apply_patch' || name === 'patch_apply') return 'patch'
  if (event.category === 'mcp' || name.includes('mcp') || name.startsWith('mcp__')) return 'mcp'
  if (name.startsWith('browser_') || name.includes('playwright')) return 'browser'
  if (name === 'view_image' || name === 'senduserfile') return 'image'
  if (name === 'load_workspace_dependencies') return 'workspace'
  if (name === 'spawn_agent' || name === 'wait_agent' || name === 'close_agent') return 'multiAgent'
  if (name.includes('hook')) return 'hook'
  if (name.includes('planmode')) return 'plan'
  return 'generic'
}

function ToolTipButton({
  toolName,
  tip
}: {
  toolName: string
  tip: string
}): React.ReactElement {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={`${toolName}: ${tip}`}
        title={`${toolName}: ${tip}`}
        className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent/10 hover:text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="h-3 w-3" />
      </button>
      <span className="pointer-events-none absolute left-0 top-5 z-20 hidden w-72 rounded-lg border border-border bg-popover px-3 py-2 text-xs leading-5 text-popover-foreground shadow-lg group-hover:block group-focus-within:block">
        {tip}
      </span>
    </span>
  )
}

function buildSessionSignals(detail: SessionDetailResult): SessionSignals {
  const durations = detail.toolTimeline
    .map((event) => ({ event, durationMs: getToolDurationMs(event) }))
    .filter((entry): entry is { event: SessionToolEvent; durationMs: number } => entry.durationMs != null)
  const durationTotal = durations.reduce((sum, entry) => sum + entry.durationMs, 0)
  const slowest = durations.reduce<{ event: SessionToolEvent; durationMs: number } | null>(
    (max, entry) => (max == null || entry.durationMs > max.durationMs ? entry : max),
    null
  )
  const sessionMinutes = detail.summary.duration != null && detail.summary.duration > 0
    ? detail.summary.duration / 60
    : null
  const inputSideTokens =
    detail.summary.tokenUsage.inputTokens +
    detail.summary.tokenUsage.cacheReadInputTokens +
    detail.summary.tokenUsage.cacheCreationInputTokens
  const failedCount = detail.toolTimeline.filter((event) => event.status === 'error').length

  return {
    toolCount: detail.toolTimeline.length,
    failedCount,
    failedRate: detail.toolTimeline.length > 0 ? (failedCount / detail.toolTimeline.length) * 100 : null,
    avgToolDurationMs: durations.length > 0 ? durationTotal / durations.length : null,
    slowestTool: slowest ? { name: slowest.event.name, durationMs: slowest.durationMs } : null,
    tokenRatePerMinute: detail.activityMetrics.tokenRatePerMinute,
    tokenRateSource: detail.activityMetrics.tokenRateSource,
    cacheReadShare: inputSideTokens > 0
      ? (detail.summary.tokenUsage.cacheReadInputTokens / inputSideTokens) * 100
      : null,
    costRatePerMinute: detail.summary.cost == null || sessionMinutes == null
      ? null
      : detail.summary.cost / sessionMinutes
  }
}

function tokenRateSourceLabel(
  source: SessionDetailResult['activityMetrics']['tokenRateSource'],
  t: Translate
): string {
  if (source === 'usage-events') return t('sessions.signals.tokenRateSourceUsageEvents')
  return t('sessions.signals.tokenRateSourceUnavailable')
}

function getToolDurationMs(event: SessionToolEvent): number | null {
  if (typeof event.durationMs === 'number' && Number.isFinite(event.durationMs) && event.durationMs >= 0) {
    return event.durationMs
  }
  if (!event.startedAt || !event.endedAt) return null
  const start = new Date(event.startedAt).getTime()
  const end = new Date(event.endedAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  const duration = end - start
  return duration > 0 ? duration : null
}

function formatNullableDurationMs(value: number | null): string {
  return value == null ? '—' : formatDurationMs(value)
}

function formatDurationMs(value: number): string {
  if (value < 1000) return `${Math.max(1, Math.round(value))}ms`
  const seconds = value / 1000
  if (seconds < 60) {
    return `${Number.isInteger(seconds) ? seconds.toFixed(0) : seconds.toFixed(1)}s`
  }
  const minutes = seconds / 60
  return `${Number.isInteger(minutes) ? minutes.toFixed(0) : minutes.toFixed(1)}m`
}

function formatDurationThreshold(value: number, t: Translate): string {
  return value <= 0 ? t('sessions.toolFilter.allDurations') : formatDurationMs(value)
}

function formatRate(value: number): string {
  return Number.isInteger(value) ? formatNumber(value) : value.toFixed(1)
}

function formatOptionalPercentage(value: number | null): string {
  if (value == null) return '—'
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}%`
}

function SectionEmpty({
  title,
  description
}: {
  title: string
  description: string
}): React.ReactElement {
  return (
    <div className="px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 max-w-[70ch] text-xs leading-5 text-muted-foreground/75">{description}</p>
    </div>
  )
}

function TimelineStatusIcon({
  status
}: {
  status: SessionToolEvent['status']
}): React.ReactElement {
  if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === 'error') return <XCircle className="h-4 w-4 text-destructive" />
  if (status === 'pending') return <Circle className="h-4 w-4 text-yellow-500" />
  return <Wrench className="h-4 w-4 text-muted-foreground" />
}

function MetaItem({
  label,
  value,
  icon: Icon
}: {
  label: string
  value: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}): React.ReactElement {
  return (
    <div className="flex min-h-[118px] min-w-0 flex-col rounded-lg border border-border/70 bg-muted/15 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-auto min-w-0 pt-6">
        {typeof value === 'string' ? (
          <span className="block min-w-0 truncate text-2xl font-semibold tabular-nums text-card-foreground">
            {value}
          </span>
        ) : (
          <div className="min-w-0 text-card-foreground">{value}</div>
        )}
      </div>
    </div>
  )
}

function CollapsibleSection({
  title,
  count,
  icon: Icon,
  expanded,
  onToggle,
  children
}: {
  title: string
  count: number
  icon: React.ComponentType<{ className?: string }>
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="border-t border-border">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-accent/5"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm text-card-foreground">{title}</span>
        <span className="ml-auto text-xs text-muted-foreground">{count}</span>
      </button>
      {expanded && children}
    </div>
  )
}
