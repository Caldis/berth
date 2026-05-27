import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Sparkles, Bot, Terminal, Palette, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'memories', labelKey: 'instructions.tabs.memories', icon: FileText },
  { id: 'skills', labelKey: 'instructions.tabs.skills', icon: Sparkles },
  { id: 'subagents', labelKey: 'instructions.tabs.subagents', icon: Bot },
  { id: 'commands', labelKey: 'instructions.tabs.commands', icon: Terminal },
  { id: 'outputModes', labelKey: 'instructions.tabs.outputModes', icon: Palette },
  { id: 'agentTeams', labelKey: 'instructions.tabs.agentTeams', icon: Users }
] as const

export function Instructions(): React.ReactElement {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('skills')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('instructions.title')}</h1>

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

      {/* Search */}
      <input
        placeholder={`${t('search.placeholder')} ${t(`instructions.tabs.${activeTab}`)}`}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-1"
      />

      {/* Content */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      </div>
    </div>
  )
}
