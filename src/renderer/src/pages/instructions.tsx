import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Sparkles,
  Bot,
  Terminal,
  Palette,
  Brain,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Link,
  FileCode,
  Hash
} from 'lucide-react'
import { truncatePath } from '@/lib/utils'
import { filterAssetsByAgentView } from '@/lib/agent-view'
import { useAppStore } from '@/stores/app'
import { ScopeSelect, type ScopeFilter } from '@/components/shared/filter-bar'
import { DetailRow } from '@/components/shared/detail-row'
import { EmptyState } from '@/components/shared/empty-state'
import { ScopeBadge } from '@/components/shared/scope-badge'
import { ViewRawButton } from '@/components/shared/view-raw-button'
import {
  buildFeatureGuideEvidence,
  instructionGuideMap,
  type FeatureGuideDefinition,
  type FeatureGuideEvidence,
  type InstructionGuideId
} from '@/lib/feature-guidance'
import type { AgentView, Asset } from '@shared/types/asset'
import { filterAssetsByAppScope } from '@shared/scope'
import { MemoryView } from '@/components/memory/memory-view'
import { useMemory } from '@/hooks/use-memory'
import { usePageChrome, type PageChromeConfig } from '@/components/layout/page-chrome'
import { VirtualGroupedList, type VirtualGroupedListHandle } from '@/components/shared/virtual-grouped-list'
import { CategoryJumpNav } from '@/components/shared/category-jump-nav'
import { buildJumpNavItems, type VirtualListGroup } from '@/lib/virtual-list-model'

const tabTypeMap: Record<string, string[]> = {
  conventions: ['claude-md', 'agents-md'],
  skills: ['skill'],
  subagents: ['agent'],
  commands: ['command'],
  outputModes: ['output-mode']
}

