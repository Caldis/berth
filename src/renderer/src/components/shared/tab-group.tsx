import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export interface TabDef {
  id: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
}

interface TabGroupProps {
  tabs: readonly TabDef[]
  activeTab: string
  onTabChange: (id: string) => void
  counts?: Record<string, number>
}

export function TabGroup({ tabs, activeTab, onTabChange, counts }: TabGroupProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1">
      {tabs.map((tab) => {
        const count = counts?.[tab.id]
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {t(tab.labelKey)}
            {count != null && count > 0 && (
              <span
                className={cn(
                  'ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
