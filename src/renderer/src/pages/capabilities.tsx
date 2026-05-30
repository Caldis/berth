import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plug,
  Webhook,
  Puzzle,
  Activity,
  Shield,
  Variable,
  ChevronDown,
  ChevronRight,
  Circle,
  Eye,
  Check,
  X as XIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { filterAssetsByAgentView } from '@/lib/agent-view'
import { useAppStore } from '@/stores/app'
import { TabGroup, type TabDef } from '@/components/shared/tab-group'
import { FilterBar } from '@/components/shared/filter-bar'
import { DetailRow } from '@/components/shared/detail-row'
import { WarningBanner } from '@/components/shared/warning-banner'
import { ScopeBadge } from '@/components/shared/scope-badge'
import { HooksLifecycleView } from '@/components/capabilities/hooks-lifecycle-view'
import { AssetGuidePanel } from '@/components/shared/asset-guide-panel'
import { capabilityGuideMap, type CapabilityGuideId } from '@/lib/asset-guidance'
import type { Asset, AssetScope } from '@shared/types/asset'

type ScopeFilter = 'all' | AssetScope

const tabs: TabDef[] = [
  { id: 'mcp', labelKey: 'capabilities.tabs.mcp', icon: Plug },
  { id: 'hooks', labelKey: 'capabilities.tabs.hooks', icon: Webhook },
  { id: 'plugins', labelKey: 'capabilities.tabs.plugins', icon: Puzzle },
  { id: 'statusLine', labelKey: 'capabilities.tabs.statusLine', icon: Activity },
  { id: 'permissions', labelKey: 'capabilities.tabs.permissions', icon: Shield },
  { id: 'env', labelKey: 'capabilities.tabs.env', icon: Variable }
]

const tabTypeMap: Record<string, string[]> = {
  mcp: ['mcp-server'],
  hooks: ['hook'],
  plugins: ['plugin'],
  statusLine: ['statusline'],
  permissions: ['permission'],
  env: ['env']
}

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
      <Icon className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

