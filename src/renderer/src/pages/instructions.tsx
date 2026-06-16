import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Sparkles,
  Bot,
  Terminal,
  Palette,
  Brain,
  FolderOpen,
  Link,
  FileCode,
  Hash
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'
import { type ScopeFilter } from '@/components/shared/filter-bar'
import { DetailRow } from '@/components/shared/detail-row'
import { EmptyState, PAGE_EMPTY_FILL } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { ScopeBadge } from '@/components/shared/scope-badge'
import { PluginOriginBadge } from '@/components/shared/plugin-origin-badge'
import { ViewRawButton } from '@/components/shared/view-raw-button'
import { pluginOriginOf } from '@/lib/plugin-origin'
import { useFocusTarget, FOCUS_HIGHLIGHT_CLASS } from '@/hooks/use-focus-target'
import {
  buildFeatureGuideEvidence,
  instructionGuideMap,
  type FeatureGuideDefinition,
  type FeatureGuideEvidence,
  type InstructionGuideId
} from '@/lib/feature-guidance'
import type { Asset } from '@shared/types/asset'
import { filterAssetsByAppScope } from '@shared/scope'
import { MemoryView } from '@/components/memory/memory-view'
import { useMemory } from '@/hooks/use-memory'
import { usePageChrome, type PageChromeConfig } from '@/components/layout/page-chrome'
import { VirtualGroupedList, type VirtualGroupedListHandle } from '@/components/shared/virtual-grouped-list'
import { type VirtualListGroup } from '@/lib/virtual-list-model'
import { Collapsible, CollapsibleChevron } from '@/components/ui'

const tabTypeMap: Record<string, string[]> = {
  conventions: ['claude-md', 'gemini-md', 'agents-md'],
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
        aria-expanded={expanded}
        aria-controls={`instruction-detail-${asset.id}`}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{asset.name}</span>
            <ScopeBadge scope={asset.scope} className="rounded-full px-2 font-semibold" />
          </div>
          <p className="whitespace-normal break-all text-xs leading-relaxed text-muted-foreground font-mono">{asset.path}</p>
        </div>
        {size > 0 && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {size > 1024 ? `${(size / 1024).toFixed(1)} KB` : `${size} B`}
          </span>
        )}
        <CollapsibleChevron open={expanded} className="mt-1" />
      </button>

      <Collapsible
        open={expanded}
        id={`instruction-detail-${asset.id}`}
        className="border-t border-border px-4 py-3 space-y-2"
        unmountOnExit
      >
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
      </Collapsible>
    </div>
  )
}

