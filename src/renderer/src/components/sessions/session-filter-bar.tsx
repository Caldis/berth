import { useTranslation } from 'react-i18next'
import { Select, SelectItem, Tabs, Tab } from '@/components/ui'
import { formatNumber } from '@/lib/utils'
import type {
  SessionAgentFilter,
  SessionGroupBy,
  SessionSortBy
} from '@/lib/session-list-filters'

// GH-116: 列表页结构化筛选条 — agent 分段 (带计数) + 模型多选 + 排序 + 分组 + 结果计数。
// 与 page-chrome 的文本搜索可组合; 全部控件经 @/components/ui。

const GROUP_TABS_CLASSNAMES = {
  tabList: 'rounded-md border border-input bg-transparent p-0.5',
  cursor: 'shadow-sm',
  tabContent: 'text-xs text-muted-foreground group-data-[selected=true]:text-primary-foreground'
}

interface SessionFilterBarProps {
  agentFilter: SessionAgentFilter
  onAgentFilterChange: (agent: SessionAgentFilter) => void
  agentCounts: Record<SessionAgentFilter, number>
  modelOptions: readonly string[]
  modelFilter: ReadonlySet<string>
  onModelFilterChange: (models: Set<string>) => void
  sortBy: SessionSortBy
  onSortByChange: (sortBy: SessionSortBy) => void
  groupBy: SessionGroupBy
  onGroupByChange: (groupBy: SessionGroupBy) => void
  shownCount: number
  totalCount: number
}

export function SessionFilterBar({
  agentFilter,
  onAgentFilterChange,
  agentCounts,
  modelOptions,
  modelFilter,
  onModelFilterChange,
  sortBy,
  onSortByChange,
  groupBy,
  onGroupByChange,
  shownCount,
  totalCount
}: SessionFilterBarProps): React.ReactElement {
  const { t } = useTranslation()

  const agentTab = (key: SessionAgentFilter, label: string): React.ReactElement => (
    <Tab
      key={key}
      title={
        <span className="flex items-center gap-1.5">
          {label}
          <span className="tabular-nums opacity-70">{formatNumber(agentCounts[key])}</span>
        </span>
      }
    />
  )

  return (
    <div
      data-testid="session-filter-bar"
      role="group"
      aria-label={t('sessions.filters.label')}
      className="flex flex-wrap items-center gap-2"
    >
      <Tabs
        aria-label={t('sessions.filters.agent')}
        size="sm"
        color="primary"
        selectedKey={agentFilter}
        onSelectionChange={(key) => onAgentFilterChange(key as SessionAgentFilter)}
        classNames={GROUP_TABS_CLASSNAMES}
      >
        {agentTab('all', t('sessions.filters.agentAll'))}
        {agentTab('claude', 'Claude')}
        {agentTab('codex', 'Codex')}
      </Tabs>

      <Select
        aria-label={t('sessions.filters.model')}
        data-testid="session-model-filter"
        selectionMode="multiple"
        size="sm"
        placeholder={t('sessions.filters.modelAll')}
        selectedKeys={modelFilter as Set<string>}
        onSelectionChange={(keys) => {
          if (keys === 'all') {
            onModelFilterChange(new Set())
            return
          }
          onModelFilterChange(new Set([...keys] as string[]))
        }}
        isDisabled={modelOptions.length === 0}
        className="w-48"
        classNames={{ trigger: 'h-9 min-h-9' }}
      >
        {modelOptions.map((model) => (
          <SelectItem key={model} textValue={model}>
            <span className="truncate font-mono text-xs">{model}</span>
          </SelectItem>
        ))}
      </Select>

      <Select
        aria-label={t('sessions.filters.sort')}
        data-testid="session-sort-select"
        size="sm"
        selectedKeys={new Set([sortBy])}
        disallowEmptySelection
        onSelectionChange={(keys) => {
          if (keys === 'all') return
          const [first] = [...keys]
          if (first) onSortByChange(first as SessionSortBy)
        }}
        className="w-32"
        classNames={{ trigger: 'h-9 min-h-9' }}
      >
        <SelectItem key="recent">{t('sessions.filters.sortRecent')}</SelectItem>
        <SelectItem key="duration">{t('sessions.filters.sortDuration')}</SelectItem>
        <SelectItem key="cost">{t('sessions.filters.sortCost')}</SelectItem>
        <SelectItem key="tokens">{t('sessions.filters.sortTokens')}</SelectItem>
      </Select>

      <div className="ml-auto flex items-center gap-2">
        <span
          data-testid="session-filter-results"
          aria-live="polite"
          className="text-xs tabular-nums text-muted-foreground"
        >
          {t('sessions.filters.results', {
            shown: formatNumber(shownCount),
            total: formatNumber(totalCount)
          })}
        </span>
        <span className="text-xs text-muted-foreground">{t('sessions.groupBy')}</span>
        <Tabs
          aria-label={t('sessions.groupBy')}
          size="sm"
          color="primary"
          selectedKey={groupBy}
          onSelectionChange={(key) => onGroupByChange(key as SessionGroupBy)}
          classNames={GROUP_TABS_CLASSNAMES}
        >
          <Tab key="project" title={t('sessions.project')} />
          <Tab key="date" title={t('sessions.date')} />
          <Tab key="none" title={t('sessions.filters.flat')} />
        </Tabs>
      </div>
    </div>
  )
}
