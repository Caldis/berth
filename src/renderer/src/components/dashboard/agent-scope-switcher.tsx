import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import type { AgentView } from '@shared/types/asset'
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger
} from '@/components/ui'
import { agentDisplayName } from '@/lib/agent-meta'
import { cn, formatNumber } from '@/lib/utils'

// GH-138: Overview dashboard 的全局 agent 范围筛选器 (纯展示组件)。
// 体感对齐 toolbar 上其他小控件 (project-scope-switcher 的安静触发器 +
// replay-detail-panel 的 Dropdown 习语): variant="light" 小按钮触发, 下拉单选,
// 选中项以 aria-checked 标记; 无加重的蓝色, 计数走 tabular-nums + muted。
const ALL_KEY = 'all'

export interface AgentScopeSwitcherProps {
  /** Agents present in the current scope, sorted by count desc. */
  agents: { agentId: string; count: number }[]
  /** Current selection: 'all' or a specific agentId. */
  value: AgentView
  onChange: (value: AgentView) => void
}

export function AgentScopeSwitcher({
  agents,
  value,
  onChange
}: AgentScopeSwitcherProps): React.ReactElement | null {
  const { t } = useTranslation()

  // Filtering is pointless with 0 or 1 agent — render nothing.
  if (agents.length <= 1) return null

  const allLabel = t('overview.dashboard.agentFilter.all')
  const triggerLabel = value === ALL_KEY ? allLabel : agentDisplayName(value)

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button
          size="sm"
          variant="light"
          radius="md"
          className="h-8 gap-1.5 px-2.5 text-sm font-medium text-muted-foreground data-[hover=true]:text-foreground"
          aria-label={t('overview.dashboard.agentFilter.label')}
          endContent={<ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />}
        >
          <span className="max-w-[10rem] truncate">{triggerLabel}</span>
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={t('overview.dashboard.agentFilter.label')}
        variant="flat"
        selectionMode="single"
        selectedKeys={[value === ALL_KEY ? ALL_KEY : value]}
        onAction={(key) => onChange(key === ALL_KEY ? 'all' : String(key))}
      >
        {[
          <DropdownItem key={ALL_KEY} textValue={allLabel}>
            {allLabel}
          </DropdownItem>,
          ...agents.map((agent): React.ReactElement => {
            const name = agentDisplayName(agent.agentId)
            return (
              <DropdownItem
                key={agent.agentId}
                textValue={name}
                endContent={
                  <span
                    className={cn(
                      'tabular-nums text-xs text-muted-foreground',
                      value === agent.agentId && 'text-foreground'
                    )}
                  >
                    {formatNumber(agent.count)}
                  </span>
                }
              >
                {name}
              </DropdownItem>
            )
          })
        ]}
      </DropdownMenu>
    </Dropdown>
  )
}
