import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Plug,
  Webhook,
  Puzzle,
  Activity,
  Shield,
  Variable,
  ChevronRight,
  Circle,
  Check,
  X as XIcon,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'
import { useAgentCapabilityPlugins } from '@/hooks/use-ipc'
import { ScopeSelect, type ScopeFilter } from '@/components/shared/filter-bar'
import { EmptyState, PAGE_EMPTY_FILL } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { DetailRow } from '@/components/shared/detail-row'
import { WarningBanner } from '@/components/shared/warning-banner'
import { ScopeBadge } from '@/components/shared/scope-badge'
import { ExpandableAssetCard } from '@/components/shared/expandable-asset-card'
import { ViewRawButton } from '@/components/shared/view-raw-button'
import { routeForAsset } from '@/lib/asset-route'
import { useFocusTarget, FOCUS_HIGHLIGHT_CLASS } from '@/hooks/use-focus-target'
import { pluginOriginOf } from '@/lib/plugin-origin'
import { HooksLifecycleView } from '@/components/capabilities/hooks-lifecycle-view'
import { Accordion, AccordionItem, Chip, ACCORDION_MOTION_PROPS } from '@/components/ui'
import {
  buildFeatureGuideEvidence,
  capabilityGuideMap,
  type CapabilityGuideId,
  type FeatureGuideDefinition,
  type FeatureGuideEvidence
} from '@/lib/feature-guidance'
import {
  groupEnvVars,
  normalizeEnvVars,
  normalizePermissionRules,
  summarizePermissionRules,
  type EnvVarGroupSection,
  type PermissionRuleKind,
  type PermissionRuleRow
} from '@/lib/capability-assets'
import type { AgentView, Asset } from '@shared/types/asset'
import { filterAssetsByAppScope, matchesAgentView } from '@shared/scope'
import {
  buildStatusLineViewModels,
  getWorstDiagnosticLevel,
  type StatusLineDiagnostic,
  type StatusLineViewModel
} from '@/lib/status-line-models'
import { shouldShowScanningState } from '@/lib/runtime-state'
import { usePageChrome, type PageChromeConfig } from '@/components/layout/page-chrome'

const DEFAULT_CAPABILITY_TAB = 'mcp'

const tabTypeMap: Record<string, string[]> = {
  mcp: ['mcp-server'],
  hooks: ['hook'],
  plugins: ['plugin'],
  statusLine: ['statusline'],
  permissions: ['permission'],
  env: ['env']
}

function normalizeCapabilityTab(value: string | undefined): string {
  return value && tabTypeMap[value] ? value : DEFAULT_CAPABILITY_TAB
}

