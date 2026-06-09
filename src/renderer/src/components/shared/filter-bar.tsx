import { useTranslation } from 'react-i18next'
import { Select, SelectItem } from '@/components/ui'
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
