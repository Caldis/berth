import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Plug,
  MessageSquare,
  Puzzle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  ChevronRight
} from 'lucide-react'
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import { formatCurrency, formatRelativeTime, formatNumber } from '@/lib/utils'
import { useSessions, useUsageSummary, useHealthChecks } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'

export function Overview(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const stats = useAppStore((s) => s.stats)
  const { sessions } = useSessions({ limit: 5 })
  const { usage } = useUsageSummary(7)
  const { checks } = useHealthChecks()

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

  const warnings = checks.filter((c) => c.severity === 'warning' || c.severity === 'error')

  // Group sessions by project
  const grouped = sessions.reduce<Record<string, typeof sessions>>((acc, s) => {
    const key = s.project || 'Unknown'
    ;(acc[key] ??= []).push(s)
    return acc
  }, {})

  const dailyCosts = usage?.dailyCosts ?? []
  const totalCost = usage?.totalCost ?? 0

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
          {sessions.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={MessageSquare} message={t('common.empty')} className="border-0 py-8" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {Object.entries(grouped).map(([project, projectSessions]) => (
                <div key={project}>
                  {Object.keys(grouped).length > 1 && (
                    <div className="bg-muted/30 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {project}
                    </div>
                  )}
                  {projectSessions.map((session) => (
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
                            {formatRelativeTime(new Date(session.startedAt))}
                          </span>
                          {Object.keys(grouped).length <= 1 && (
                            <span className="truncate">{session.project}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          {formatCurrency(session.cost)}
                        </span>
                        <span>{formatNumber(session.tokens)} tok</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cost chart */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">{t('overview.costLast7Days')}</h2>
            <span className="text-sm font-semibold text-card-foreground">
              {formatCurrency(totalCost)}
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
        {warnings.length === 0 ? (
          <div className="flex items-center gap-2 p-4">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">{t('overview.noIssues')}</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {warnings.map((check) => (
              <button
                key={check.id}
                onClick={() => {
                  if (check.assetId) navigate(`/configuration/capabilities`)
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/5',
                  !check.assetId && 'cursor-default'
                )}
              >
                <AlertTriangle
                  className={cn(
                    'h-4 w-4 shrink-0',
                    check.severity === 'error' ? 'text-destructive' : 'text-yellow-500'
                  )}
                />
                <span className="text-sm text-card-foreground">{check.message}</span>
                {check.assetType && (
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    {check.assetType}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
