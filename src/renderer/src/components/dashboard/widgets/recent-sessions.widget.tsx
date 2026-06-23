import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { useSessions } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import { formatOptionalCurrency, truncatePath } from '@/lib/utils'
import { EmptyState } from '@/components/shared/empty-state'
import { TokenUsageDisplay } from '@/components/shared/token-usage-display'
import { projectPathForScope } from '@shared/scope'
import type { SessionSummary } from '@shared/types/asset'
import type { WidgetRenderProps } from '../widget-types'

// GH-138: 最近会话 widget — 按日聚类的安静时间线 (左侧发丝竖轴 + 每会话一个小节点)。
// 日分组头作 section 分隔, 每会话以当日时刻 (14:32) 为时间锚点, 取代纯相对时间。
// 内容驱动 M/L 区分: L 显示更多会话, 并在 meta 行补出 model。

interface DayGroup {
  /** 该日 00:00 的本地时间戳, 仅用作稳定 key。 */
  key: number
  /** 当日所属 Date (用于本地化日期标签)。 */
  date: Date
  sessions: SessionSummary[]
}

/** 把按时间倒序的会话按本地日历日聚类, 保持原有顺序 (新→旧)。 */
function clusterByDay(sessions: SessionSummary[]): DayGroup[] {
  const groups: DayGroup[] = []
  let current: DayGroup | null = null
  for (const session of sessions) {
    const started = session.startedAt ? new Date(session.startedAt) : null
    const valid = started && !Number.isNaN(started.getTime())
    // startedAt 缺失/非法的会话归入一个 epoch-0 占位日, 不丢行。
    const day = valid
      ? new Date(started.getFullYear(), started.getMonth(), started.getDate())
      : new Date(0)
    const key = day.getTime()
    if (!current || current.key !== key) {
      current = { key, date: day, sessions: [] }
      groups.push(current)
    }
    current.sessions.push(session)
  }
  return groups
}

/** 0=今天, 1=昨天, 其余正整数=更早天数; -1=无效日期。 */
function daysFromToday(day: Date): number {
  if (day.getTime() === 0) return -1
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((today.getTime() - day.getTime()) / 86_400_000)
}

/** 当日时刻锚点 "14:32" (本地、24h)。无效则回退 em dash。 */
function formatTimeOfDay(value: string | null, language: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function RecentSessionsWidget({ w }: WidgetRenderProps): React.ReactElement {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const agentView = useAppStore((s) => s.agentView)
  const limit = w === 'W1' ? 3 : 5
  const { sessions, loading } = useSessions({ limit, projectPath, agentView })

  const groups = useMemo(() => clusterByDay(sessions), [sessions])

  if (loading && sessions.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title={t('overview.empty.sessionsTitle')}
        description={t('overview.empty.sessionsDescription')}
        className="border-0 py-8"
      />
    )
  }

  // S: 太窄, 收敛为最近 3 条 — 每行 = 当日时刻 + 标题 (单行截断), 丢日分组头/竖轴/meta, 保留点击进入。
  if (w === 'W1') {
    return (
      <ul className="flex flex-col">
        {sessions.slice(0, 3).map((session) => (
          <li key={session.id}>
            <button
              type="button"
              onClick={() => navigate(`/sessions/${session.id}`)}
              className="flex w-full items-baseline gap-2.5 rounded-md py-1.5 pl-1 pr-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="w-9 shrink-0 text-xs tabular-nums text-muted-foreground/80">
                {formatTimeOfDay(session.startedAt, i18n.language)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {session.title || t('sessions.fallbackTitle', { id: session.id.slice(0, 8) })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    )
  }

  function dayLabel(group: DayGroup): string {
    const delta = daysFromToday(group.date)
    if (delta === 0) return t('overview.dashboard.recentSessions.today')
    if (delta === 1) return t('overview.dashboard.recentSessions.yesterday')
    if (delta < 0) return t('common.unknown')
    return group.date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
            {dayLabel(group)}
          </h3>
          {/* 发丝竖轴: 节点与时刻沿此轴排列, 让当日时间结构一目了然。 */}
          <div className="ml-2 border-l border-border/60">
            {group.sessions.map((session) => {
              const project = truncatePath(
                session.projectPath || session.project || t('common.unknown'),
                40
              )
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => navigate(`/sessions/${session.id}`)}
                  className="group relative -ml-px flex w-full items-start gap-3 rounded-r-md border-l border-transparent py-2 pl-4 pr-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  {/* 时间线节点 — 悬停时点亮, 锚定到竖轴上。 */}
                  <span
                    aria-hidden
                    className="absolute -left-[3px] top-[14px] h-1.5 w-1.5 rounded-full bg-border ring-2 ring-card transition-colors group-hover:bg-primary"
                  />
                  <span className="w-9 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground/80">
                    {formatTimeOfDay(session.startedAt, i18n.language)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {session.title || t('sessions.fallbackTitle', { id: session.id.slice(0, 8) })}
                    </span>
                    <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="min-w-0 truncate">{project}</span>
                      <span aria-hidden className="text-muted-foreground/40">·</span>
                      <TokenUsageDisplay usage={session.tokenUsage} />
                      <span aria-hidden className="text-muted-foreground/40">·</span>
                      <span className="tabular-nums">{formatOptionalCurrency(session.cost)}</span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
      <button
        type="button"
        onClick={() => navigate('/sessions')}
        className="mt-1 self-start rounded px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {t('overview.dashboard.recentSessions.viewMore')}
      </button>
    </div>
  )
}
