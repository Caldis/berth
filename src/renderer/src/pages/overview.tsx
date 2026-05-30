import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  Sparkles,
  Plug,
  MessageSquare,
  Puzzle,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Clock,
  Coins,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react'
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import { formatCurrency, formatOptionalCurrency, formatOptionalRelativeTime, truncatePath } from '@/lib/utils'
import { useSessions, useUsageSummary, useHealthChecks } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import { computeStatsForAssets, filterAssetsByAgentView } from '@/lib/agent-view'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import type { HealthCheck } from '@shared/types/ipc'
import { TokenUsageDisplay } from '@/components/shared/token-usage-display'

export function Overview(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const allStats = useAppStore((s) => s.stats)
  const assets = useAppStore((s) => s.assets)
  const agentView = useAppStore((s) => s.agentView)
  const stats = useMemo(() => {
    if (agentView === 'all') return allStats
    return computeStatsForAssets(filterAssetsByAgentView(assets, agentView))
  }, [agentView, allStats, assets])
  const { sessions, loading: sessionsLoading } = useSessions({ limit: 5, agentView })
  const { usage } = useUsageSummary(7, agentView)
  const { checks } = useHealthChecks()
  const [copiedFixId, setCopiedFixId] = useState<string | null>(null)

  const statCards = [
    {
      label: 'Skills',
      value: stats.skills,
      icon: Sparkles,
      color: 'text-blue-500',
      path: '/configuration/instructions'
    },
    {
      label: 'MCP',
      value: stats.mcpServers,
      icon: Plug,
      color: 'text-green-500',
      path: '/configuration/capabilities'
    },
    {
      label: t('nav.sessions'),
      value: stats.sessions,
      icon: MessageSquare,
      color: 'text-accent',
      path: '/sessions'
    },
    {
      label: 'Plugins',
      value: stats.plugins,
      icon: Puzzle,
      color: 'text-purple-500',
      path: '/configuration/capabilities'
    }
  ]

  const healthGroups = useMemo(() => groupHealthChecks(checks), [checks])

  const dailyCosts = usage?.dailyCosts ?? []
  const totalCost = usage?.totalCost ?? 0
  const hasKnownCost = usage != null && usage.costSource !== 'unknown'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('overview.title')}</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card, i) => (
          <StatCard
            key={card.label}
            value={card.value}
            label={card.label}
            icon={card.icon}
            color={card.color}
            delay={i * 50}
            onClick={() => navigate(card.path)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent sessions */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">{t('overview.recentSessions')}</h2>
            {sessions.length > 0 && (
              <button
                onClick={() => navigate('/sessions')}
                className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('nav.sessions')}
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {sessionsLoading ? (
            <p className="p-4 text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : sessions.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={MessageSquare} message={t('common.empty')} className="border-0 py-8" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => navigate(`/sessions/${session.id}`)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {session.title || `Session #${session.id.slice(0, 8)}`}
                    </p>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatOptionalRelativeTime(session.startedAt)}
                      </span>
                      <span className="truncate">
                        {truncatePath(session.projectPath || session.project || t('common.unknown'), 56)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      {formatOptionalCurrency(session.cost)}
                    </span>
                    <TokenUsageDisplay usage={session.tokenUsage} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cost chart */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">{t('overview.costLast7Days')}</h2>
            <span className="text-sm font-semibold text-card-foreground">
              {hasKnownCost ? formatCurrency(totalCost) : '—'}
            </span>
          </div>
          {dailyCosts.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Coins} message={t('common.empty')} className="border-0 py-8" />
            </div>
          ) : (
            <div className="p-4">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyCosts} barCategoryGap="20%">
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => {
                      const d = new Date(v)
                      return `${d.getMonth() + 1}/${d.getDate()}`
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: 12
                    }}
                    labelFormatter={(v: string) => new Date(v).toLocaleDateString()}
                    formatter={(v: number) => [formatCurrency(v), t('sessions.cost')]}
                  />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                    {dailyCosts.map((_entry, index) => (
                      <Cell
                        key={index}
                        fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                        opacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Health checks */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">{t('overview.healthChecks')}</h2>
        </div>
        {checks.length === 0 ? (
          <div className="flex items-center gap-2 p-4">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">{t('overview.noIssues')}</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {healthGroups.map((group) => (
              <div key={group.agentId}>
                <div className="flex items-center justify-between bg-muted/20 px-4 py-2">
                  <span className="text-xs font-medium text-muted-foreground">{group.agentName}</span>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {group.errors > 0 && <span>{group.errors} error</span>}
                    {group.warnings > 0 && <span>{group.warnings} warning</span>}
                    {group.info > 0 && <span>{group.info} info</span>}
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {group.checks.map((check) => {
                    const clickable = Boolean(check.target?.route || check.target?.path || check.path || check.assetId)
                    const activateCheck = (): void => {
                      if (check.target?.route) {
                        navigate(check.target.route)
                        return
                      }
                      const targetPath = check.target?.path ?? check.path
                      if (targetPath) {
                        void window.api.shell.openPath(targetPath)
                        return
                      }
                      if (check.assetId) {
                        navigate(`/configuration/capabilities`)
                      }
                    }
                    const copyFixSnippet = (event: React.MouseEvent, snippet: string): void => {
                      event.stopPropagation()
                      void navigator.clipboard?.writeText(snippet).then(() => {
                        setCopiedFixId(check.id)
                      })
                    }
                    return (
                      <div
                        key={check.id}
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        onClick={clickable ? activateCheck : undefined}
                        onKeyDown={(event) => {
                          if (!clickable) return
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            activateCheck()
                          }
                        }}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                          clickable ? 'hover:bg-accent/5' : 'cursor-default'
                        )}
                      >
                        <HealthCheckIcon severity={check.severity} />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-card-foreground">
                              {check.title}
                            </span>
                            {check.scope && (
                              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                                {check.scope}
                              </span>
                            )}
                            {check.confidence && (
                              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {check.confidence}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{check.message}</p>
                          {check.fix ? (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-card-foreground">{check.fix.label}: </span>
                              {check.fix.description}
                            </p>
                          ) : check.suggestion ? (
                            <p className="text-xs text-muted-foreground">{check.suggestion}</p>
                          ) : null}
                          {check.fix?.snippet && (
                            <div className="flex items-start gap-2">
                              <pre className="min-w-0 flex-1 overflow-hidden rounded border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
                                <code>{check.fix.snippet}</code>
                              </pre>
                              <button
                                type="button"
                                title="Copy fix snippet"
                                onClick={(event) => copyFixSnippet(event, check.fix!.snippet!)}
                                className="shrink-0 rounded border border-border p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              >
                                {copiedFixId === check.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          )}
                          {check.evidence && check.evidence.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {check.evidence.map((evidence) => (
                                <span
                                  key={evidence.url}
                                  role="link"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    void window.api.shell.openExternal(evidence.url)
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key !== 'Enter' && event.key !== ' ') return
                                    event.preventDefault()
                                    event.stopPropagation()
                                    void window.api.shell.openExternal(evidence.url)
                                  }}
                                  className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                                >
                                  {evidence.label}
                                </span>
                              ))}
                            </div>
                          )}
                          {check.path && (
                            <p className="truncate text-xs text-muted-foreground">
                              {truncatePath(check.path, 88)}
                            </p>
                          )}
                        </div>
                        {check.assetType && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {check.assetType}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface HealthCheckGroup {
  agentId: string
  agentName: string
  checks: HealthCheck[]
  errors: number
  warnings: number
  info: number
}

function groupHealthChecks(checks: HealthCheck[]): HealthCheckGroup[] {
  const groups = new Map<string, HealthCheckGroup>()
  const sorted = [...checks].sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
  for (const check of sorted) {
    const key = check.agentId
    const group =
      groups.get(key) ??
      {
        agentId: key,
        agentName: check.agentName,
        checks: [],
        errors: 0,
        warnings: 0,
        info: 0
      }
    group.checks.push(check)
    if (check.severity === 'error') group.errors += 1
    if (check.severity === 'warning') group.warnings += 1
    if (check.severity === 'info') group.info += 1
    groups.set(key, group)
  }
  return Array.from(groups.values())
}

function severityRank(severity: HealthCheck['severity']): number {
  if (severity === 'error') return 0
  if (severity === 'warning') return 1
  return 2
}

function HealthCheckIcon({ severity }: { severity: HealthCheck['severity'] }): React.ReactElement {
  if (severity === 'error') return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
  if (severity === 'warning') return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
  return <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
}
