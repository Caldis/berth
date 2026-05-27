import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/stores/app'
import {
  Sparkles,
  Plug,
  MessageSquare,
  Puzzle,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCard {
  labelKey: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export function Overview(): React.ReactElement {
  const { t } = useTranslation()
  const stats = useAppStore((s) => s.stats)

  const cards: StatCard[] = [
    { labelKey: 'Skills', value: stats.skills, icon: Sparkles, color: 'text-blue-500' },
    { labelKey: 'MCP', value: stats.mcpServers, icon: Plug, color: 'text-green-500' },
    { labelKey: 'Sessions', value: stats.sessions, icon: MessageSquare, color: 'text-orange-500' },
    { labelKey: 'Plugins', value: stats.plugins, icon: Puzzle, color: 'text-purple-500' }
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('overview.title')}</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.labelKey}
            className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/5"
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-card-foreground">{card.value}</span>
              <card.icon className={cn('h-5 w-5', card.color)} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{card.labelKey}</p>
          </div>
        ))}
      </div>

      {/* Recent sessions */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">{t('overview.recentSessions')}</h2>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
        </div>
      </div>

      {/* Health checks */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">{t('overview.healthChecks')}</h2>
        </div>
        <div className="flex items-center gap-2 p-4">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm text-muted-foreground">{t('overview.noIssues')}</span>
        </div>
      </div>
    </div>
  )
}
