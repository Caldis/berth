import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Plug, MessageSquare, Puzzle } from 'lucide-react'
import { useAppStore } from '@/stores/app'

// GH-138: 快捷入口 widget (移植自旧 Overview metrics 卡, 改为无卡片框克制样式)。
export function QuickActionsWidget(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const stats = useAppStore((s) => s.stats)

  const items = [
    { label: t('overview.stats.skills'), value: stats.skills, icon: Sparkles, path: '/instructions/skills' },
    { label: t('overview.stats.mcp'), value: stats.mcpServers, icon: Plug, path: '/capabilities/mcp' },
    { label: t('nav.sessions'), value: stats.sessions, icon: MessageSquare, path: '/sessions' },
    { label: t('overview.stats.plugins'), value: stats.plugins, icon: Puzzle, path: '/capabilities/plugins' }
  ]

  return (
    <div className="h-full grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => navigate(item.path)}
            className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
            <span className="min-w-0">
              <span className="block text-lg font-semibold leading-none tabular-nums text-foreground">{item.value}</span>
              <span className="mt-1 block truncate text-[11px] text-muted-foreground">{item.label}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
