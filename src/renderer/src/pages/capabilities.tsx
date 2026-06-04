import { useMemo, useState } from 'react'
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
  Check,
  X as XIcon,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { filterAssetsByAgentView } from '@/lib/agent-view'
import { useAppStore } from '@/stores/app'
import { useAgentCapabilityPlugins } from '@/hooks/use-ipc'
import { ScopeSelect, type ScopeFilter } from '@/components/shared/filter-bar'
import { EmptyState, PAGE_EMPTY_FILL } from '@/components/shared/empty-state'
import { DetailRow } from '@/components/shared/detail-row'
import { WarningBanner } from '@/components/shared/warning-banner'
import { ScopeBadge } from '@/components/shared/scope-badge'
import { ViewRawButton } from '@/components/shared/view-raw-button'
import { HooksLifecycleView } from '@/components/capabilities/hooks-lifecycle-view'
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
import type { AgentView, Asset, AssetScope } from '@shared/types/asset'
import { filterAssetsByAppScope } from '@shared/scope'
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
function McpServerCard({ asset }: { asset: Asset }): React.ReactElement {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

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
            <ViewRawButton asset={asset} />
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

  const skillCount = (asset.meta.skillCount as number) ?? 0
  const commandCount = (asset.meta.commandCount as number) ?? 0
  const agentCount = (asset.meta.agentCount as number) ?? 0
  const containsTotal = skillCount + commandCount + agentCount

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
            <ViewRawButton asset={asset} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- StatusLine section ---------- */
function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

type StatusLineDiagnosticLevel = 'ok' | 'warning' | 'blocked'

interface StatusLineDiagnostic {
  level: StatusLineDiagnosticLevel
  key: string
  values?: Record<string, unknown>
}

interface StatusLineViewModel {
  asset: Asset
  effective: boolean
  overriddenBy?: Asset
  diagnostics: StatusLineDiagnostic[]
  commandView: {
    value: string
    redacted: boolean
  }
}

const CODEX_DEFAULT_STATUS_LINE_ITEMS = ['model-with-reasoning', 'current-dir']
const SCOPE_RANK: Record<AssetScope, number> = {
  enterprise: 4,
  project: 3,
  user: 2,
  session: 1
}

function formatCodexStatusLineItemLabel(t: ReturnType<typeof useTranslation>['t'], item: string): string {
  return t(`capabilities.statusLine.itemLabels.${item}`, { defaultValue: item })
}

function getStatusLineGroupKey(asset: Asset): string {
  const provider = (asset.meta.provider as string | undefined) ?? asset.agentId
  if (provider === 'codex') return 'codex:footer-items'
  return `${provider}:${String(asset.meta.statusLineKind ?? asset.meta.settingKey ?? asset.name)}`
}

function rankStatusLineAsset(asset: Asset): number {
  return SCOPE_RANK[asset.scope] ?? 0
}

function buildStatusLineViewModels(assets: Asset[]): StatusLineViewModel[] {
  const bestByGroup = new Map<string, Asset>()

  assets.forEach((asset) => {
    const key = getStatusLineGroupKey(asset)
    const current = bestByGroup.get(key)
    if (!current || rankStatusLineAsset(asset) > rankStatusLineAsset(current)) {
      bestByGroup.set(key, asset)
    }
  })

  return assets.map((asset) => {
    const effective = bestByGroup.get(getStatusLineGroupKey(asset))?.id === asset.id
    const overriddenBy = effective ? undefined : bestByGroup.get(getStatusLineGroupKey(asset))
    const command = (asset.meta.command as string | undefined) ?? ''
    const commandView = redactStatusLineCommand(command)
    return {
      asset,
      effective,
      overriddenBy,
      commandView,
      diagnostics: getStatusLineDiagnostics(asset, effective, overriddenBy)
    }
  })
}

function redactStatusLineCommand(command: string): { value: string; redacted: boolean } {
  const patterns: Array<[RegExp, string]> = [
    [
      /\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|APIKEY|AUTHORIZATION|BEARER)[A-Z0-9_]*\s*=\s*)(?:"[^"]*"|'[^']*'|[^\s]+)/gi,
      '$1[redacted]'
    ],
    [
      /(\s--(?:token|api-key|apikey|password|secret|authorization)\s+)(?:"[^"]*"|'[^']*'|[^\s]+)/gi,
      '$1[redacted]'
    ],
    [/\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[redacted]']
  ]
  const value = patterns.reduce((next, [pattern, replacement]) => next.replace(pattern, replacement), command)
  return { value, redacted: value !== command }
}