/* ---------- Skill card ---------- */
function SkillCard({ asset, focused = false }: { asset: Asset; focused?: boolean }): React.ReactElement {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const origin = pluginOriginOf(asset)

  const description = (asset.meta.description as string) ?? ''
  const triggerType = (asset.meta.triggerType as string) ?? 'manual'
  const tools = (asset.meta.tools as string[]) ?? []
  const fileCount = (asset.meta.fileCount as number) ?? 0
  const lineCount = (asset.meta.lineCount as number) ?? 0

  const handleShowInExplorer = useCallback(() => {
    window.api?.shell.openPath(asset.path)
  }, [asset.path])

  // Jumped-to from the plugin page: expand (page handles scroll via list ref).
  useEffect(() => {
    if (focused) setExpanded(true)
  }, [focused])

  return (
    <div
      data-testid={`instruction-asset-card-${asset.id}`}
      className={cn('rounded-lg border bg-card transition-colors hover:bg-accent/5', focused ? FOCUS_HIGHLIGHT_CLASS : 'border-border')}
    >
      <div className="flex items-stretch">
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={`instruction-detail-${asset.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
        >
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
          <CollapsibleChevron open={expanded} />
        </button>
        {origin && (
          <div className="flex shrink-0 items-center pr-3">
            <PluginOriginBadge pluginId={origin.pluginId} pluginName={origin.pluginName} />
          </div>
        )}
      </div>

      <Collapsible
        open={expanded}
        id={`instruction-detail-${asset.id}`}
        className="border-t border-border px-4 py-3 space-y-2"
        unmountOnExit
      >
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
      </Collapsible>
    </div>
  )
}

/* ---------- Generic asset card (subagents, commands, output modes) ---------- */
function GenericAssetCard({ asset, icon: Icon, focused = false }: { asset: Asset; icon: React.ComponentType<{ className?: string }>; focused?: boolean }): React.ReactElement {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const origin = pluginOriginOf(asset)

  const description = (asset.meta.description as string) ?? ''
  const model = (asset.meta.model as string) ?? ''
  const toolsCount = (asset.meta.toolsCount as number) ?? 0
  const agentCount = (asset.meta.agentCount as number) ?? 0

  const handleShowInExplorer = useCallback(() => {
    window.api?.shell.openPath(asset.path)
  }, [asset.path])

  useEffect(() => {
    if (focused) setExpanded(true)
  }, [focused])

  return (
    <div
      data-testid={`instruction-asset-card-${asset.id}`}
      className={cn('rounded-lg border bg-card transition-colors hover:bg-accent/5', focused ? FOCUS_HIGHLIGHT_CLASS : 'border-border')}
    >
      <div className="flex items-stretch">
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={`instruction-detail-${asset.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
        >
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
          <CollapsibleChevron open={expanded} />
        </button>
        {origin && (
          <div className="flex shrink-0 items-center pr-3">
            <PluginOriginBadge pluginId={origin.pluginId} pluginName={origin.pluginName} />
          </div>
        )}
      </div>

      <Collapsible
        open={expanded}
        id={`instruction-detail-${asset.id}`}
        className="border-t border-border px-4 py-3 space-y-2"
        unmountOnExit
      >
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
      </Collapsible>
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
  evidence,
  guide,
  search,
  setSearch
}: {
  activeTab: string
  evidence: FeatureGuideEvidence[]
  guide?: FeatureGuideDefinition
  search: string
  setSearch: (value: string) => void
}): null {
  const { t } = useTranslation()
  const title = t(`instructions.tabs.${activeTab}`)
  const pageChrome = useMemo<PageChromeConfig>(() => ({
    title,
    sectionLabelKey: 'nav.sections.instructions',
    search: {
      value: search,
      onValueChange: setSearch,
      placeholder: t('search.filterPlaceholder', { target: title }),
      ariaLabel: t('search.filterPlaceholder', { target: title })
    },
    guide: guide
      ? {
          definition: guide,
          evidence
        }
      : undefined
  }), [evidence, guide, search, setSearch, t, title])
  usePageChrome(pageChrome, [pageChrome])

  return null
}

const SCOPE_CHIP_ORDER = ['user', 'project', 'enterprise']

// Scope sits at the top as chips (mirroring the memory page's source chips)
// instead of a left jump rail + a dropdown — one surface, one source of truth.
function ScopeFilterChips({
  scope,
  options,
  total,
  allLabel,
  onChange,
  testId
}: {
  scope: ScopeFilter
  options: Array<{ id: string; label: string; count: number }>
  total: number
  allLabel: string
  onChange: (scope: ScopeFilter) => void
  testId?: string
}): React.ReactElement | null {
  if (options.length === 0) return null
  const chip = (id: ScopeFilter, label: string, count: number): React.ReactElement => (
    <button
      key={id}
      type="button"
      aria-pressed={scope === id}
      onClick={() => onChange(id)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        scope === id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/70'
      )}
    >
      {label}
      <span className="rounded-full bg-muted px-1.5 text-[10px]">{count}</span>
    </button>
  )
  return (
    <div data-testid={testId} className="flex flex-wrap gap-2">
      {chip('all', allLabel, total)}
      {options.map((option) => chip(option.id as ScopeFilter, option.label, option.count))}
    </div>
  )
}

/* ---------- Main page ---------- */
export function Instructions({ activeSection }: { activeSection?: string } = {}): React.ReactElement {
  const { t } = useTranslation()
  const assets = useAppStore((s) => s.assets)
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const scanning = useAppStore((s) => s.assetRuntimeStatus.state === 'scanning')
  const runtimeState = useAppStore((s) => s.assetRuntimeStatus.state)
  const { result: memoryResult } = useMemory()
  const activeTab = normalizeInstructionSection(activeSection)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<ScopeFilter>('all')
  const listRef = useRef<VirtualGroupedListHandle | null>(null)
  const { focusId, isFocused } = useFocusTarget()

  // Jumped-to from the plugin page: scroll the virtual list to the focused asset.
  useEffect(() => {
    if (!focusId) return
    const id = window.setTimeout(() => listRef.current?.scrollToItem(focusId, 'center'), 0)
    return () => window.clearTimeout(id)
  }, [focusId])
  const deferredSearch = useDeferredValue(search)
  const visibleAssets = useMemo(
    () => filterAssetsByAppScope(assets, scopeSelection),
    [assets, scopeSelection]
  )

  // Type-filtered assets feed the scope chips; their counts stay stable across
  // search / scope so the chips never disappear while you are filtering.
  const scopeAssets = useMemo(() => {
    const types = tabTypeMap[activeTab] ?? []
    return visibleAssets.filter((a) => types.includes(a.type))
  }, [visibleAssets, activeTab])

  const scopeOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const asset of scopeAssets) counts.set(asset.scope, (counts.get(asset.scope) ?? 0) + 1)
    return [...counts.entries()]
      .sort((a, b) => {
        const ia = SCOPE_CHIP_ORDER.indexOf(a[0])
        const ib = SCOPE_CHIP_ORDER.indexOf(b[0])
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
      })
      .map(([id, count]) => ({ id, label: t(`common.scope.${id}`), count }))
  }, [scopeAssets, t])

  // Filter assets for active tab
  const filteredAssets = useMemo(() => {
    return scopeAssets.filter((a) => {
      if (scope !== 'all' && a.scope !== scope) return false
      if (deferredSearch) {
        const q = deferredSearch.toLowerCase()
        const name = a.name.toLowerCase()
        const desc = ((a.meta.description as string) ?? '').toLowerCase()
        if (!name.includes(q) && !desc.includes(q)) return false
      }
      return true
    })
  }, [scopeAssets, deferredSearch, scope])
  const assetGroups = useMemo(() => buildInstructionGroups(filteredAssets, t), [filteredAssets, t])

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
    <div className="min-h-[520px]">
      <VirtualGroupedList<Asset>
        ref={listRef}
        groups={assetGroups}
        getItemKey={(asset) => asset.id}
        renderGroup={(group) => (
          // The group label already is the scope name (groups are by scope); a
          // ScopeBadge here would just repeat it ("项目级 项目级"). Plain label +
          // count, consistent with the memory/sessions group headers.
          <div data-testid={`instructions-group-${group.id}`} className="flex items-center gap-2 px-1 py-2">
            <span className="min-w-0 truncate text-sm font-medium text-foreground">{group.label}</span>
            <span className="ml-auto text-xs text-muted-foreground">{group.count}</span>
          </div>
        )}
        renderItem={(asset) => (
          <div className="pb-2">
            {renderAsset(asset)}
          </div>
        )}
        className="min-w-0"
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
      // Still scanning and this category hasn't been reached yet — skeleton, not a
      // misleading empty (the snapshot is partial). (GH-113 不误导虚假完整)
      if (scanning || (runtimeState === 'idle' && assets.length === 0)) {
        return <LoadingState title={t('nav.scanStatus.scanning')} icon={Icon} />
      }
      return <EmptyState fullHeight icon={Icon} message={t('common.empty')} />
    }

    switch (activeTab) {
      case 'conventions':
        return renderVirtualAssetList((asset) => <MemoryCard asset={asset} />)
      case 'skills':
        return renderVirtualAssetList((asset) => <SkillCard asset={asset} focused={isFocused(asset.id)} />)
      case 'subagents':
        return renderVirtualAssetList((asset) => <GenericAssetCard asset={asset} icon={Bot} focused={isFocused(asset.id)} />)
      case 'commands':
        return renderVirtualAssetList((asset) => <GenericAssetCard asset={asset} icon={Terminal} focused={isFocused(asset.id)} />)
      case 'outputModes':
        return renderVirtualAssetList((asset) => <GenericAssetCard asset={asset} icon={Palette} focused={isFocused(asset.id)} />)
      default:
        return <EmptyState fullHeight icon={FileText} message={t('common.empty')} />
    }
  }

  return (
    <div className={`flex flex-col gap-4 ${PAGE_EMPTY_FILL}`}>
      {activeTab !== 'memories' && (
        <InstructionPageChrome
          activeTab={activeTab}
          evidence={activeEvidence}
          guide={activeGuide}
          search={search}
          setSearch={setSearch}
        />
      )}

      {activeTab !== 'memories' && (
        <ScopeFilterChips
          scope={scope}
          options={scopeOptions}
          total={scopeAssets.length}
          allLabel={t('filter.allScopes', 'All scopes')}
          onChange={setScope}
          testId="instructions-scope-filter"
        />
      )}

      {renderContent()}
    </div>
  )
}