/* ---------- MCP Server card ---------- */
function McpServerCard({ asset }: { asset: Asset }): React.ReactElement {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const openInspector = useAppStore((s) => s.openInspector)

  const status = (asset.meta.status as string) ?? 'unknown'
  const command = (asset.meta.command as string) ?? ''
  const args = (asset.meta.args as string[]) ?? []
  const envVars = (asset.meta.env as Record<string, string>) ?? {}
  const overriddenBy = (asset.meta.overriddenBy as string) ?? ''

  const statusColor = status === 'connected'
    ? 'text-green-500'
    : status === 'failed'
      ? 'text-destructive'
      : 'text-muted-foreground'

  const handleViewFile = useCallback(async () => {
    try {
      const full = await window.api?.assets.get(asset.id) as Asset | null
      if (full?.raw) openInspector(asset.path, full.raw)
    } catch { /* graceful */ }
  }, [asset.id, asset.path, openInspector])

  return (
    <div className="rounded-lg border border-border bg-card transition-colors hover:bg-accent/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <Circle className={cn('h-2.5 w-2.5 shrink-0 fill-current', statusColor)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{asset.name}</span>
            <ScopeBadge scope={asset.scope} />
          </div>
          {overriddenBy && (
            <p className="mt-0.5 text-xs text-amber-500">{t('capabilities.mcp.overriddenBy', { scope: overriddenBy })}</p>
          )}
        </div>
        <span className={cn('shrink-0 text-xs', statusColor)}>
          {t(`capabilities.mcp.status.${status}`)}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          {command && <DetailRow label={t('capabilities.mcp.command')} value={`${command} ${args.join(' ')}`} mono />}
          <DetailRow label={t('instructions.scope')} value={<ScopeBadge scope={asset.scope} />} />

          {Object.keys(envVars).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('capabilities.mcp.envVars')}</p>
              <div className="space-y-0.5">
                {Object.entries(envVars).map(([key]) => (
                  <div key={key} className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-foreground">{key}</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="text-muted-foreground">{'••••••'}</span>
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
              {t('common.viewRaw')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- MCP Summary ---------- */
function McpSummary({ assets }: { assets: Asset[] }): React.ReactElement {
  const { t } = useTranslation()

  const byScope = useMemo(() => {
    const counts = { user: 0, project: 0, enterprise: 0, conflicts: 0 }
    for (const a of assets) {
      if (a.scope === 'user') counts.user++
      else if (a.scope === 'project') counts.project++
      else if (a.scope === 'enterprise') counts.enterprise++
      if (a.meta.hasConflict) counts.conflicts++
    }
    return counts
  }, [assets])

  return (
    <div className="rounded-lg border border-border bg-card p-4 mb-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('capabilities.mcp.byScope')}</h3>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <p className="text-lg font-bold text-foreground">{byScope.user}</p>
          <p className="text-xs text-muted-foreground">{t('capabilities.mcp.userScope')}</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{byScope.project}</p>
          <p className="text-xs text-muted-foreground">{t('capabilities.mcp.projectScope')}</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{byScope.enterprise}</p>
          <p className="text-xs text-muted-foreground">{t('capabilities.mcp.enterpriseScope')}</p>
        </div>
        <div>
          <p className={cn('text-lg font-bold', byScope.conflicts > 0 ? 'text-amber-500' : 'text-foreground')}>{byScope.conflicts}</p>
          <p className="text-xs text-muted-foreground">{t('capabilities.mcp.mergeConflicts')}</p>
        </div>
      </div>
    </div>
  )
}

/* ---------- Plugin card ---------- */
function PluginCard({ asset }: { asset: Asset }): React.ReactElement {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const openInspector = useAppStore((s) => s.openInspector)

  const skillCount = (asset.meta.skillCount as number) ?? 0
  const commandCount = (asset.meta.commandCount as number) ?? 0
  const agentCount = (asset.meta.agentCount as number) ?? 0
  const containsTotal = skillCount + commandCount + agentCount

  const handleViewFile = useCallback(async () => {
    try {
      const full = await window.api?.assets.get(asset.id) as Asset | null
      if (full?.raw) openInspector(asset.path, full.raw)
    } catch { /* graceful */ }
  }, [asset.id, asset.path, openInspector])

  return (
    <div className="rounded-lg border border-border bg-card transition-colors hover:bg-accent/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <Puzzle className="h-4 w-4 shrink-0 text-purple-500" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{asset.name}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground font-mono">{asset.path}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {t('capabilities.plugins.contains', { count: containsTotal })}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          <DetailRow label={t('instructions.path')} value={asset.path} mono />
          {skillCount > 0 && <DetailRow label={t('instructions.tabs.skills')} value={String(skillCount)} />}
          {commandCount > 0 && <DetailRow label={t('instructions.tabs.commands')} value={String(commandCount)} />}
          {agentCount > 0 && <DetailRow label={t('instructions.tabs.subagents')} value={String(agentCount)} />}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleViewFile}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Eye className="h-3 w-3" />
              {t('common.viewRaw')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- StatusLine section ---------- */
function StatusLineSection({ assets }: { assets: Asset[] }): React.ReactElement {
  const { t } = useTranslation()
  const openInspector = useAppStore((s) => s.openInspector)

  if (assets.length === 0) {
    return <EmptyState icon={Activity} message={t('common.empty')} />
  }

  return (
    <div className="space-y-2">
      {assets.map((asset) => {
        const handleViewFile = async (): Promise<void> => {
          try {
            const full = await window.api?.assets.get(asset.id) as Asset | null
            if (full?.raw) openInspector(asset.path, full.raw)
          } catch { /* graceful */ }
        }

        return (
          <div key={asset.id} className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{asset.name}</span>
              <ScopeBadge scope={asset.scope} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground font-mono">{asset.path}</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleViewFile}
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Eye className="h-3 w-3" />
                {t('common.viewRaw')}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Permissions section ---------- */
function PermissionsSection({ assets }: { assets: Asset[] }): React.ReactElement {
  const { t } = useTranslation()

  const bypassAsset = assets.find((a) => a.meta.bypassPermissions === true)
  const allowAssets = assets.filter((a) => a.meta.listType === 'allow')
  const denyAssets = assets.filter((a) => a.meta.listType === 'deny')

  return (
    <div className="space-y-3">
      {bypassAsset && (
        <WarningBanner
          title={t('capabilities.permissions.warning')}
          message={t('capabilities.permissions.bypassEnabled', { scope: bypassAsset.scope })}
        />
      )}

      {/* Allow list */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Check className="h-3.5 w-3.5 text-green-500" />
            {t('capabilities.permissions.allowList')}
            <span className="text-xs text-muted-foreground">({allowAssets.length})</span>
          </h3>
        </div>
        {allowAssets.length === 0 ? (
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">{t('common.empty')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {allowAssets.map((a) => (
              <div key={a.id} className="flex items-center gap-2 px-4 py-2">
                <span className="min-w-0 truncate text-xs font-mono text-foreground">{(a.meta.pattern as string) ?? a.name}</span>
                <ScopeBadge scope={a.scope} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deny list */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <XIcon className="h-3.5 w-3.5 text-destructive" />
            {t('capabilities.permissions.denyList')}
            <span className="text-xs text-muted-foreground">({denyAssets.length})</span>
          </h3>
        </div>
        {denyAssets.length === 0 ? (
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">{t('common.empty')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {denyAssets.map((a) => (
              <div key={a.id} className="flex items-center gap-2 px-4 py-2">
                <span className="min-w-0 truncate text-xs font-mono text-foreground">{(a.meta.pattern as string) ?? a.name}</span>
                <ScopeBadge scope={a.scope} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- Env section ---------- */
function EnvSection({ assets }: { assets: Asset[] }): React.ReactElement {
  const { t } = useTranslation()

  if (assets.length === 0) {
    return <EmptyState icon={Variable} message={t('common.empty')} />
  }

  return (
    <div className="rounded-lg border border-border bg-card divide-y divide-border/50">
      {assets.map((a) => (
        <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
          <span className="min-w-0 shrink-0 text-sm font-mono font-medium text-foreground">{a.name}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-mono text-muted-foreground">
            {a.sensitive ? '••••••' : ((a.meta.value as string) ?? '••••••')}
          </span>
          <ScopeBadge scope={a.scope} />
        </div>
      ))}
    </div>
  )
}

/* ---------- Tab icon map ---------- */
const tabIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  mcp: Plug,
  hooks: Webhook,
  plugins: Puzzle,
  statusLine: Activity,
  permissions: Shield,
  env: Variable
}

/* ---------- Main page ---------- */
export function Capabilities(): React.ReactElement {
  const { t } = useTranslation()
  const assets = useAppStore((s) => s.assets)
  const agentView = useAppStore((s) => s.agentView)
  const [activeTab, setActiveTab] = useState('mcp')
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

  const showFilter = activeTab !== 'permissions'
  const activeGuide = capabilityGuideMap[activeTab as CapabilityGuideId]

  const renderContent = (): React.ReactElement => {
    switch (activeTab) {
      case 'mcp':
        if (filteredAssets.length === 0) return <EmptyState icon={Plug} message={t('common.empty')} />
        return (
          <div className="space-y-3">
            <McpSummary assets={filteredAssets} />
            <div className="space-y-2">
              {filteredAssets.map((a) => <McpServerCard key={a.id} asset={a} />)}
            </div>
          </div>
        )

      case 'hooks': {
        return <HooksLifecycleView assets={filteredAssets} agentView={agentView} search={search} scope={scope} />
      }

      case 'plugins':
        if (filteredAssets.length === 0) return <EmptyState icon={Puzzle} message={t('common.empty')} />
        return (
          <div className="space-y-2">
            {filteredAssets.map((a) => <PluginCard key={a.id} asset={a} />)}
          </div>
        )

      case 'statusLine':
        return <StatusLineSection assets={filteredAssets} />

      case 'permissions':
        return <PermissionsSection assets={filteredAssets} />

      case 'env':
        return <EnvSection assets={filteredAssets} />

      default: {
        const Icon = tabIconMap[activeTab] ?? Plug
        return <EmptyState icon={Icon} message={t('common.empty')} />
      }
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('capabilities.title')}</h1>

      <TabGroup tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} counts={tabCounts} />

      {showFilter && (
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          scope={scope}
          onScopeChange={setScope}
          placeholder={`${t('search.placeholder')} ${t(`capabilities.tabs.${activeTab}`)}`}
        />
      )}

      <AssetGuidePanel guide={activeGuide} />

      {renderContent()}
    </div>
  )
}
