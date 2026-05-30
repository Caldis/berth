import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Sparkles,
  Bot,
  Terminal,
  Palette,
  Users,
  ChevronDown,
  ChevronRight,
  Eye,
  FolderOpen,
  Link,
  FileCode,
  Hash
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { truncatePath } from '@/lib/utils'
import { filterAssetsByAgentView } from '@/lib/agent-view'
import { useAppStore } from '@/stores/app'
import { TabGroup, type TabDef } from '@/components/shared/tab-group'
import { FilterBar } from '@/components/shared/filter-bar'
import { DetailRow } from '@/components/shared/detail-row'
import type { Asset, AssetScope } from '@shared/types/asset'

type ScopeFilter = 'all' | AssetScope

const tabs: TabDef[] = [
  { id: 'memories', labelKey: 'instructions.tabs.memories', icon: FileText },
  { id: 'skills', labelKey: 'instructions.tabs.skills', icon: Sparkles },
  { id: 'subagents', labelKey: 'instructions.tabs.subagents', icon: Bot },
  { id: 'commands', labelKey: 'instructions.tabs.commands', icon: Terminal },
  { id: 'outputModes', labelKey: 'instructions.tabs.outputModes', icon: Palette },
  { id: 'agentTeams', labelKey: 'instructions.tabs.agentTeams', icon: Users }
]

const tabTypeMap: Record<string, string[]> = {
  memories: ['claude-md', 'agents-md'],
  skills: ['skill'],
  subagents: ['agent'],
  commands: ['command'],
  outputModes: ['output-mode'],
  agentTeams: ['team']
}

function ScopeBadge({ scope }: { scope: AssetScope }): React.ReactElement {
  const { t } = useTranslation()
  const colors: Record<string, string> = {
    user: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    project: 'bg-green-500/10 text-green-600 dark:text-green-400',
    enterprise: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    session: 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', colors[scope] ?? 'bg-muted text-muted-foreground')}>
      {t(`common.scope.${scope}`)}
    </span>
  )
}

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
      <Icon className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

