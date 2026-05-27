import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plug, Webhook, Puzzle, Activity, Shield, Variable } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'mcp', labelKey: 'capabilities.tabs.mcp', icon: Plug },
  { id: 'hooks', labelKey: 'capabilities.tabs.hooks', icon: Webhook },
  { id: 'plugins', labelKey: 'capabilities.tabs.plugins', icon: Puzzle },
  { id: 'statusLine', labelKey: 'capabilities.tabs.statusLine', icon: Activity },
  { id: 'permissions', labelKey: 'capabilities.tabs.permissions', icon: Shield },
  { id: 'env', labelKey: 'capabilities.tabs.env', icon: Variable }
] as const

export function Capabilities(): React.ReactElement {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('mcp')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('capabilities.title')}</h1>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <Plug className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      </div>
    </div>
  )
}
