import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Input, Select, SelectItem } from '@/components/ui'
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
    <Select
      aria-label={t('filter.scope', 'Scope')}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const next = Array.from(keys)[0]
        if (next) onChange(next as ScopeFilter)
      }}
      size="sm"
      variant="bordered"
      className={className}
      classNames={{
        trigger:
          'h-9 min-h-9 border-input bg-background shadow-none data-[hover=true]:bg-muted/40 data-[open=true]:border-ring'
      }}
    >
      {scopeOptions.map((opt) => (
        <SelectItem key={opt.value}>{t(opt.labelKey)}</SelectItem>
      ))}
    </Select>
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
  const searchLabel = placeholder ?? t('search.placeholder')

  return (
    <div className="flex items-center gap-2">
      <Input
        value={search}
        onValueChange={onSearchChange}
        placeholder={searchLabel}
        aria-label={searchLabel}
        size="sm"
        variant="bordered"
        radius="md"
        startContent={<Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        classNames={{
          base: 'flex-1',
          inputWrapper:
            'h-9 min-h-9 border-input bg-background shadow-none data-[hover=true]:bg-muted/40 group-data-[focus=true]:border-ring',
          input: 'text-sm placeholder:text-muted-foreground'
        }}
      />
      {showScope && <ScopeSelect value={scope} onChange={onScopeChange} />}
    </div>
  )
}
