import { useTranslation } from 'react-i18next'
import { Search, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssetScope } from '@shared/types/asset'

export type ScopeFilter = 'all' | AssetScope

interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  scope: ScopeFilter
  onScopeChange: (scope: ScopeFilter) => void
  placeholder?: string
  showScope?: boolean
}

const scopeOptions: { value: ScopeFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'filter.allScopes' },
  { value: 'user', labelKey: 'common.scope.user' },
  { value: 'project', labelKey: 'common.scope.project' },
  { value: 'enterprise', labelKey: 'common.scope.enterprise' }
]

export function ScopeSelect({
  value,
  onChange,
  className
}: {
  value: ScopeFilter
  onChange: (scope: ScopeFilter) => void
  className?: string
}): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        aria-label={t('filter.scope', 'Scope')}
        onChange={(e) => onChange(e.target.value as ScopeFilter)}
        className={cn(
          'h-9 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm outline-none ring-ring focus:ring-1',
          'cursor-pointer'
        )}
      >
        {scopeOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

export function FilterBar({
  search,
  onSearchChange,
  scope,
  onScopeChange,
  placeholder,
  showScope = true
}: FilterBarProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder ?? t('search.placeholder')}
          className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none ring-ring focus:ring-1"
        />
      </div>
      {showScope && (
        <ScopeSelect value={scope} onChange={onScopeChange} />
      )}
    </div>
  )
}
