import { useCallback, useMemo, useState } from 'react'
import { Tabs, Tab } from '@/components/ui'
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
  ListVideo,
  Info
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
import { EmptyState, PAGE_EMPTY_FILL } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { LoadingState } from '@/components/shared/loading-state'
import { TokenUsageDisplay } from '@/components/shared/token-usage-display'
import { usePageChrome, type PageChromeConfig } from '@/components/layout/page-chrome'
import { SessionReplay, type SessionReplayViewState } from '@/components/sessions/session-replay'
import type { SessionArtifacts, SessionDetailResult, SessionToolEvent } from '@shared/types/ipc'

type Translate = ReturnType<typeof useTranslation>['t']
type SessionDetailTab = 'overview' | 'replay' | 'artifacts'
type SessionTabCounts = Record<SessionDetailTab, number | null>

export function SessionDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { detail, loading, error, reload } = useSessionDetail(id ?? '')

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['tools', 'skills', 'mcp', 'hooks', 'plans', 'todos', 'files', 'checkpoints'])
  )
  const [activeTab, setActiveTab] = useState<SessionDetailTab>('overview')
  // 重放视图状态提升到页面层 — HeroUI Tabs 默认销毁非活动 panel, 切 tab 不丢选中/过滤。
  const [replayViewState, setReplayViewState] = useState<SessionReplayViewState>({
    selectedEventId: null,
    kindFilter: null,
    searchQuery: ''
  })
  const [replayCount, setReplayCount] = useState<number | null>(null)
  const handleReplayLoadedCount = useCallback((count: number | null) => setReplayCount(count), [])

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
  const signals = useMemo(() => detail ? buildSessionSignals(detail) : null, [detail])
  const loadedAssetCount = detail
    ? detail.skillsUsed.length + detail.mcpServers.length + hooksByEvent.length
    : 0
  const checkpointCount = artifacts.checkpoints.length || detail?.fileHistoryCount || 0
  const artifactCount = artifacts.plans.length + artifacts.todos.length + artifacts.files.length + checkpointCount
  const tabCounts: SessionTabCounts = {
    overview: loadedAssetCount + countSignalHighlights(signals),
    replay: replayCount,
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
      ) : error && !detail ? (
        <div className={cn('flex flex-col', PAGE_EMPTY_FILL)}>
          <ErrorState
            fullHeight
            title={t('sessions.errorDetailTitle')}
            description={t('sessions.errorDetailDescription')}
            onRetry={reload}
          />
        </div>
      ) : !detail ? (
        <div className={cn('flex flex-col', PAGE_EMPTY_FILL)}>
          <EmptyState
            fullHeight
            icon={FileText}
            title={t('sessions.emptyDetailTitle')}
            description={t('sessions.emptyDetailDescription')}
          />
        </div>
      ) : (
        // GH-116: HeroUI 原生 solid 分段式 (cursor 滑动动画), 每个 tab 带图标 (用户要求)。
        <Tabs
          aria-label={t('sessions.tabs.label', { defaultValue: 'Session detail sections' })}
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as SessionDetailTab)}
          variant="solid"
          size="md"
          classNames={{
            panel: 'px-0 pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          }}
        >
          <Tab key="overview" title={<SessionTabTitle item={sessionTabMeta(t, tabCounts).overview} />}>
            <SessionOverviewTab
              detail={detail}
              signals={signals}
              loadedAssetCount={loadedAssetCount}
              hooksByEvent={hooksByEvent}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          </Tab>
          <Tab key="replay" title={<SessionTabTitle item={sessionTabMeta(t, tabCounts).replay} />}>
            <SessionReplay
              sessionId={detail.summary.id}
              viewState={replayViewState}
              onViewStateChange={setReplayViewState}
              onLoadedCount={handleReplayLoadedCount}
            />
          </Tab>
          <Tab key="artifacts" title={<SessionTabTitle item={sessionTabMeta(t, tabCounts).artifacts} />}>
            <SessionArtifactsTab
              artifacts={artifacts}
              artifactCount={artifactCount}
              checkpointCount={checkpointCount}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          </Tab>
        </Tabs>
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

interface SessionTabMetaItem {
  value: SessionDetailTab
  label: string
  description: string
  count: number | null
  icon: React.ComponentType<{ className?: string }>
}

function sessionTabMeta(
  t: (key: string, opts?: { defaultValue?: string }) => string,
  counts: SessionTabCounts
): Record<SessionDetailTab, SessionTabMetaItem> {
  return {
    overview: {
      value: 'overview',
      label: t('sessions.tabs.overview', { defaultValue: 'Overview' }),
      description: t('sessions.tabs.overviewDescription', { defaultValue: 'Run metrics and session signals' }),
      count: counts.overview,
      icon: Activity
    },
    replay: {
      value: 'replay',
      label: t('sessions.tabs.replay', { defaultValue: 'Replay' }),
      description: t('sessions.tabs.replayDescription', { defaultValue: 'Full conversation replay with raw records' }),
      count: counts.replay,
      icon: ListVideo
    },
    artifacts: {
      value: 'artifacts',
      label: t('sessions.tabs.artifacts', { defaultValue: 'Artifacts' }),
      description: t('sessions.tabs.artifactsDescription', { defaultValue: 'Plans, todos, files, checkpoints' }),
      count: counts.artifacts,
      icon: FileText
    }
  }
}

// HeroUI Tab `title` slot 内容: 图标 + 标签 + 计数 (GH-116 用户要求每个 tab 带图标)。
// 外层 Tab 自带 `group` + `data-selected`, 计数徽章随选中态着色; 描述降级为 title 提示。
function SessionTabTitle({ item }: { item: SessionTabMetaItem }): React.ReactElement {
  const Icon = item.icon
  return (
    <span className="flex items-center gap-1.5" title={item.description}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="font-medium">{item.label}</span>
      {item.count != null && (
        <span className="rounded-md bg-default-200/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground transition-colors group-data-[selected=true]:bg-primary/10 group-data-[selected=true]:text-primary">
          {formatNumber(item.count)}
        </span>
      )}
    </span>
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
  tokenRateDurationSeconds: number | null
  tokenRateSource: SessionDetailResult['activityMetrics']['tokenRateSource']
  tokenRateStartedAt: string | null
  tokenRateEndedAt: string | null
  tokenRateTokenCount: number | null
  tokenRateSampleCount: number
  tokenRateIdleGapSeconds: number
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
          explanation={<TokenConsumptionRateExplanation signals={signals} />}
          explanationLabel={t('sessions.signals.tokenRateFormulaA11y')}
          explanationTestId="token-consumption-rate-explanation"
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
  explanation,
  explanationLabel,
  explanationTestId,
  tone = 'default',
  className
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  detail?: string
  explanation?: React.ReactNode
  explanationLabel?: string
  explanationTestId?: string
  tone?: 'default' | 'danger'
  className?: string
}): React.ReactElement {
  return (
    <div className={cn('min-w-0 bg-card p-3', className)}>
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className={cn('h-3.5 w-3.5', tone === 'danger' && 'text-destructive')} />
        <span className="truncate">{label}</span>
        {explanation && (
          <span className="group relative ml-auto shrink-0">
            <button
              type="button"
              aria-label={explanationLabel}
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Info className="h-3 w-3" />
            </button>
            <span
              data-testid={explanationTestId}
              role="tooltip"
              className="pointer-events-none absolute right-0 top-6 z-20 hidden w-[min(22rem,calc(100vw-3rem))] rounded-lg border border-border bg-popover p-3 text-left text-xs normal-case tracking-normal text-popover-foreground shadow-lg group-hover:block group-focus-within:block"
            >
              {explanation}
            </span>
          </span>
        )}
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

function TokenConsumptionRateExplanation({ signals }: { signals: SessionSignals }): React.ReactElement {
  const { t } = useTranslation()
  const ratePerMinute = signals.tokenRatePerMinute
  const tokenCount = signals.tokenRateTokenCount
  const durationSeconds = signals.tokenRateDurationSeconds
  const hasFormula =
    ratePerMinute != null &&
    tokenCount != null &&
    durationSeconds != null &&
    durationSeconds > 0

  if (!hasFormula) {
    return (
      <span className="block space-y-2">
        <span className="block font-medium text-popover-foreground">
          {t('sessions.signals.tokenRateFormulaUnavailable')}
        </span>
        <span className="block leading-5 text-muted-foreground">
          {t('sessions.signals.tokenRateFormulaUnavailableDetail')}
        </span>
      </span>
    )
  }

  const minutes = formatFormulaMinutes(durationSeconds)
  const idleGapMinutes = formatFormulaMinutes(signals.tokenRateIdleGapSeconds)
  const tokenText = t('sessions.signals.tokenRateFormulaTokenValue', {
    tokens: formatNumber(tokenCount)
  })
  const minuteText = t('sessions.signals.tokenRateFormulaMinuteValue', { minutes })
  const rateText = `${formatRate(ratePerMinute)} tok/min`

  return (
    <span className="block space-y-2">
      <span className="block font-medium text-popover-foreground">
        {t('sessions.signals.tokenRateFormulaTitle')}
      </span>
      <span className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
        <FormulaPart label={t('sessions.signals.tokenRateFormulaTokens')} value={tokenText} />
        <span className="text-center text-muted-foreground">/</span>
        <FormulaPart label={t('sessions.signals.tokenRateFormulaMinutes')} value={minuteText} />
        <span className="text-center text-muted-foreground">=</span>
        <FormulaPart label={t('sessions.signals.tokenRateFormulaResult')} value={rateText} />
      </span>
      <span className="block border-t border-border pt-2 leading-5 text-muted-foreground">
        {t('sessions.signals.tokenRateFormulaWindow', {
          start: formatTooltipTimestamp(signals.tokenRateStartedAt),
          end: formatTooltipTimestamp(signals.tokenRateEndedAt),
          samples: signals.tokenRateSampleCount
        })}
      </span>
      <span className="block leading-5 text-muted-foreground">
        {t('sessions.signals.tokenRateIdleGapRule', { minutes: idleGapMinutes })}
      </span>
      <span className="block leading-5 text-muted-foreground">
        {t('sessions.signals.tokenRateFormulaLocalEstimate')}
      </span>
    </span>
  )
}

function FormulaPart({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <span className="min-w-0 rounded-md border border-border bg-background px-2 py-1">
      <span className="block truncate text-[10px] font-medium uppercase text-muted-foreground">{label}</span>
      <span className="block truncate font-mono text-[11px] text-popover-foreground">{value}</span>
    </span>
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
    tokenRateDurationSeconds: detail.activityMetrics.tokenRateDurationSeconds,
    tokenRateSource: detail.activityMetrics.tokenRateSource,
    tokenRateStartedAt: detail.activityMetrics.tokenRateStartedAt,
    tokenRateEndedAt: detail.activityMetrics.tokenRateEndedAt,
    tokenRateTokenCount: detail.activityMetrics.tokenRateTokenCount,
    tokenRateSampleCount: detail.activityMetrics.tokenRateSampleCount,
    tokenRateIdleGapSeconds: detail.activityMetrics.tokenRateIdleGapSeconds,
    cacheReadShare: inputSideTokens > 0
      ? (detail.summary.tokenUsage.cacheReadInputTokens / inputSideTokens) * 100
      : null,
    costRatePerMinute: detail.summary.cost == null || sessionMinutes == null
      ? null
      : detail.summary.cost / sessionMinutes
  }
}

function tokenRateSourceLabel(
  _source: SessionDetailResult['activityMetrics']['tokenRateSource'],
  t: Translate
): string {
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

function formatRate(value: number): string {
  return Number.isInteger(value) ? formatNumber(value) : value.toFixed(1)
}

function formatFormulaMinutes(seconds: number): string {
  const minutes = seconds / 60
  return Number.isInteger(minutes) ? formatNumber(minutes) : minutes.toFixed(1)
}

function formatTooltipTimestamp(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
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
