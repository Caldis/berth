import { useMemo, useState } from 'react'
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
import { TokenUsageDisplay } from '@/components/shared/token-usage-display'
import type { SessionArtifacts, SessionDetailResult, SessionToolEvent } from '@shared/types/ipc'

type Translate = ReturnType<typeof useTranslation>['t']

export function SessionDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { detail, loading } = useSessionDetail(id ?? '')

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['tools', 'skills', 'mcp', 'hooks', 'plans', 'todos', 'files', 'checkpoints'])
  )

  const toggleSection = (key: string): void => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const summary = detail?.summary

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

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/sessions')}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="text-xs text-muted-foreground">
            {t('sessions.title')} / Session #{id?.slice(0, 8)}
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {loading
              ? t('common.loading')
              : summary?.title || `Session #${id?.slice(0, 8)}`}
          </h1>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : !detail ? (
        <EmptyState icon={FileText} message={t('common.empty')} />
      ) : (
        <>
          <SessionSummaryPanel detail={detail} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
            <div className="space-y-6">
              {/* Tool timeline */}
              <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <h2 className="text-sm font-medium">{t('sessions.toolTimeline')}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t('sessions.toolTimelineDescription')}
                    </p>
                  </div>
                  <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {toolTimeline.length}
                  </span>
                </div>
                <ToolTimeline events={toolTimeline} />
              </div>
            </div>

            <div className="space-y-6">
              {signals && <SessionSignalsPanel signals={signals} />}

          {/* Loaded Assets */}
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

            {/* Skills used */}
            <CollapsibleSection
              title={t('sessions.skillsUsed')}
              count={detail.skillsUsed.length}
              icon={Sparkles}
              expanded={expandedSections.has('skills')}
              onToggle={() => toggleSection('skills')}
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

            {/* MCP servers */}
            <CollapsibleSection
              title={t('sessions.mcpConnected')}
              count={detail.mcpServers.length}
              icon={Plug}
              expanded={expandedSections.has('mcp')}
              onToggle={() => toggleSection('mcp')}
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

            {/* Hooks fired */}
            <CollapsibleSection
              title={t('sessions.hooksFired')}
              count={hooksByEvent.reduce((sum, h) => sum + h.count, 0)}
              icon={Zap}
              expanded={expandedSections.has('hooks')}
              onToggle={() => toggleSection('hooks')}
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

            </div>
          </div>

          {/* Artifacts */}
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
                {/* Plans */}
                <CollapsibleSection
                  title={t('sessions.plans')}
                  count={artifacts.plans.length}
                  icon={FileText}
                  expanded={expandedSections.has('plans')}
                  onToggle={() => toggleSection('plans')}
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

                {/* Todos */}
                <CollapsibleSection
                  title={t('sessions.todos')}
                  count={artifacts.todos.length}
                  icon={CheckSquare}
                  expanded={expandedSections.has('todos')}
                  onToggle={() => toggleSection('todos')}
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

                {/* Files */}
                <CollapsibleSection
                  title={t('sessions.files')}
                  count={artifacts.files.length}
                  icon={FileText}
                  expanded={expandedSections.has('files')}
                  onToggle={() => toggleSection('files')}
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

                {/* Checkpoints */}
                <CollapsibleSection
                  title={t('sessions.checkpoints')}
                  count={checkpointCount}
                  icon={History}
                  expanded={expandedSections.has('checkpoints')}
                  onToggle={() => toggleSection('checkpoints')}
                >
                  <CheckpointsContent
                    checkpoints={artifacts.checkpoints}
                    totalCount={checkpointCount}
                  />
                </CollapsibleSection>
              </>
            )}
          </div>
        </>
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

interface SessionSignals {
  toolCount: number
  failedCount: number
  failedRate: number | null
  avgToolDurationMs: number | null
  slowestTool: { name: string; durationMs: number } | null
  tokenRatePerMinute: number | null
  cacheReadShare: number | null
  costRatePerMinute: number | null
}

function SessionSummaryPanel({ detail }: { detail: SessionDetailResult }): React.ReactElement {
  const { t } = useTranslation()
  const { summary } = detail

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
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
          <span className="inline-flex w-fit items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            {summary.model || t('common.unknown')}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
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
          label={t('sessions.started')}
          value={formatOptionalRelativeTime(summary.startedAt)}
          icon={Clock}
        />
        <MetaItem
          label={t('sessions.project')}
          value={truncatePath(summary.projectPath || summary.project, 72)}
        />
      </div>
    </div>
  )
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
      <SectionEmpty
        title={t('sessions.checkpointSummary.noDetailsTitle', { count: totalCount })}
        description={t('sessions.checkpointSummary.noDetailsDescription')}
      />
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
    <div>
      <div className="border-b border-border bg-muted/10 px-4 py-3">
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
        <div data-testid="tool-timeline-scroll" className="max-h-[720px] overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="relative min-w-0">
            <span className="absolute bottom-0 left-[25px] top-0 w-px bg-border" aria-hidden="true" />
            {filteredEvents.map((event) => {
              const durationMs = getToolDurationMs(event)
              const toolTip = getToolTip(event, t)
              const evidence = getToolEvidence(event)
              return (
                <div
                  key={event.id}
                  className="relative grid min-h-9 grid-cols-[1.25rem_minmax(0,1fr)_minmax(3.5rem,4rem)] items-center gap-2 px-4 py-1.5 text-xs transition-colors hover:bg-accent/5 sm:grid-cols-[1.25rem_minmax(0,10rem)_minmax(0,1fr)_minmax(3.75rem,4.5rem)_minmax(3.5rem,4.25rem)]"
                >
                  <span className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-card">
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
    tokenRatePerMinute: sessionMinutes == null ? null : detail.summary.tokenUsage.totalTokens / sessionMinutes,
    cacheReadShare: inputSideTokens > 0
      ? (detail.summary.tokenUsage.cacheReadInputTokens / inputSideTokens) * 100
      : null,
    costRatePerMinute: detail.summary.cost == null || sessionMinutes == null
      ? null
      : detail.summary.cost / sessionMinutes
  }
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
