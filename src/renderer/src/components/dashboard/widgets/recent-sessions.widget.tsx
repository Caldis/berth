import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Clock, Coins, MessageSquare } from 'lucide-react'
import { useSessions } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import { formatOptionalCurrency, formatOptionalRelativeTime, truncatePath } from '@/lib/utils'
import { EmptyState } from '@/components/shared/empty-state'
import { TokenUsageDisplay } from '@/components/shared/token-usage-display'
import { projectPathForScope } from '@shared/scope'
import type { WidgetRenderProps } from '../widget-types'

// GH-138: 最近会话 widget (移植自旧 Overview panel, 去卡片框, 发丝线分隔)。
// 内容驱动 M/L 区分: L 显示更多会话 (自然更高更有用)。
export function RecentSessionsWidget({ size }: WidgetRenderProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const limit = size === 'L' ? 8 : 5
  const { sessions, loading } = useSessions({ limit, projectPath })

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

  return (
    <div className="-mx-2 divide-y divide-border/60">
      {sessions.map((session) => (
        <button
          key={session.id}
          type="button"
          onClick={() => navigate(`/sessions/${session.id}`)}
          className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {session.title || t('sessions.fallbackTitle', { id: session.id.slice(0, 8) })}
            </p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatOptionalRelativeTime(session.startedAt)}
              </span>
              <span className="min-w-0 truncate">
                {truncatePath(session.projectPath || session.project || t('common.unknown'), 48)}
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
  )
}
