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
  Check,
  X,
  Activity
} from 'lucide-react'
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { CHART_SERIES_FILL } from '@/lib/chart-colors'
import { formatCurrency, formatOptionalCurrency, formatOptionalRelativeTime, truncatePath } from '@/lib/utils'
import { useSessions, useUsageSummary, useHealthChecks } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import {
  localizeHealthCheck,
  localizeHealthCheckAssetType,
  localizeHealthCheckConfidence,
  localizeHealthCheckScope
} from '@/lib/health-check-i18n'
import { EmptyState } from '@/components/shared/empty-state'
import type { HealthCheck } from '@shared/types/ipc'
import { TokenUsageDisplay } from '@/components/shared/token-usage-display'
import { CostSourceBadge } from '@/components/shared/cost-source-badge'
import { projectPathForScope, type AppScopeSelection } from '@shared/scope'

type HealthTone = 'loading' | 'stale' | 'ok' | 'info' | 'warning' | 'error'

interface HealthSummary {
  tone: HealthTone
  errors: number
  warnings: number
  info: number
}

export function Overview(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const allStats = useAppStore((s) => s.stats)
  const assets = useAppStore((s) => s.assets)
  const assetRuntimeStatus = useAppStore((s) => s.assetRuntimeStatus)
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const stats = allStats
  const { sessions, loading: sessionsLoading } = useSessions({ limit: 5, projectPath })
  const { usage, loading: usageLoading } = useUsageSummary(7, undefined, projectPath)
  const { checks, loading: healthLoading, stale: healthStale } = useHealthChecks()
  const [copiedFixId, setCopiedFixId] = useState<string | null>(null)
  const [ignoredHealthChecks, setIgnoredHealthChecks] = useState<Set<string>>(() => readIgnoredHealthChecks())
  const visibleChecks = useMemo(
    () => checks.filter((check) => check.severity !== 'info' || !ignoredHealthChecks.has(healthCheckDismissKey(check))),
    [checks, ignoredHealthChecks]
  )

  const healthGroups = useMemo(() => groupHealthChecks(visibleChecks), [visibleChecks])
  const healthSummary = useMemo(
    () => summarizeHealthChecks(visibleChecks, healthLoading, healthStale),
    [healthLoading, healthStale, visibleChecks]
  )

  const dailyCosts = usage?.dailyCosts ?? []
  const totalCost = usage?.totalCost ?? 0
  const hasKnownCost = usage != null && usage.costSource !== 'unknown'
  const overviewCostSource = usage?.costSource ?? 'unknown'
  const agentLabel = t('agentView.all')
  const scopeLabel = scopeLabelForSelection(scopeSelection, t)
  const metricsLoading = assetRuntimeStatus.state === 'scanning' && assets.length === 0

  const metricCards = [
    {
      label: t('overview.stats.skills'),
      value: stats.skills,
      icon: Sparkles,
      path: '/instructions/skills',
      description: t('overview.metricDescriptions.skills')
    },
    {
      label: t('overview.stats.mcp'),
      value: stats.mcpServers,
      icon: Plug,
      path: '/capabilities/mcp',
      description: t('overview.metricDescriptions.mcp')
    },
    {
      label: t('nav.sessions'),
      value: stats.sessions,
      icon: MessageSquare,
      path: '/sessions',
      description: t('overview.metricDescriptions.sessions')
    },
    {
      label: t('overview.stats.plugins'),
      value: stats.plugins,
      icon: Puzzle,
      path: '/capabilities/plugins',
      description: t('overview.metricDescriptions.plugins')
    }
  ]

  const activateHealthCheck = (check: HealthCheck): void => {
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
      navigate('/capabilities/mcp')
    }
  }

  const copyFixSnippet = (event: React.MouseEvent, check: HealthCheck, snippet: string): void => {
    event.stopPropagation()
    void navigator.clipboard?.writeText(snippet).then(() => {
      setCopiedFixId(check.id)
    })
  }

  const ignoreCheck = (event: React.MouseEvent, check: HealthCheck): void => {
    event.stopPropagation()
    const next = new Set(ignoredHealthChecks)
    next.add(healthCheckDismissKey(check))
    setIgnoredHealthChecks(next)
    localStorage.setItem(IGNORED_HEALTH_CHECKS_KEY, JSON.stringify([...next]))
  }

  return (
    <div className="space-y-5 pb-8">
      <section
        data-testid="overview-hero"
        className="rounded-xl border border-border bg-card px-5 py-5"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)] lg:items-start">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t('overview.kicker')}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-card-foreground">
              {t('overview.title')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t('overview.subtitle')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ScopePill label={t('overview.currentAgent')} value={agentLabel} />
              <ScopePill label={t('overview.projectScope')} value={scopeLabel} />
            </div>
          </div>
          <HealthSummaryCard summary={healthSummary} />
        </div>
      </section>

      <section aria-label={t('overview.quickActions')} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <OverviewMetricButton
            key={metric.label}
            label={metric.label}
            value={metric.value}
            description={metric.description}
            icon={metric.icon}
            loading={metricsLoading}
            onClick={() => navigate(metric.path)}
          />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
        <div className="min-w-0 space-y-5">
          <RecentSessionsPanel sessions={sessions} loading={sessionsLoading} />
          <UsageSnapshotPanel
            dailyCosts={dailyCosts}
            hasKnownCost={hasKnownCost}
            loading={usageLoading}
            source={overviewCostSource}
            totalCost={totalCost}
          />
        </div>
        <HealthWorklistPanel
          checks={healthGroups}
          loading={healthLoading}
          summary={healthSummary}
          copiedFixId={copiedFixId}
          onActivate={activateHealthCheck}
          onCopyFixSnippet={copyFixSnippet}
          onIgnore={ignoreCheck}
        />
      </div>
    </div>
  )
}