/* ---------- MCP Server card ---------- */
function McpServerCard({ asset, focused = false }: { asset: Asset; focused?: boolean }): React.ReactElement {
  const { t } = useTranslation()
  const cardRef = useRef<HTMLDivElement>(null)
  const origin = pluginOriginOf(asset)

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

  // Jumped-to from the plugin page: scroll into view (base handles expand).
  const handleReveal = useCallback(() => {
    cardRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [])

  return (
    <ExpandableAssetCard
      asset={asset}
      cardId={`mcp-card-${asset.id}`}
      cardRef={cardRef}
      detailId={`mcp-detail-${asset.id}`}
      icon={<Circle className={cn('h-2.5 w-2.5 shrink-0 fill-current', statusColor)} />}
      title={asset.name}
      subtitle={
        overriddenBy ? (
          <p className="mt-0.5 text-xs text-amber-500">{t('capabilities.mcp.overriddenBy', { scope: overriddenBy })}</p>
        ) : undefined
      }
      headerMeta={
        <span className={cn('shrink-0 text-xs', statusColor)}>
          {t(`capabilities.mcp.status.${status}`)}
        </span>
      }
      origin={origin}
      focused={focused}
      onReveal={handleReveal}
    >
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
    </ExpandableAssetCard>
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

  // 为 0 的统计项隐藏 (与状态栏摘要一致的口径)
  const cards = [
    { key: 'userScope', value: byScope.user },
    { key: 'projectScope', value: byScope.project },
    { key: 'enterpriseScope', value: byScope.enterprise },
    { key: 'mergeConflicts', value: byScope.conflicts, alertClass: 'text-amber-500' }
  ].filter(({ value }) => value > 0)

  return (
    <div className="rounded-lg border border-border bg-card p-4 mb-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('capabilities.mcp.byScope')}</h3>
      <div className="grid grid-cols-4 gap-3">
        {cards.map(({ key, value, alertClass }) => (
          <div key={key}>
            <p className={cn('text-lg font-bold', alertClass && value > 0 ? alertClass : 'text-foreground')}>{value}</p>
            <p className="text-xs text-muted-foreground">{t(`capabilities.mcp.${key}`)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Plugin card (plugin → bundled components) ---------- */
const PLUGIN_COMPONENT_TYPES = ['skill', 'agent', 'command', 'hook', 'mcp-server'] as const

function pluginComponentLabel(t: (key: string) => string, type: string): string {
  switch (type) {
    case 'skill':
      return t('instructions.tabs.skills')
    case 'agent':
      return t('instructions.tabs.subagents')
    case 'command':
      return t('instructions.tabs.commands')
    case 'hook':
      return t('capabilities.tabs.hooks')
    case 'mcp-server':
      return t('capabilities.tabs.mcp')
    default:
      return type
  }
}

function PluginCard({
  plugin,
  components,
  focused = false
}: {
  plugin: Asset
  components: Asset[]
  focused?: boolean
}): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set())
  const groups = PLUGIN_COMPONENT_TYPES.map((type) => ({
    type,
    items: components.filter((component) => component.type === type)
  })).filter((group) => group.items.length > 0)

  const enabled = plugin.meta.enabled !== false
  const marketplace = typeof plugin.meta.marketplace === 'string' ? plugin.meta.marketplace : undefined
  const rawVersion = typeof plugin.meta.version === 'string' ? plugin.meta.version : undefined
  // 版本目录名兜底值为 'unknown' 时不渲染 "vunknown" 徽标 (见 issues/2026-07-10 插件多版本缓存)
  const version = rawVersion === 'unknown' ? undefined : rawVersion

  // When jumped-to from a component page: scroll into view + expand all groups.
  useEffect(() => {
    if (!focused) return
    cardRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setOpenKeys(new Set(PLUGIN_COMPONENT_TYPES))
  }, [focused])

  return (
    <div
      ref={cardRef}
      id={`plugin-card-${plugin.id}`}
      className={cn('rounded-lg border bg-card', focused ? FOCUS_HIGHLIGHT_CLASS : 'border-border')}
      data-plugin-card
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Puzzle className="h-4 w-4 shrink-0 text-purple-500" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{plugin.name}</span>
            {marketplace && <Chip tone="neutral" size="sm" variant="flat">{marketplace}</Chip>}
            {version && <span className="text-xs text-muted-foreground">v{version}</span>}
            <Chip tone={enabled ? 'success' : 'neutral'} size="sm" variant="flat">
              {enabled ? t('capabilities.plugins.enabled') : t('capabilities.plugins.disabled')}
            </Chip>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground font-mono">{plugin.path}</p>
        </div>
        <Chip tone="neutral" size="sm" variant="flat" className="shrink-0">
          {t('capabilities.plugins.contains', { count: components.length })}
        </Chip>
        <ViewRawButton asset={plugin} />
      </div>

      {groups.length > 0 ? (
        <div className="border-t border-border px-2 py-1">
          <Accordion
            isCompact
            selectionMode="multiple"
            aria-label={plugin.name}
            selectedKeys={openKeys}
            onSelectionChange={(keys) => setOpenKeys(new Set(keys as Set<string>))}
          >
            {groups.map((group) => (
              <AccordionItem
                key={group.type}
                aria-label={pluginComponentLabel(t, group.type)}
                motionProps={ACCORDION_MOTION_PROPS}
                title={
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {pluginComponentLabel(t, group.type)}
                    <Chip tone="neutral" size="sm" variant="flat">{group.items.length}</Chip>
                  </span>
                }
              >
                <div className="space-y-1 pb-2">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      data-plugin-component
                      data-testid={`plugin-component-${item.id}`}
                      aria-label={t('plugins.jumpToComponent', { name: item.name })}
                      onClick={() => navigate(routeForAsset(item), { state: { focusAssetId: item.id } })}
                      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm outline-none transition-colors hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="truncate text-foreground">{item.name}</span>
                      <span
                        className="ml-auto truncate font-mono text-[11px] text-muted-foreground"
                        title={item.path}
                      >
                        {item.path}
                      </span>
                      <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : (
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          {t('capabilities.plugins.noComponents')}
        </div>
      )}
    </div>
  )
}

/* ---------- StatusLine section ---------- */
function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

const CODEX_DEFAULT_STATUS_LINE_ITEMS = ['model-with-reasoning', 'current-dir']
function formatCodexStatusLineItemLabel(t: ReturnType<typeof useTranslation>['t'], item: string): string {
  return t(`capabilities.statusLine.itemLabels.${item}`, { defaultValue: item })
}

function StatusLineSummary({ viewModels }: { viewModels: StatusLineViewModel[] }): React.ReactElement {
  const { t } = useTranslation()
  const assets = viewModels.map((viewModel) => viewModel.asset)
  const claudeCount = assets.filter((asset) => asset.agentId === 'claude-code').length
  const effectiveCount = viewModels.filter((viewModel) => viewModel.effective).length
  const warningCount = viewModels.filter((viewModel) => getWorstDiagnosticLevel(viewModel.diagnostics) === 'warning').length
  const blockedCount = viewModels.filter((viewModel) => getWorstDiagnosticLevel(viewModel.diagnostics) === 'blocked').length
  const codexItemCount = assets.reduce((total, asset) => total + asStringArray(asset.meta.items).length, 0)
  const cards = [
    { key: 'total', value: assets.length },
    { key: 'effective', value: effectiveCount },
    { key: 'claude', value: claudeCount },
    { key: 'codexItems', value: codexItemCount },
    { key: 'warnings', value: warningCount, alertClass: 'text-amber-500' },
    { key: 'blocked', value: blockedCount, alertClass: 'text-destructive' }
  ].filter(({ value }) => value > 0)

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {cards.map(({ key, value, alertClass }) => (
          <div key={key}>
            <p className={cn('text-lg font-bold', alertClass && value > 0 ? alertClass : 'text-foreground')}>{value}</p>
            <p className="text-xs text-muted-foreground">{t(`capabilities.statusLine.summary.${key}`)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProviderBadge({ agentId }: { agentId: string }): React.ReactElement {
  const label = agentId === 'codex' ? 'Codex' : 'Claude Code'
  const className = agentId === 'codex'
    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
    : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'

  return (
    <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium', className)}>
      {label}
    </span>
  )
}

function StatusLineDiagnosticList({ diagnostics }: { diagnostics: StatusLineDiagnostic[] }): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="space-y-1">
      {diagnostics.map((diagnostic) => {
        const level = diagnostic.level
        const Icon = level === 'ok' ? Check : level === 'warning' ? AlertTriangle : XIcon
        const color = level === 'ok'
          ? 'text-green-600 dark:text-green-400'
          : level === 'warning'
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-destructive'

        return (
          <p key={`${diagnostic.level}-${diagnostic.key}`} className={cn('flex items-start gap-1.5 text-xs leading-5', color)}>
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t(`capabilities.statusLine.diagnostics.${diagnostic.key}`, diagnostic.values)}</span>
          </p>
        )
      })}
    </div>
  )
}

function CodexDefaultStatusLine(): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3">
      <p className="text-sm font-medium text-foreground">{t('capabilities.statusLine.defaultCodex.title')}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('capabilities.statusLine.defaultCodex.body')}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {CODEX_DEFAULT_STATUS_LINE_ITEMS.map((item) => (
          <span key={item} title={item} className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground">
            {formatCodexStatusLineItemLabel(t, item)}
          </span>
        ))}
      </div>
    </div>
  )
}

function StatusLineCard({ viewModel }: { viewModel: StatusLineViewModel }): React.ReactElement {
  const { t } = useTranslation()
  const { asset, commandView, diagnostics, effective, overriddenBy } = viewModel
  const provider = (asset.meta.provider as string | undefined) ?? asset.agentId
  const isCodex = provider === 'codex'
  const entryPaths = asStringArray(asset.meta.entryPaths)
  const items = asStringArray(asset.meta.items)
  const unknownItems = asStringArray(asset.meta.unknownItems)
  const command = (asset.meta.command as string | undefined) ?? ''
  // 命令原文里已出现的脚本路径不再单列, 避免「命令」与「引用脚本」重复展示同一路径
  const extraEntryPaths = entryPaths.filter((entryPath) => !command.includes(entryPath))
  const settingKey = (asset.meta.settingKey as string | undefined) ?? ''
  const hidden = asset.meta.hidden === true
  const statusLevel = getWorstDiagnosticLevel(diagnostics)

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{asset.name}</span>
            <ProviderBadge agentId={asset.agentId} />
            <ScopeBadge scope={asset.scope} />
            <span className={cn(
              'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
              effective ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'
            )}>
              {effective ? t('capabilities.statusLine.effective') : t('capabilities.statusLine.overridden')}
            </span>
            {statusLevel !== 'ok' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                {t(`capabilities.statusLine.health.${statusLevel}`)}
              </span>
            )}
          </div>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{asset.path}</p>
        </div>
        <ViewRawButton asset={asset} className="shrink-0" />
      </div>

      <div className="mt-3 space-y-2">
        {settingKey && <DetailRow label={t('capabilities.statusLine.setting')} value={settingKey} mono />}

        {isCodex ? (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{t('capabilities.statusLine.footerItems')}</p>
            {hidden ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {t('capabilities.statusLine.hidden')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <span
                    key={item}
                    title={item}
                    className={cn(
                      'rounded-md border px-2 py-1 text-xs font-medium',
                      unknownItems.includes(item)
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-border bg-muted/40 text-foreground'
                    )}
                  >
                    {formatCodexStatusLineItemLabel(t, item)}
                  </span>
                ))}
              </div>
            )}
            {unknownItems.length > 0 && (
              <p className="mt-2 text-xs leading-5 text-amber-600 dark:text-amber-400">
                {t('capabilities.statusLine.unknownItems', { count: unknownItems.length })}
              </p>
            )}
            <DetailRow
              label={t('capabilities.statusLine.themeColors')}
              value={asset.meta.useThemeColors === false ? t('common.no') : t('common.yes')}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {command && <DetailRow label={t('capabilities.statusLine.command')} value={commandView.value} mono />}
            {commandView.redacted && (
              <p className="text-xs leading-5 text-amber-600 dark:text-amber-400">
                {t('capabilities.statusLine.redactedCommand')}
              </p>
            )}
            {asset.meta.refreshInterval != null && (
              <DetailRow label={t('capabilities.statusLine.refreshInterval')} value={`${asset.meta.refreshInterval}s`} />
            )}
            {asset.meta.padding != null && (
              <DetailRow label={t('capabilities.statusLine.padding')} value={String(asset.meta.padding)} />
            )}
            {asset.meta.hideVimModeIndicator != null && (
              <DetailRow
                label={t('capabilities.statusLine.hideVimModeIndicator')}
                value={asset.meta.hideVimModeIndicator ? t('common.yes') : t('common.no')}
              />
            )}
            {extraEntryPaths.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{t('capabilities.statusLine.entryPaths')}</p>
                <div className="space-y-1">
                  {extraEntryPaths.map((entryPath) => (
                    <p key={entryPath} className="break-all font-mono text-xs text-foreground">{entryPath}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <StatusLineDiagnosticList diagnostics={diagnostics} />
        {overriddenBy && (
          <p className="text-xs leading-5 text-muted-foreground">
            {t('capabilities.statusLine.overriddenBy', { scope: overriddenBy.scope })}
          </p>
        )}
      </div>
    </div>
  )
}

export function StatusLineSection({ assets, agentView }: { assets: Asset[]; agentView: AgentView }): React.ReactElement {
  const { t } = useTranslation()
  const viewModels = useMemo(() => buildStatusLineViewModels(assets), [assets])
  const hasCodexAsset = assets.some((asset) => asset.agentId === 'codex')
  // statusLine 是 claude-code/codex 特有概念; 任意其它 agent 归一到 'all' 显示口径 (空态文案/默认预览)
  const displayView = agentView === 'claude' || agentView === 'codex' ? agentView : 'all'
  const showCodexDefault = displayView !== 'claude' && !hasCodexAsset

  return (
    <div className="flex flex-1 flex-col gap-3">
      {assets.length === 0 ? (
        <>
          <EmptyState fullHeight icon={Activity} message={t(`capabilities.statusLine.empty.${displayView}`)} />
          {showCodexDefault && <CodexDefaultStatusLine />}
        </>
      ) : (
        <>
          <StatusLineSummary viewModels={viewModels} />
          {showCodexDefault && <CodexDefaultStatusLine />}
          <div className="space-y-2">
            {viewModels.map((viewModel) => <StatusLineCard key={viewModel.asset.id} viewModel={viewModel} />)}
          </div>
        </>
      )}
    </div>
  )
}

/* ---------- Permissions section ---------- */
function PermissionRuleList({
  title,
  rows,
  kind
}: {
  title: string
  rows: PermissionRuleRow[]
  kind: PermissionRuleKind
}): React.ReactElement {
  const { t } = useTranslation()
  const color = kind === 'allow'
    ? 'text-green-500'
    : kind === 'deny'
      ? 'text-destructive'
      : 'text-amber-500'
  const Icon = kind === 'allow' ? Check : kind === 'deny' ? XIcon : Shield

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className={cn('h-3.5 w-3.5', color)} />
          {title}
          <span className="text-xs text-muted-foreground">({rows.length})</span>
        </h3>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">{t('common.empty')}</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2 px-4 py-2">
              <span className="min-w-0 truncate text-xs font-mono text-foreground">{row.rule}</span>
              <ScopeBadge scope={row.scope} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PermissionEffectiveSummary({ rows }: { rows: PermissionRuleRow[] }): React.ReactElement {
  const { t } = useTranslation()
  const summary = summarizePermissionRules(rows)
  // 为 0 的统计项隐藏 (下方规则列表仍完整展示各类为空的事实)
  const items = [
    { key: 'allow', value: summary.allow },
    { key: 'ask', value: summary.ask },
    { key: 'deny', value: summary.deny },
    { key: 'broadAllow', value: summary.broadAllow },
    { key: 'bypass', value: summary.bypass }
  ].filter((item) => item.value > 0)

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">{t('capabilities.permissions.effective.title')}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('capabilities.permissions.effective.sources', { count: summary.sourceCount })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item.key}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
                item.key === 'broadAllow' && item.value > 0
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'border-border bg-muted/40 text-muted-foreground'
              )}
            >
              <span className="font-semibold text-foreground">{item.value}</span>
              {t(`capabilities.permissions.effective.${item.key}`)}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {Object.entries(summary.scopeCounts).map(([scopeName, count]) => (
          <span key={scopeName} className="rounded-md bg-muted/40 px-2 py-1">
            {t(`common.scope.${scopeName}`)}: {count}
          </span>
        ))}
      </div>
    </div>
  )
}

function PermissionsSection({ assets }: { assets: Asset[] }): React.ReactElement {
  const { t } = useTranslation()

  const rows = normalizePermissionRules(assets)
  const bypassRow = rows.find((row) => row.kind === 'bypass')
  const broadAllowRows = rows.filter((row) => row.risk === 'broad')
  const allowRows = rows.filter((row) => row.kind === 'allow')
  const askRows = rows.filter((row) => row.kind === 'ask')
  const denyRows = rows.filter((row) => row.kind === 'deny')

  return (
    <div className="space-y-3">
      <PermissionEffectiveSummary rows={rows} />

      {bypassRow && (
        <WarningBanner
          title={t('capabilities.permissions.warning')}
          message={t('capabilities.permissions.bypassEnabled', { scope: bypassRow.scope })}
        />
      )}
      {broadAllowRows.length > 0 && (
        <WarningBanner
          title={t('capabilities.permissions.broadAllowWarning.title')}
          message={t('capabilities.permissions.broadAllowWarning.message', { count: broadAllowRows.length })}
        />
      )}

      <PermissionRuleList title={t('capabilities.permissions.allowList')} rows={allowRows} kind="allow" />
      <PermissionRuleList title={t('capabilities.permissions.askList')} rows={askRows} kind="ask" />
      <PermissionRuleList title={t('capabilities.permissions.denyList')} rows={denyRows} kind="deny" />
    </div>
  )
}

/* ---------- Env section ---------- */
function EnvGroup({ section }: { section: EnvVarGroupSection }): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-foreground">{t(`capabilities.env.groups.${section.group}.title`)}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{t(`capabilities.env.groups.${section.group}.body`)}</p>
          </div>
          <span className="rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground">{section.rows.length}</span>
        </div>
      </div>
      <div className="divide-y divide-border/50">
        {section.rows.map((row) => (
          <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="min-w-0 shrink-0 text-sm font-mono font-medium text-foreground">{row.name}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-mono text-muted-foreground">
              {row.value}
            </span>
            <ScopeBadge scope={row.scope} />
          </div>
        ))}
      </div>
    </div>
  )
}

function EnvSection({ assets }: { assets: Asset[] }): React.ReactElement {
  const { t } = useTranslation()
  const rows = normalizeEnvVars(assets)
  const sections = groupEnvVars(rows)

  if (rows.length === 0) {
    return <EmptyState fullHeight icon={Variable} title={t('capabilities.empty.env.title')} description={t('capabilities.empty.env.body')} />
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => <EnvGroup key={section.group} section={section} />)}
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

function CapabilityPageChrome({
  activeTab,
  evidence,
  guide,
  scope,
  search,
  setScope,
  setSearch,
  showSearch
}: {
  activeTab: string
  evidence: FeatureGuideEvidence[]
  guide?: FeatureGuideDefinition
  scope: ScopeFilter
  search: string
  setScope: (scope: ScopeFilter) => void
  setSearch: (value: string) => void
  showSearch: boolean
}): null {
  const { t } = useTranslation()
  const actions = useMemo<React.ReactNode>(() => (
    showSearch ? <ScopeSelect value={scope} onChange={setScope} className="w-36" /> : null
  ), [scope, setScope, showSearch])
  const title = t(`capabilities.tabs.${activeTab}`)
  const pageChrome = useMemo<PageChromeConfig>(() => ({
    title,
    sectionLabelKey: 'nav.sections.capabilities',
    search: showSearch
      ? {
          value: search,
          onValueChange: setSearch,
          placeholder: t('search.filterPlaceholder', { target: title }),
          ariaLabel: t('search.filterPlaceholder', { target: title })
        }
      : undefined,
    guide: guide
      ? {
          definition: guide,
          evidence
        }
      : undefined,
    actions
  }), [actions, evidence, guide, search, setSearch, showSearch, t, title])
  usePageChrome(pageChrome, [pageChrome])

  return null
}

/* ---------- Main page ---------- */
export function Capabilities({ activeSection }: { activeSection?: string } = {}): React.ReactElement {
  const { t } = useTranslation()
  const assets = useAppStore((s) => s.assets)
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const scanning = useAppStore((s) => s.assetRuntimeStatus.state === 'scanning')
  const runtimeState = useAppStore((s) => s.assetRuntimeStatus.state)
  const agentView = useAppStore((s) => s.agentView)
  const { plugins } = useAgentCapabilityPlugins()
  const { isFocused } = useFocusTarget()
  const activeTab = normalizeCapabilityTab(activeSection)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<ScopeFilter>('all')
  const visibleAssets = useMemo(
    () => filterAssetsByAppScope(assets, scopeSelection),
    [assets, scopeSelection]
  )

  // Filter assets for active tab
  const filteredAssets = useMemo(() => {
    const types = tabTypeMap[activeTab] ?? []
    return visibleAssets.filter((a) => {
      if (!types.includes(a.type)) return false
      if (!matchesAgentView(a.agentId, agentView)) return false
      if (scope !== 'all' && a.scope !== scope) return false
      if (search) {
        const q = search.toLowerCase()
        const name = a.name.toLowerCase()
        const desc = ((a.meta.description as string) ?? '').toLowerCase()
        if (!name.includes(q) && !desc.includes(q)) return false
      }
      return true
    })
  }, [visibleAssets, activeTab, search, scope, agentView])

  const showFilter = activeTab !== 'permissions'
  const activeGuide = capabilityGuideMap[activeTab as CapabilityGuideId]
  const activeEvidence = useMemo(() => {
    const riskCount = activeTab === 'permissions'
      ? normalizePermissionRules(filteredAssets).filter((row) => row.risk !== 'none').length
      : activeTab === 'env'
        ? normalizeEnvVars(filteredAssets).filter((row) => row.sensitive).length
        : 0

    return buildFeatureGuideEvidence(filteredAssets, riskCount)
  }, [activeTab, filteredAssets])

  const renderContent = (): React.ReactElement => {
    // A full scan is still in flight and this tab's category hasn't been reached yet
    // — show a skeleton, not a misleading "nothing here" (the snapshot is partial,
    // not complete-and-empty). (GH-113 不误导虚假完整)
    if (filteredAssets.length === 0 && shouldShowScanningState(scanning, runtimeState, assets.length)) {
      return <LoadingState title={t('nav.scanStatus.scanning')} icon={tabIconMap[activeTab] ?? Plug} />
    }
    switch (activeTab) {
      case 'mcp':
        if (filteredAssets.length === 0) {
          return <EmptyState fullHeight icon={Plug} title={t('capabilities.empty.mcp.title')} description={t('capabilities.empty.mcp.body')} />
        }
        return (
          <div className="space-y-3">
            <McpSummary assets={filteredAssets} />
            <div className="space-y-2">
              {filteredAssets.map((a) => <McpServerCard key={a.id} asset={a} focused={isFocused(a.id)} />)}
            </div>
          </div>
        )

      case 'hooks': {
        return <HooksLifecycleView assets={filteredAssets} agentView={agentView} search={search} scope={scope} plugins={plugins} />
      }

      case 'plugins': {
        if (filteredAssets.length === 0) {
          return <EmptyState fullHeight icon={Puzzle} title={t('capabilities.empty.plugins.title')} description={t('capabilities.empty.plugins.body')} />
        }
        // Group bundled components (skills/agents/commands/hooks/mcp) under their plugin.
        const componentsByPlugin = new Map<string, Asset[]>()
        for (const candidate of visibleAssets) {
          const pluginId = typeof candidate.meta.pluginId === 'string' ? candidate.meta.pluginId : undefined
          if (!pluginId) continue
          const existing = componentsByPlugin.get(pluginId)
          if (existing) existing.push(candidate)
          else componentsByPlugin.set(pluginId, [candidate])
        }
        return (
          <div className="space-y-2">
            {filteredAssets.map((a) => (
              <PluginCard
                key={a.id}
                plugin={a}
                components={componentsByPlugin.get(a.id) ?? []}
                focused={isFocused(a.id)}
              />
            ))}
          </div>
        )
      }

      case 'statusLine':
        return <StatusLineSection assets={filteredAssets} agentView={agentView} />

      case 'permissions':
        return <PermissionsSection assets={filteredAssets} />

      case 'env':
        return <EnvSection assets={filteredAssets} />

      default: {
        const Icon = tabIconMap[activeTab] ?? Plug
        return <EmptyState fullHeight icon={Icon} message={t('common.empty')} />
      }
    }
  }

  return (
    <div className={cn('flex flex-col gap-4', PAGE_EMPTY_FILL)}>
      <CapabilityPageChrome
        activeTab={activeTab}
        evidence={activeEvidence}
        guide={activeGuide}
        search={search}
        scope={scope}
        setSearch={setSearch}
        setScope={setScope}
        showSearch={showFilter}
      />

      {renderContent()}
    </div>
  )
}
