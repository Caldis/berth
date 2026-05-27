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
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber, formatRelativeTime } from '@/lib/utils'
import { useSessionDetail } from '@/hooks/use-ipc'
import { ScopeBadge } from '@/components/shared/scope-badge'
import { EmptyState } from '@/components/shared/empty-state'

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const min = Math.floor(seconds / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  const remainMin = min % 60
  return remainMin > 0 ? `${hr}h ${remainMin}m` : `${hr}h`
}

export function SessionDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { detail, loading } = useSessionDetail(id ?? '')

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['skills', 'mcp', 'hooks'])
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
                value={summary?.project ?? '-'}
              />
              <MetaItem
                label={t('sessions.model')}
                value={
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {summary?.model ?? '-'}
                  </span>
                }
              />
              <MetaItem
                label={t('sessions.duration')}
                value={summary ? formatDuration(summary.duration) : '-'}
                icon={Clock}
              />
              <MetaItem
                label={t('sessions.cost')}
                value={summary ? formatCurrency(summary.cost) : '-'}
                icon={Coins}
              />
              <MetaItem
                label={t('sessions.tokens')}
                value={summary ? formatNumber(summary.tokens) : '-'}
                icon={Hash}
              />
              <MetaItem
                label="Started"
                value={
                  summary
                    ? formatRelativeTime(new Date(summary.startedAt))
                    : '-'
                }
                icon={Clock}
              />
            </div>
          </div>

          {/* Loaded Assets */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">{t('sessions.loadedAssets')}</h2>
            </div>

            {/* Skills used */}
            <CollapsibleSection
              title={t('sessions.skillsUsed')}
              count={detail.skillsUsed.length}
              icon={Sparkles}
              expanded={expandedSections.has('skills')}
              onToggle={() => toggleSection('skills')}
            >
              {detail.skillsUsed.length === 0 ? (
                <p className="px-4 py-2 text-xs text-muted-foreground">{t('common.empty')}</p>
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
                <p className="px-4 py-2 text-xs text-muted-foreground">{t('common.empty')}</p>
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
                <p className="px-4 py-2 text-xs text-muted-foreground">{t('common.empty')}</p>
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

            {/* Plans */}
            <CollapsibleSection
              title="Plans"
              count={detail.plans.length}
              icon={FileText}
              expanded={expandedSections.has('plans')}
              onToggle={() => toggleSection('plans')}
            >
              {detail.plans.length === 0 ? (
                <p className="px-4 py-2 text-xs text-muted-foreground">{t('common.empty')}</p>
              ) : (
                <div className="divide-y divide-border">
                  {detail.plans.map((plan) => (
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
              title="Todos"
              count={detail.todos.length}
              icon={CheckSquare}
              expanded={expandedSections.has('todos')}
              onToggle={() => toggleSection('todos')}
            >
              {detail.todos.length === 0 ? (
                <p className="px-4 py-2 text-xs text-muted-foreground">{t('common.empty')}</p>
              ) : (
                <div className="divide-y divide-border">
                  {detail.todos.map((todo) => (
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

            {/* File history */}
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
              <div className="flex items-center gap-3">
                <History className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-card-foreground">File history checkpoints</span>
              </div>
              <span className="text-xs text-muted-foreground">{detail.fileHistoryCount}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* --- Sub-components --- */

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