function ScopePill({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="inline-flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
      <span className="shrink-0 text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-xs font-semibold text-card-foreground">{value}</span>
    </div>
  )
}

function OverviewMetricButton({
  label,
  value,
  description,
  icon: Icon,
  loading,
  onClick
}: {
  label: string
  value: number
  description: string
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
  onClick: () => void
}): React.ReactElement {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[88px] items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30 text-card-foreground transition-colors group-hover:bg-background">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-medium text-card-foreground">{label}</span>
          {loading ? (
            <span
              role="status"
              aria-label={t('overview.loadingAssets')}
              className="h-6 w-10 animate-pulse rounded bg-muted"
            />
          ) : (
            <span className="text-xl font-semibold tabular-nums tracking-tight text-card-foreground">{value}</span>
          )}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}

function RecentSessionsPanel({
  sessions,
  loading
}: {
  sessions: ReturnType<typeof useSessions>['sessions']
  loading: boolean
}): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <section className="rounded-xl border border-border bg-card">
      <PanelHeader
        title={t('overview.recentSessions')}
        action={
          sessions.length > 0 ? (
            <button
              type="button"
              onClick={() => navigate('/sessions')}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {t('overview.openSessions')}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : null
        }
      />
      {loading ? (
        <SkeletonRows count={3} />
      ) : sessions.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={MessageSquare}
            title={t('overview.empty.sessionsTitle')}
            description={t('overview.empty.sessionsDescription')}
            className="border-0 py-10"
          />
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => navigate(`/sessions/${session.id}`)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-card-foreground">
                  {session.title || t('sessions.fallbackTitle', { id: session.id.slice(0, 8) })}
                </p>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatOptionalRelativeTime(session.startedAt)}
                  </span>
                  <span className="min-w-0 truncate">
                    {truncatePath(session.projectPath || session.project || t('common.unknown'), 56)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-3">
                <span className="inline-flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  {formatOptionalCurrency(session.cost)}
                </span>
                <TokenUsageDisplay usage={session.tokenUsage} />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function UsageSnapshotPanel({
  dailyCosts,
  hasKnownCost,
  loading,
  source,
  totalCost
}: {
  dailyCosts: Array<{ date: string; cost: number }>
  hasKnownCost: boolean
  loading: boolean
  source: Parameters<typeof CostSourceBadge>[0]['source']
  totalCost: number
}): React.ReactElement {
  const { t } = useTranslation()

  return (
    <section className="rounded-xl border border-border bg-card">
      <PanelHeader
        title={t('overview.costLast7Days')}
        action={
          <div className="flex min-w-0 items-center justify-end gap-2">
            <CostSourceBadge source={source} />
            <span className="text-sm font-semibold text-card-foreground">
              {hasKnownCost ? formatCurrency(totalCost) : '—'}
            </span>
          </div>
        }
      />
      {loading ? (
        <div className="p-4">
          <div aria-label={t('overview.loadingUsage')} className="h-[180px] animate-pulse rounded-lg bg-muted/40" />
        </div>
      ) : dailyCosts.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Coins}
            title={t('overview.empty.usageTitle')}
            description={t('overview.empty.usageDescription')}
            className="border-0 py-10"
          />
        </div>
      ) : (
        <div className="p-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyCosts} barCategoryGap="24%">
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
              <Bar dataKey="cost" fill={CHART_SERIES_FILL} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

function HealthWorklistPanel({
  checks,
  loading,
  summary,
  copiedFixId,
  onActivate,
  onCopyFixSnippet,
  onIgnore
}: {
  checks: HealthCheckGroup[]
  loading: boolean
  summary: HealthSummary
  copiedFixId: string | null
  onActivate: (check: HealthCheck) => void
  onCopyFixSnippet: (event: React.MouseEvent, check: HealthCheck, snippet: string) => void
  onIgnore: (event: React.MouseEvent, check: HealthCheck) => void
}): React.ReactElement {
  const { t } = useTranslation()
  const hasChecks = checks.some((group) => group.checks.length > 0)

  return (
    <section className="rounded-xl border border-border bg-card">
      <PanelHeader
        title={t('overview.healthChecks')}
        action={<HealthStatusBadge summary={summary} />}
      />
      {loading && !hasChecks ? (
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 animate-pulse" />
            {t('overview.healthSummary.loading')}
          </div>
          <SkeletonRows count={2} compact />
        </div>
      ) : !hasChecks ? (
        <div className="p-4">
          <EmptyState
            icon={CheckCircle2}
            title={t('overview.empty.healthTitle')}
            description={t('overview.empty.healthDescription')}
            className="border-0 py-10"
          />
        </div>
      ) : (
        <div className="divide-y divide-border">
          {checks.map((group) => (
            <div key={group.agentId}>
              <div className="flex items-center justify-between bg-muted/20 px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">{group.agentName}</span>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {group.errors > 0 && <span>{t('overview.healthCount.error', { count: group.errors })}</span>}
                  {group.warnings > 0 && <span>{t('overview.healthCount.warning', { count: group.warnings })}</span>}
                  {group.info > 0 && <span>{t('overview.healthCount.info', { count: group.info })}</span>}
                </div>
              </div>
              <div className="divide-y divide-border">
                {group.checks.map((check) => (
                  <HealthCheckRow
                    key={check.id}
                    check={check}
                    copied={copiedFixId === check.id}
                    onActivate={onActivate}
                    onCopyFixSnippet={onCopyFixSnippet}
                    onIgnore={onIgnore}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function HealthCheckRow({
  check,
  copied,
  onActivate,
  onCopyFixSnippet,
  onIgnore
}: {
  check: HealthCheck
  copied: boolean
  onActivate: (check: HealthCheck) => void
  onCopyFixSnippet: (event: React.MouseEvent, check: HealthCheck, snippet: string) => void
  onIgnore: (event: React.MouseEvent, check: HealthCheck) => void
}): React.ReactElement {
  const { t } = useTranslation()
  const displayCheck = localizeHealthCheck(check, t)
  const clickable = Boolean(check.target?.route || check.target?.path || check.path || check.assetId)

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onActivate(check) : undefined}
      onKeyDown={(event) => {
        if (!clickable) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onActivate(check)
        }
      }}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
        clickable ? 'hover:bg-accent/5' : 'cursor-default'
      )}
    >
      <HealthCheckIcon severity={check.severity} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-card-foreground">{displayCheck.title}</span>
          {check.scope && (
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {localizeHealthCheckScope(check.scope, t)}
            </span>
          )}
          {check.confidence && (
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {localizeHealthCheckConfidence(check.confidence, t)}
            </span>
          )}
          {check.severity === 'info' && (
            <button
              type="button"
              aria-label={t('overview.healthCheckActions.ignoreInfo')}
              title={t('overview.healthCheckActions.ignoreInfo')}
              onClick={(event) => onIgnore(event, check)}
              className="rounded border border-border p-0.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{displayCheck.message}</p>
        {displayCheck.fix ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-card-foreground">{displayCheck.fix.label}: </span>
            {displayCheck.fix.description}
          </p>
        ) : displayCheck.suggestion ? (
          <p className="text-xs text-muted-foreground">{displayCheck.suggestion}</p>
        ) : null}
        {check.fix?.snippet && (
          <div className="flex items-start gap-2">
            <pre className="min-w-0 flex-1 overflow-hidden rounded border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
              <code>{check.fix.snippet}</code>
            </pre>
            <button
              type="button"
              aria-label={t('overview.healthCheckActions.copyFixSnippet')}
              title={t('overview.healthCheckActions.copyFixSnippet')}
              onClick={(event) => onCopyFixSnippet(event, check, check.fix!.snippet!)}
              className="shrink-0 rounded border border-border p-1 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
        {displayCheck.evidence && displayCheck.evidence.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {displayCheck.evidence.map((evidence) => (
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
                className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
          {localizeHealthCheckAssetType(check.assetType, t)}
        </span>
      )}
    </div>
  )
}

function PanelHeader({ title, action }: { title: string; action?: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-3">
      <h2 className="text-sm font-medium text-card-foreground">{title}</h2>
      {action}
    </div>
  )
}

function HealthSummaryCard({ summary }: { summary: HealthSummary }): React.ReactElement {
  const { t } = useTranslation()
  const Icon = healthToneIcon(summary.tone)

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3.5">
      <div className="flex items-center gap-2">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-md', healthToneClass(summary.tone))}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-card-foreground">{t(`overview.healthSummary.${summary.tone}`)}</p>
          <p className="text-xs leading-5 text-muted-foreground">{t(`overview.healthSummaryDetail.${summary.tone}`)}</p>
        </div>
      </div>
    </div>
  )
}

function HealthStatusBadge({ summary }: { summary: HealthSummary }): React.ReactElement {
  const { t } = useTranslation()
  const Icon = healthToneIcon(summary.tone)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium',
        healthToneClass(summary.tone)
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {t(`overview.healthSummary.${summary.tone}`)}
    </span>
  )
}

function SkeletonRows({ count, compact = false }: { count: number; compact?: boolean }): React.ReactElement {
  return (
    <div className={cn('divide-y divide-border', compact && 'rounded-lg border border-border')}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-2 px-4 py-3">
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted/60" />
        </div>
      ))}
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

const IGNORED_HEALTH_CHECKS_KEY = 'berth-ignored-health-checks'

function readIgnoredHealthChecks(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(IGNORED_HEALTH_CHECKS_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((item): item is string => typeof item === 'string'))
  } catch {
    return new Set()
  }
}

function healthCheckDismissKey(check: HealthCheck): string {
  return `${check.id}:${check.target?.path ?? check.path ?? ''}`
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

function summarizeHealthChecks(checks: HealthCheck[], loading: boolean, stale: boolean): HealthSummary {
  const errors = checks.filter((check) => check.severity === 'error').length
  const warnings = checks.filter((check) => check.severity === 'warning').length
  const info = checks.filter((check) => check.severity === 'info').length
  if (loading && checks.length === 0) return { tone: 'loading', errors, warnings, info }
  if (stale) return { tone: 'stale', errors, warnings, info }
  if (errors > 0) return { tone: 'error', errors, warnings, info }
  if (warnings > 0) return { tone: 'warning', errors, warnings, info }
  if (info > 0) return { tone: 'info', errors, warnings, info }
  return { tone: 'ok', errors, warnings, info }
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

function healthToneIcon(tone: HealthTone): React.ComponentType<{ className?: string }> {
  if (tone === 'error') return XCircle
  if (tone === 'warning') return AlertTriangle
  if (tone === 'loading' || tone === 'stale') return Activity
  if (tone === 'info') return Info
  return CheckCircle2
}

function healthToneClass(tone: HealthTone): string {
  if (tone === 'error') return 'border-destructive/25 bg-destructive/10 text-destructive'
  if (tone === 'warning') return 'border-yellow-500/25 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
  if (tone === 'loading' || tone === 'stale') return 'border-border bg-muted text-muted-foreground'
  if (tone === 'info') return 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300'
  return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
}

function scopeLabelForSelection(selection: AppScopeSelection, t: ReturnType<typeof useTranslation>['t']): string {
  if (selection.mode === 'project') return selection.projectPath
  if (selection.mode === 'user') return t('overview.scope.user')
  return t('overview.scope.global')
}
