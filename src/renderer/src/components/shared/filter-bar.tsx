import { useTranslation } from 'react-i18next'
import { FilterSelect, SelectItem } from '@/components/ui'
import type { AssetScope } from '@shared/types/asset'

export type ScopeFilter = 'all' | AssetScope

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
    <FilterSelect
      aria-label={t('filter.scope', 'Scope')}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const next = Array.from(keys)[0]
        if (next) onChange(next as ScopeFilter)
      }}
      className={className}
    >
      {scopeOptions.map((opt) => (
        <SelectItem key={opt.value}>{t(opt.labelKey)}</SelectItem>
      ))}
    </FilterSelect>
  )
}
