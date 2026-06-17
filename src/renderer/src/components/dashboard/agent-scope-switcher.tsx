import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot, Boxes, Check } from 'lucide-react'
import type { AgentView } from '@shared/types/asset'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'
import { useAgentCapabilityPlugins } from '@/hooks/use-ipc'
import { agentDisplayName } from '@/lib/agent-meta'

// GH-138: 全局 agent 维度筛选器 — 与 ProjectScopeSwitcher 并列于侧栏 (一个是文件系统/项目维度,
// 一个是 agent 维度)。**支持范围对齐 agent 能力插件** (useAgentCapabilityPlugins → 已探测到的 agent),
// 选中后写全局 store.agentView, 经 useDashboardInsights / useUsageSummary 下沉 runtime (matchesAgentView)。
// 视觉/交互镜像 ProjectScopeSwitcher (collapsed 感知触发器 + 轻量 popover), 成一对全局筛选器。

interface AgentScopeSwitcherProps {
  collapsed: boolean
}

export function AgentScopeSwitcher({ collapsed }: AgentScopeSwitcherProps): React.ReactElement | null {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const agentView = useAppStore((s) => s.agentView)
  const setAgentView = useAppStore((s) => s.setAgentView)
  const { plugins } = useAgentCapabilityPlugins()

  // 选项 = 已探测到的能力插件 (按 agentId 去重), 用插件 displayName。范围对齐能力插件而非会话数据。
  const agents = useMemo(() => {
    const byId = new Map<string, string>()
    for (const plugin of plugins) {
      if (!plugin.detected) continue
      const agentId = plugin.agentCompatibility?.agentId
      if (agentId && !byId.has(agentId)) byId.set(agentId, plugin.displayName)
    }
    return [...byId.entries()]
      .map(([agentId, label]) => ({ agentId, label }))
      .sort((a, z) => a.label.localeCompare(z.label))
  }, [plugins])

  const select = useCallback(
    (view: AgentView) => {
      setAgentView(view)
      setOpen(false)
    },
    [setAgentView]
  )

  // 少于 2 个 agent 时无可切换项 — 不渲染 (避免无意义控件)。
  if (agents.length < 2) return null

  const allLabel = t('overview.dashboard.agentFilter.all')
  const triggerLabel = agentView === 'all' ? allLabel : agentDisplayName(agentView)

  return (
    <div className="titlebar-no-drag relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.stopPropagation()
            setOpen(false)
          }
        }}
        className={cn(
          'flex h-8 w-full min-w-0 items-center gap-2 rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/10 hover:text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-ring',
          collapsed ? 'w-8 justify-center' : 'justify-start px-2.5'
        )}
        title={collapsed ? t('overview.dashboard.agentFilter.label') : triggerLabel}
        aria-label={t('overview.dashboard.agentFilter.label')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Bot className="h-3.5 w-3.5 shrink-0" />
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">{triggerLabel}</span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-10 z-50 max-h-[calc(100vh-7rem)] w-64 overflow-y-auto rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg"
          role="listbox"
          aria-label={t('overview.dashboard.agentFilter.label')}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
          }}
        >
          <div className="mb-2 px-2 py-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {t('overview.dashboard.agentFilter.label')}
            </p>
          </div>
          <div className="grid gap-1">
            <AgentOption
              icon={<Boxes className="h-3.5 w-3.5" />}
              title={allLabel}
              selected={agentView === 'all'}
              onClick={() => select('all')}
            />
            {agents.map((agent) => (
              <AgentOption
                key={agent.agentId}
                icon={<Bot className="h-3.5 w-3.5" />}
                title={agent.label}
                selected={agentView === agent.agentId}
                onClick={() => select(agent.agentId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AgentOption({
  icon,
  title,
  selected,
  onClick
}: {
  icon: React.ReactNode
  title: string
  selected: boolean
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      role="option"
      aria-label={title}
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted',
        selected && 'bg-muted text-foreground'
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
      {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
    </button>
  )
}