function commandLooksLikeScriptReference(command: string): boolean {
  return /(?:^|\s)(?:~[\\/]|\.{0,2}[\\/]|[A-Za-z]:\\)[^\s'"]+\.(?:sh|bash|zsh|ps1|py|js|mjs|cjs|bat|cmd)\b/i.test(command) ||
    /\.(?:sh|bash|zsh|ps1|py|js|mjs|cjs|bat|cmd)(?:\s|$)/i.test(command)
}

function getStatusLineDiagnostics(asset: Asset, effective: boolean, overriddenBy?: Asset): StatusLineDiagnostic[] {
  const provider = (asset.meta.provider as string | undefined) ?? asset.agentId
  const command = (asset.meta.command as string | undefined) ?? ''
  const entryPaths = asStringArray(asset.meta.entryPaths)
  const unknownItems = asStringArray(asset.meta.unknownItems)
  const diagnostics: StatusLineDiagnostic[] = []

  if (!effective && overriddenBy) {
    diagnostics.push({
      level: 'warning',
      key: 'overridden',
      values: { scope: overriddenBy.scope }
    })
  }

  if (provider === 'codex') {
    if (asset.meta.hidden === true) diagnostics.push({ level: 'blocked', key: 'hidden' })
    if (unknownItems.length > 0) {
      diagnostics.push({
        level: 'warning',
        key: 'unknownItems',
        values: { count: unknownItems.length }
      })
    }
  } else {
    if (asset.meta.disabledByDisableAllHooks === true) diagnostics.push({ level: 'blocked', key: 'disabled' })
    if (!command.trim()) diagnostics.push({ level: 'warning', key: 'missingCommand' })
    if (command && entryPaths.length === 0 && commandLooksLikeScriptReference(command)) {
      diagnostics.push({ level: 'warning', key: 'unresolvedEntry' })
    }
  }

  return diagnostics.length > 0 ? diagnostics : [{ level: 'ok', key: 'ok' }]
}

function getWorstDiagnosticLevel(diagnostics: StatusLineDiagnostic[]): StatusLineDiagnosticLevel {
  if (diagnostics.some((diagnostic) => diagnostic.level === 'blocked')) return 'blocked'
  if (diagnostics.some((diagnostic) => diagnostic.level === 'warning')) return 'warning'
  return 'ok'
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
    { key: 'warnings', value: warningCount },
    { key: 'blocked', value: blockedCount }
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ key, value }) => (
        <div key={key} className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-lg font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{t(`capabilities.statusLine.summary.${key}`)}</p>
        </div>
      ))}
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
  const settingKey = (asset.meta.settingKey as string | undefined) ?? ''
  const hidden = asset.meta.hidden === true
  const statusLevel = getWorstDiagnosticLevel(diagnostics)

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
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
            {entryPaths.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{t('capabilities.statusLine.entryPaths')}</p>
                <div className="space-y-1">
                  {entryPaths.map((entryPath) => (
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

      <div className="flex gap-2 pt-3">
        <ViewRawButton asset={asset} />
      </div>
    </div>
  )
}

export function StatusLineSection({ assets, agentView }: { assets: Asset[]; agentView: AgentView }): React.ReactElement {
  const { t } = useTranslation()
  const viewModels = useMemo(() => buildStatusLineViewModels(assets), [assets])
  const hasCodexAsset = assets.some((asset) => asset.agentId === 'codex')
  const showCodexDefault = agentView !== 'claude' && !hasCodexAsset

  return (
    <div className="flex flex-1 flex-col gap-3">
      {assets.length === 0 ? (
        <>
          <EmptyState fullHeight icon={Activity} message={t(`capabilities.statusLine.empty.${agentView}`)} />
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
  const items = [
    { key: 'allow', value: summary.allow },
    { key: 'ask', value: summary.ask },
    { key: 'deny', value: summary.deny },
    { key: 'broadAllow', value: summary.broadAllow },
    { key: 'bypass', value: summary.bypass }
  ]

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
    return <EmptyState fullHeight icon={Variable} message={t('common.empty')} />
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
  agentView,
  evidence,
  guide,
  scope,
  search,
  setScope,
  setSearch,
  showSearch
}: {
  activeTab: string
  agentView: AgentView
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
          placeholder: `${t('search.placeholder')} ${title}`,
          ariaLabel: `${t('search.placeholder')} ${title}`
        }
      : undefined,
    guide: guide
      ? {
          definition: guide,
          evidence,
          agentView
        }
      : undefined,
    actions
  }), [actions, agentView, evidence, guide, search, setSearch, showSearch, t, title])
  usePageChrome(pageChrome, [pageChrome])

  return null
}

/* ---------- Main page ---------- */
export function Capabilities({ activeSection }: { activeSection?: string } = {}): React.ReactElement {
  const { t } = useTranslation()
  const assets = useAppStore((s) => s.assets)
  const agentView = useAppStore((s) => s.agentView)
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const { plugins } = useAgentCapabilityPlugins()
  const activeTab = normalizeCapabilityTab(activeSection)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<ScopeFilter>('all')
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
  const activeEvidence = useMemo(() => {
    const riskCount = activeTab === 'permissions'
      ? normalizePermissionRules(filteredAssets).filter((row) => row.risk !== 'none').length
      : activeTab === 'env'
        ? normalizeEnvVars(filteredAssets).filter((row) => row.sensitive).length
        : 0

    return buildFeatureGuideEvidence(filteredAssets, riskCount)
  }, [activeTab, filteredAssets])

  const renderContent = (): React.ReactElement => {
    switch (activeTab) {
      case 'mcp':
        if (filteredAssets.length === 0) return <EmptyState fullHeight icon={Plug} message={t('common.empty')} />
        return (
          <div className="space-y-3">
            <McpSummary assets={filteredAssets} />
            <div className="space-y-2">
              {filteredAssets.map((a) => <McpServerCard key={a.id} asset={a} />)}
            </div>
          </div>
        )

      case 'hooks': {
        return <HooksLifecycleView assets={filteredAssets} agentView={agentView} search={search} scope={scope} plugins={plugins} />
      }

      case 'plugins':
        if (filteredAssets.length === 0) return <EmptyState fullHeight icon={Puzzle} message={t('common.empty')} />
        return (
          <div className="space-y-2">
            {filteredAssets.map((a) => <PluginCard key={a.id} asset={a} />)}
          </div>
        )

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
        agentView={agentView}
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
