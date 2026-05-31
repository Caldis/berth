import { useState } from 'react'
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
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  XCircle,
  Circle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatOptionalCurrency,
  formatOptionalDuration,
  formatOptionalRelativeTime,
  truncatePath
} from '@/lib/utils'
import { useSessionDetail } from '@/hooks/use-ipc'
import { ScopeBadge } from '@/components/shared/scope-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { TokenUsageDisplay } from '@/components/shared/token-usage-display'
import type { SessionArtifacts, SessionToolEvent } from '@shared/types/ipc'

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
  const loadedAssetCount = detail
    ? detail.skillsUsed.length + detail.mcpServers.length + hooksByEvent.length
    : 0
  const artifactCount = artifacts.plans.length + artifacts.todos.length + artifacts.files.length + artifacts.checkpoints.length

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
          {/* Metadata */}
          <div className="rounded-xl border border-border bg-card">
            <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-6">
              <MetaItem
                label={t('sessions.project')}
                value={summary ? truncatePath(summary.projectPath || summary.project, 64) : '-'}
              />
              <MetaItem
                label={t('sessions.model')}
                value={
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {summary?.model || t('common.unknown')}
                  </span>
                }
              />
              <MetaItem
                label={t('sessions.duration')}
                value={summary ? formatOptionalDuration(summary.duration) : '-'}
                icon={Clock}
              />
              <MetaItem
                label={t('sessions.cost')}
                value={summary ? formatOptionalCurrency(summary.cost) : '-'}
                icon={Coins}
              />
              <MetaItem
                label={t('sessions.tokens')}
                value={summary ? <TokenUsageDisplay usage={summary.tokenUsage} mode="detail" /> : '-'}
                icon={Hash}
              />
              <MetaItem
                label={t('sessions.started')}
                value={summary ? formatOptionalRelativeTime(summary.startedAt) : '-'}
                icon={Clock}
              />
            </div>
          </div>

          {/* Tool timeline */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">{t('sessions.toolTimeline')}</h2>
              <span className="text-xs text-muted-foreground">{toolTimeline.length}</span>
            </div>
            <ToolTimeline events={toolTimeline} />
          </div>

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
                  count={artifacts.checkpoints.length || detail.fileHistoryCount}
                  icon={History}
                  expanded={expandedSections.has('checkpoints')}
                  onToggle={() => toggleSection('checkpoints')}
                >
                  {artifacts.checkpoints.length === 0 ? (
                    <SectionEmpty
                      title={t('sessions.emptyStates.checkpoints.title')}
                      description={t('sessions.emptyStates.checkpoints.description')}
                    />
                  ) : (
                    <div className="divide-y divide-border">
                      {artifacts.checkpoints.map((checkpoint) => (
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
                    </div>
                  )}
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

function ToolTimeline({ events }: { events: SessionToolEvent[] }): React.ReactElement {
  const { t } = useTranslation()

  if (events.length === 0) {
    return (
      <SectionEmpty
        title={t('sessions.emptyStates.toolTimeline.title')}
        description={t('sessions.emptyStates.toolTimeline.description')}
      />
    )
  }

  return (
    <div className="max-h-[560px] divide-y divide-border overflow-y-auto">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-3 px-4 py-3">
          <div className="flex w-5 flex-col items-center">
            <TimelineStatusIcon status={event.status} />
            {index < events.length - 1 && <div className="mt-1 h-full w-px bg-border" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-card-foreground">{event.name}</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {event.category}
              </span>
              {event.mcpServer && (
                <span className="rounded-md bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-600 dark:text-green-400">
                  {event.mcpServer}
                </span>
              )}
              {event.skillName && (
                <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-600 dark:text-blue-400">
                  {event.skillName}
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {formatOptionalRelativeTime(event.startedAt)}
              </span>
            </div>
            {event.summary && (
              <p className="mt-1 truncate text-xs text-muted-foreground">{event.summary}</p>
            )}
            {event.filePaths.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {event.filePaths.slice(0, 4).map((filePath) => (
                  <span
                    key={filePath}
                    className="max-w-full truncate rounded-md bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {truncatePath(filePath, 72)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
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
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-card-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {typeof value === 'string' ? <span>{value}</span> : value}
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