/* ---------- Memory card ---------- */
function MemoryCard({ asset }: { asset: Asset }): React.ReactElement {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const openInspector = useAppStore((s) => s.openInspector)

  const size = (asset.meta.size as number) ?? 0
  const imports = (asset.meta.imports as string[]) ?? []

  const handleViewFile = useCallback(async () => {
    try {
      const full = await window.api?.assets.get(asset.id) as Asset | null
      if (full?.raw) openInspector(asset.path, full.raw)
    } catch { /* graceful */ }
  }, [asset.id, asset.path, openInspector])

  const handleShowInExplorer = useCallback(() => {
    window.api?.shell.openPath(asset.path)
  }, [asset.path])

  return (
    <div className="rounded-lg border border-border bg-card transition-colors hover:bg-accent/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{asset.name}</span>
            <ScopeBadge scope={asset.scope} />
          </div>
          <p className="truncate text-xs text-muted-foreground font-mono">{truncatePath(asset.path)}</p>
        </div>
        {size > 0 && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {size > 1024 ? `${(size / 1024).toFixed(1)} KB` : `${size} B`}
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          <DetailRow label={t('instructions.scope')} value={<ScopeBadge scope={asset.scope} />} />
          <DetailRow label={t('instructions.path')} value={asset.path} mono />

          {imports.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('instructions.importChain')}</p>
              <div className="space-y-1">
                {imports.map((imp) => (
                  <div key={imp} className="flex items-center gap-1.5 text-xs">
                    <Link className="h-3 w-3 text-primary" />
                    <span className="font-mono text-primary">{imp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleViewFile}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Eye className="h-3 w-3" />
              {t('instructions.viewFile')}
            </button>
            <button
              onClick={handleShowInExplorer}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <FolderOpen className="h-3 w-3" />
              {t('instructions.showInExplorer')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Skill card ---------- */
function SkillCard({ asset }: { asset: Asset }): React.ReactElement {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const openInspector = useAppStore((s) => s.openInspector)

  const description = (asset.meta.description as string) ?? ''
  const triggerType = (asset.meta.triggerType as string) ?? 'manual'
  const tools = (asset.meta.tools as string[]) ?? []
  const fileCount = (asset.meta.fileCount as number) ?? 0
  const lineCount = (asset.meta.lineCount as number) ?? 0

  const handleViewFile = useCallback(async () => {
    try {
      const full = await window.api?.assets.get(asset.id) as Asset | null
      if (full?.raw) openInspector(asset.path, full.raw)
    } catch { /* graceful */ }
  }, [asset.id, asset.path, openInspector])

  const handleShowInExplorer = useCallback(() => {
    window.api?.shell.openPath(asset.path)
  }, [asset.path])

  return (
    <div className="rounded-lg border border-border bg-card transition-colors hover:bg-accent/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <Sparkles className="h-4 w-4 shrink-0 text-blue-500" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{asset.name}</span>
            <ScopeBadge scope={asset.scope} />
          </div>
          {description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          {fileCount > 0 && (
            <span className="flex items-center gap-1">
              <FileCode className="h-3 w-3" />
              {fileCount}
            </span>
          )}
          {lineCount > 0 && (
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {lineCount}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          {description && (
            <DetailRow label={t('instructions.description')} value={description} />
          )}
          <DetailRow label={t('instructions.trigger')} value={triggerType} />
          <DetailRow label={t('instructions.scope')} value={<ScopeBadge scope={asset.scope} />} />
          <DetailRow label={t('instructions.path')} value={asset.path} mono />

          {tools.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('instructions.tools')}</p>
              <div className="flex flex-wrap gap-1">
                {tools.map((tool) => (
                  <span key={tool} className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleViewFile}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Eye className="h-3 w-3" />
              {t('instructions.viewFile')}
            </button>
            <button
              onClick={handleShowInExplorer}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <FolderOpen className="h-3 w-3" />
              {t('instructions.showInExplorer')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Generic asset card (subagents, commands, output modes, teams) ---------- */
function GenericAssetCard({ asset, icon: Icon }: { asset: Asset; icon: React.ComponentType<{ className?: string }> }): React.ReactElement {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const openInspector = useAppStore((s) => s.openInspector)

  const description = (asset.meta.description as string) ?? ''
  const model = (asset.meta.model as string) ?? ''
  const toolsCount = (asset.meta.toolsCount as number) ?? 0
  const agentCount = (asset.meta.agentCount as number) ?? 0

  const handleViewFile = useCallback(async () => {
    try {
      const full = await window.api?.assets.get(asset.id) as Asset | null
      if (full?.raw) openInspector(asset.path, full.raw)
    } catch { /* graceful */ }
  }, [asset.id, asset.path, openInspector])

  const handleShowInExplorer = useCallback(() => {
    window.api?.shell.openPath(asset.path)
  }, [asset.path])

  return (
    <div className="rounded-lg border border-border bg-card transition-colors hover:bg-accent/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {asset.type === 'command' ? `/${asset.name}` : asset.name}
            </span>
            <ScopeBadge scope={asset.scope} />
          </div>
          {description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          {model && <span>{model}</span>}
          {toolsCount > 0 && (
            <span>{toolsCount} {t('instructions.tools')}</span>
          )}
          {agentCount > 0 && (
            <span>{agentCount} {t('instructions.agents')}</span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          {description && (
            <DetailRow label={t('instructions.description')} value={description} />
          )}
          {model && <DetailRow label={t('instructions.model')} value={model} />}
          <DetailRow label={t('instructions.scope')} value={<ScopeBadge scope={asset.scope} />} />
          <DetailRow label={t('instructions.path')} value={asset.path} mono />

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleViewFile}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Eye className="h-3 w-3" />
              {t('instructions.viewFile')}
            </button>
            <button
              onClick={handleShowInExplorer}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <FolderOpen className="h-3 w-3" />
              {t('instructions.showInExplorer')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Tab icon map ---------- */
const tabIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  memories: FileText,
  skills: Sparkles,
  subagents: Bot,
  commands: Terminal,
  outputModes: Palette,
  agentTeams: Users
}

/* ---------- Main page ---------- */
export function Instructions(): React.ReactElement {
  const { t } = useTranslation()
  const assets = useAppStore((s) => s.assets)
  const agentView = useAppStore((s) => s.agentView)
  const [activeTab, setActiveTab] = useState('skills')
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<ScopeFilter>('all')
  const visibleAssets = useMemo(() => filterAssetsByAgentView(assets, agentView), [assets, agentView])

  // Build tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tab of tabs) {
      const types = tabTypeMap[tab.id] ?? []
      counts[tab.id] = visibleAssets.filter((a) => types.includes(a.type)).length
    }
    return counts
  }, [visibleAssets])

  // Filter assets for active tab
  const filteredAssets = useMemo(() => {
    const types = tabTypeMap[activeTab] ?? []
    return visibleAssets.filter((a) => {
      if (!types.includes(a.type)) return false
      if (scope !== 'all' && a.scope !== scope) return false
      if (search) {
        const q = search.toLowerCase()
        const name = a.name.toLowerCase()
        const desc = ((a.meta.description as string) ?? '').toLowerCase()
        if (!name.includes(q) && !desc.includes(q)) return false
      }
      return true
    })
  }, [visibleAssets, activeTab, search, scope])

  const renderContent = (): React.ReactElement => {
    if (filteredAssets.length === 0) {
      const Icon = tabIconMap[activeTab] ?? FileText
      return <EmptyState icon={Icon} message={t('common.empty')} />
    }

    switch (activeTab) {
      case 'memories':
        return (
          <div className="space-y-2">
            {filteredAssets.map((a) => <MemoryCard key={a.id} asset={a} />)}
          </div>
        )
      case 'skills':
        return (
          <div className="space-y-2">
            {filteredAssets.map((a) => <SkillCard key={a.id} asset={a} />)}
          </div>
        )
      case 'subagents':
        return (
          <div className="space-y-2">
            {filteredAssets.map((a) => <GenericAssetCard key={a.id} asset={a} icon={Bot} />)}
          </div>
        )
      case 'commands':
        return (
          <div className="space-y-2">
            {filteredAssets.map((a) => <GenericAssetCard key={a.id} asset={a} icon={Terminal} />)}
          </div>
        )
      case 'outputModes':
        return (
          <div className="space-y-2">
            {filteredAssets.map((a) => <GenericAssetCard key={a.id} asset={a} icon={Palette} />)}
          </div>
        )
      case 'agentTeams':
        return (
          <div className="space-y-2">
            {filteredAssets.map((a) => <GenericAssetCard key={a.id} asset={a} icon={Users} />)}
          </div>
        )
      default:
        return <EmptyState icon={FileText} message={t('common.empty')} />
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('instructions.title')}</h1>

      <TabGroup tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} counts={tabCounts} />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        scope={scope}
        onScopeChange={setScope}
        placeholder={`${t('search.placeholder')} ${t(`instructions.tabs.${activeTab}`)}`}
      />

      {renderContent()}
    </div>
  )
}