/* ---------- Memory card ---------- */
function MemoryCard({ asset }: { asset: Asset }): React.ReactElement {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const size = (asset.meta.size as number) ?? 0
  const imports = (asset.meta.imports as string[]) ?? []

  const handleShowInExplorer = useCallback(() => {
    window.api?.shell.openPath(asset.path)
  }, [asset.path])

  return (
    <div data-testid={`instruction-asset-card-${asset.id}`} className="rounded-lg border border-border bg-card transition-colors hover:bg-accent/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{asset.name}</span>
            <ScopeBadge scope={asset.scope} className="rounded-full px-2 font-semibold" />
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
          <DetailRow label={t('instructions.scope')} value={<ScopeBadge scope={asset.scope} className="rounded-full px-2 font-semibold" />} />
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
            <ViewRawButton asset={asset} label={t('instructions.viewFile')} />
            <button
              onClick={handleShowInExplorer}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
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

  const description = (asset.meta.description as string) ?? ''
  const triggerType = (asset.meta.triggerType as string) ?? 'manual'
  const tools = (asset.meta.tools as string[]) ?? []
  const fileCount = (asset.meta.fileCount as number) ?? 0
  const lineCount = (asset.meta.lineCount as number) ?? 0

  const handleShowInExplorer = useCallback(() => {
    window.api?.shell.openPath(asset.path)
  }, [asset.path])

  return (
    <div data-testid={`instruction-asset-card-${asset.id}`} className="rounded-lg border border-border bg-card transition-colors hover:bg-accent/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <Sparkles className="h-4 w-4 shrink-0 text-blue-500" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{asset.name}</span>
            <ScopeBadge scope={asset.scope} className="rounded-full px-2 font-semibold" />
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
          <DetailRow label={t('instructions.scope')} value={<ScopeBadge scope={asset.scope} className="rounded-full px-2 font-semibold" />} />
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
            <ViewRawButton asset={asset} label={t('instructions.viewFile')} />
            <button
              onClick={handleShowInExplorer}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
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

/* ---------- Generic asset card (subagents, commands, output modes) ---------- */
function GenericAssetCard({ asset, icon: Icon }: { asset: Asset; icon: React.ComponentType<{ className?: string }> }): React.ReactElement {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const description = (asset.meta.description as string) ?? ''
  const model = (asset.meta.model as string) ?? ''
  const toolsCount = (asset.meta.toolsCount as number) ?? 0
  const agentCount = (asset.meta.agentCount as number) ?? 0

  const handleShowInExplorer = useCallback(() => {
    window.api?.shell.openPath(asset.path)
  }, [asset.path])

  return (
    <div data-testid={`instruction-asset-card-${asset.id}`} className="rounded-lg border border-border bg-card transition-colors hover:bg-accent/5">
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
            <ScopeBadge scope={asset.scope} className="rounded-full px-2 font-semibold" />
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
          <DetailRow label={t('instructions.scope')} value={<ScopeBadge scope={asset.scope} className="rounded-full px-2 font-semibold" />} />
          <DetailRow label={t('instructions.path')} value={asset.path} mono />

          <div className="flex gap-2 pt-1">
            <ViewRawButton asset={asset} label={t('instructions.viewFile')} />
            <button
              onClick={handleShowInExplorer}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
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
  memories: Brain,
  conventions: FileText,
  skills: Sparkles,
  subagents: Bot,
  commands: Terminal,
  outputModes: Palette
}

function normalizeInstructionSection(value: string | undefined): string {
  return value && Object.prototype.hasOwnProperty.call(tabIconMap, value) ? value : 'skills'
}

function buildInstructionGroups(
  assets: readonly Asset[],
  t: ReturnType<typeof useTranslation>['t']
): VirtualListGroup<Asset>[] {
  const groups = new Map<string, VirtualListGroup<Asset>>()

  for (const asset of assets) {
    const groupId = `scope:${asset.scope}`
    const existing = groups.get(groupId)
    if (existing) {
      existing.items = [...existing.items, asset]
      existing.count = existing.items.length
    } else {
      groups.set(groupId, {
        id: groupId,
        label: t(`common.scope.${asset.scope}`),
        count: 1,
        items: [asset],
        meta: { scope: asset.scope }
      })
    }
  }

  return [...groups.values()]
}

function InstructionPageChrome({
  activeTab,
  agentView,
  evidence,
  guide,
  scope,
  search,
  setScope,
  setSearch
}: {
  activeTab: string
  agentView: AgentView
  evidence: FeatureGuideEvidence[]
  guide?: FeatureGuideDefinition
  scope: ScopeFilter
  search: string
  setScope: (scope: ScopeFilter) => void
  setSearch: (value: string) => void
}): null {
  const { t } = useTranslation()
  const actions = useMemo<React.ReactNode>(() => (
    <ScopeSelect value={scope} onChange={setScope} className="w-36" />
  ), [scope, setScope])
  const title = t(`instructions.tabs.${activeTab}`)
  const pageChrome = useMemo<PageChromeConfig>(() => ({
    title,
    sectionLabelKey: 'nav.sections.instructions',
    search: {
      value: search,
      onValueChange: setSearch,
      placeholder: `${t('search.placeholder')} ${title}`,
      ariaLabel: `${t('search.placeholder')} ${title}`
    },
    guide: guide
      ? {
          definition: guide,
          evidence,
          agentView
        }
      : undefined,
    actions
  }), [actions, agentView, evidence, guide, search, setSearch, t, title])
  usePageChrome(pageChrome, [pageChrome])

  return null
}

/* ---------- Main page ---------- */
export function Instructions({ activeSection }: { activeSection?: string } = {}): React.ReactElement {
  const { t } = useTranslation()
  const assets = useAppStore((s) => s.assets)
  const agentView = useAppStore((s) => s.agentView)
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const { result: memoryResult } = useMemory()
  const activeTab = normalizeInstructionSection(activeSection)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<ScopeFilter>('all')
  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(undefined)
  const deferredSearch = useDeferredValue(search)
  const listRef = useRef<VirtualGroupedListHandle | null>(null)
  const visibleAssets = useMemo(
    () => filterAssetsByAppScope(filterAssetsByAgentView(assets, agentView), scopeSelection),
    [assets, agentView, scopeSelection]
  )

  // Filter assets for active tab
  const filteredAssets = useMemo(() => {
    const types = tabTypeMap[activeTab] ?? []
    return visibleAssets.filter((a) => {
      if (!types.includes(a.type)) return false
      if (scope !== 'all' && a.scope !== scope) return false
      if (deferredSearch) {
        const q = deferredSearch.toLowerCase()
        const name = a.name.toLowerCase()
        const desc = ((a.meta.description as string) ?? '').toLowerCase()
        if (!name.includes(q) && !desc.includes(q)) return false
      }
      return true
    })
  }, [visibleAssets, activeTab, deferredSearch, scope])
  const assetGroups = useMemo(() => buildInstructionGroups(filteredAssets, t), [filteredAssets, t])
  const jumpItems = useMemo(() => buildJumpNavItems(assetGroups), [assetGroups])

  useEffect(() => {
    setActiveGroupId((current) => {
      if (current && assetGroups.some((group) => group.id === current)) return current
      return assetGroups[0]?.id
    })
  }, [assetGroups])

  const handleJumpSelect = useCallback((groupId: string) => {
    setActiveGroupId(groupId)
    listRef.current?.scrollToGroup(groupId)
  }, [])
  const activeGuide = instructionGuideMap[activeTab as InstructionGuideId]
  const activeEvidence = useMemo<FeatureGuideEvidence[]>(() => {
    if (activeTab !== 'memories') return buildFeatureGuideEvidence(filteredAssets)

    const availableSources = memoryResult.sources.filter((source) => source.available).length
    return [
      { labelKey: 'memory.evidence.notes', value: memoryResult.notes.length },
      { labelKey: 'memory.evidence.sources', value: memoryResult.sources.length },
      { labelKey: 'memory.evidence.availableSources', value: availableSources }
    ]
  }, [activeTab, filteredAssets, memoryResult.notes.length, memoryResult.sources])

  const renderVirtualAssetList = (
    renderAsset: (asset: Asset) => React.ReactNode
  ): React.ReactElement => (
    <div className="flex min-h-[520px] gap-4 max-lg:flex-col">
      <CategoryJumpNav
        items={jumpItems}
        activeId={activeGroupId}
        onSelect={handleJumpSelect}
        label={t('instructions.groupNavigation')}
        testId="instructions-category-jump-nav"
      />
      <VirtualGroupedList<Asset>
        ref={listRef}
        groups={assetGroups}
        getItemKey={(asset) => asset.id}
        onActiveGroupChange={(groupId) => setActiveGroupId(groupId)}
        renderGroup={(group) => {
          const scopeValue = typeof group.meta?.scope === 'string' ? group.meta.scope as Asset['scope'] : 'user'
          return (
            <div className="flex items-center gap-2 px-1 py-2">
              <ScopeBadge scope={scopeValue} className="rounded-full px-2 font-semibold" />
              <span className="min-w-0 truncate text-sm font-medium text-foreground">{group.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{group.count}</span>
            </div>
          )
        }}
        renderItem={(asset) => (
          <div className="pb-2">
            {renderAsset(asset)}
          </div>
        )}
        className="min-w-0 flex-1"
        listClassName="min-h-[520px]"
        defaultItemHeight={86}
        testId="instructions-virtual-list"
      />
    </div>
  )

  const renderContent = (): React.ReactElement => {
    if (activeTab === 'memories') {
      return <MemoryView />
    }

    if (filteredAssets.length === 0) {
      const Icon = tabIconMap[activeTab] ?? FileText
      return <EmptyState icon={Icon} message={t('common.empty')} />
    }

    switch (activeTab) {
      case 'conventions':
        return renderVirtualAssetList((asset) => <MemoryCard asset={asset} />)
      case 'skills':
        return renderVirtualAssetList((asset) => <SkillCard asset={asset} />)
      case 'subagents':
        return renderVirtualAssetList((asset) => <GenericAssetCard asset={asset} icon={Bot} />)
      case 'commands':
        return renderVirtualAssetList((asset) => <GenericAssetCard asset={asset} icon={Terminal} />)
      case 'outputModes':
        return renderVirtualAssetList((asset) => <GenericAssetCard asset={asset} icon={Palette} />)
      default:
        return <EmptyState icon={FileText} message={t('common.empty')} />
    }
  }

  return (
    <div className="space-y-4">
      {activeTab !== 'memories' && (
        <InstructionPageChrome
          activeTab={activeTab}
          agentView={agentView}
          evidence={activeEvidence}
          guide={activeGuide}
          search={search}
          scope={scope}
          setSearch={setSearch}
          setScope={setScope}
        />
      )}

      {renderContent()}
    </div>
  )
}
