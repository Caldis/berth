import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot, Boxes } from 'lucide-react'
import type { AgentView } from '@shared/types/asset'
import { useAppStore } from '@/stores/app'
import { useAgentCapabilityPlugins } from '@/hooks/use-ipc'
import { agentDisplayName } from '@/lib/agent-meta'
import { ScopeOption, ScopePopover } from './scope-popover'

// GH-138: 全局 agent 维度筛选器 — 与 ProjectScopeSwitcher 并列于侧栏 (一个是文件系统/项目维度,
// 一个是 agent 维度)。**支持范围对齐 agent 能力插件** (useAgentCapabilityPlugins → 已探测到的 agent),
// 选中后写全局 store.agentView, 经 useDashboardInsights / useUsageSummary 下沉 runtime (matchesAgentView)。
// 与 ProjectScopeSwitcher 共用 ScopePopover 外壳, 成一对交互一致的全局筛选器。

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

  const allLabel = t('agentScope.all')
  const triggerLabel = agentView === 'all' ? allLabel : agentDisplayName(agentView)

  return (
    <ScopePopover
      collapsed={collapsed}
      icon={<Bot className="h-3.5 w-3.5" />}
      label={t('agentScope.label')}
      value={triggerLabel}
      active={agentView !== 'all'}
      listLabel={t('agentScope.listLabel')}
      open={open}
      onOpenChange={setOpen}
      panelClassName="w-64"
      header={
        <div className="mb-2 px-2 py-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {t('agentScope.label')}
          </p>
        </div>
      }
    >
      <ScopeOption
        icon={<Boxes className="h-3.5 w-3.5" />}
        title={allLabel}
        selected={agentView === 'all'}
        onClick={() => select('all')}
      />
      {agents.map((agent) => (
        <ScopeOption
          key={agent.agentId}
          icon={<Bot className="h-3.5 w-3.5" />}
          title={agent.label}
          selected={agentView === agent.agentId}
          onClick={() => select(agent.agentId)}
        />
      ))}
    </ScopePopover>
  )
}
