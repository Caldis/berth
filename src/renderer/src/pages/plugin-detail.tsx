import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Database,
  Download,
  ExternalLink,
  FileText,
  Home,
  Puzzle,
  ShieldCheck
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState, PAGE_EMPTY_FILL } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { usePageChrome, type PageChromeConfig } from '@/components/layout/page-chrome'
import { useAgentCapabilityPlugins } from '@/hooks/use-ipc'
import { Chip } from '@/components/ui'
import { cn } from '@/lib/utils'
import type {
  AgentCapabilityPlugin,
  AgentCapabilityPluginAssetDescriptor,
  AgentCapabilityPluginPermission,
  AgentCapabilityPluginReference,
  AgentCapabilityPluginSourceDescriptor
} from '@shared/types/agent-plugin'

function safeDecodePluginId(value: string | undefined): string {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function openExternal(url: string): void {
  void window.api?.shell.openExternal(url)
}

function referenceIcon(label: string): React.ComponentType<{ className?: string }> {
  if (label.toLowerCase() === 'download') return Download
  if (label.toLowerCase() === 'homepage') return Home
  return ExternalLink
}

function formatLimit(source: AgentCapabilityPluginSourceDescriptor): string | null {
  const parts: string[] = []
  if (source.maxRows !== undefined) parts.push(`${source.maxRows} rows`)
  if (source.maxBytes !== undefined) parts.push(`${source.maxBytes} bytes`)
  return parts.length > 0 ? parts.join(' / ') : null
}

function PluginReferenceButtons({
  plugin,
  references
}: {
  plugin: AgentCapabilityPlugin
  references: AgentCapabilityPluginReference[]
}): React.ReactElement {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-2">
      {references.map((reference) => {
        const Icon = referenceIcon(reference.label)
        return (
          <button
            key={`${plugin.id}-${reference.url}`}
            type="button"
            onClick={() => openExternal(reference.url)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium transition-colors',
              'hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {t(`capabilities.pluginDetail.references.${reference.label.toLowerCase()}`, {
              defaultValue: reference.label
            })}
          </button>
        )
      })}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string | number }): React.ReactElement {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function SourceRow({ source }: { source: AgentCapabilityPluginSourceDescriptor }): React.ReactElement {
  const { t } = useTranslation()
  const limit = formatLimit(source)

  return (
    <div className="space-y-2 border-b border-border/70 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone="neutral" size="sm" variant="flat">{t(`common.scope.${source.scope}`)}</Chip>
        <Chip tone="neutral" size="sm" variant="flat">{source.kind}</Chip>
        {source.sensitivity && (
          <Chip tone={source.sensitivity === 'normal' ? 'neutral' : 'warning'} size="sm" variant="flat">
            {t(`capabilities.pluginDetail.sensitivity.${source.sensitivity}`)}
          </Chip>
        )}
        {source.stability && (
          <Chip tone="neutral" size="sm" variant="flat">
            {t(`capabilities.pluginDetail.stability.${source.stability}`)}
          </Chip>
        )}
      </div>
      <p className="break-all font-mono text-xs text-foreground">{source.pathPattern}</p>
      <div className="flex flex-wrap gap-1.5">
        {source.categories.map((category) => (
          <span key={`${source.code}-${category}`} className="rounded-md bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
            {t(`common.category.${category}`)}
          </span>
        ))}
        {limit && (
          <span className="rounded-md bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
            {t('capabilities.pluginDetail.limit', { limit })}
          </span>
        )}
        {source.defaultHidden && (
          <span className="rounded-md bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
            {t('capabilities.pluginDetail.defaultHidden')}
          </span>
        )}
      </div>
      {source.evidenceUrls && source.evidenceUrls.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {source.evidenceUrls.map((url) => (
            <button
              key={`${source.code}-${url}`}
              type="button"
              onClick={() => openExternal(url)}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/10 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              {t('capabilities.pluginDetail.evidence')}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SourceSection({ sources }: { sources: AgentCapabilityPluginSourceDescriptor[] }): React.ReactElement {
  const { t } = useTranslation()
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Database className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-medium text-foreground">{t('capabilities.pluginDetail.scanSources')}</h2>
      </div>
      <div className="px-4">
        {sources.map((source) => <SourceRow key={source.code} source={source} />)}
      </div>
    </section>
  )
}

function AssetSection({ assets }: { assets: AgentCapabilityPluginAssetDescriptor[] }): React.ReactElement {
  const { t } = useTranslation()
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-medium text-foreground">{t('capabilities.pluginDetail.assetTypes')}</h2>
      </div>
      <div className="divide-y divide-border/70 px-4">
        {assets.map((asset) => (
          <div key={`${asset.type}-${asset.category}`} className="flex flex-wrap items-center gap-2 py-3">
            <span className="text-sm font-medium text-foreground">{asset.type}</span>
            <Chip tone="neutral" size="sm" variant="flat">{t(`common.category.${asset.category}`)}</Chip>
            {asset.scopes.map((scope) => (
              <Chip key={`${asset.type}-${scope}`} tone="neutral" size="sm" variant="flat">
                {t(`common.scope.${scope}`)}
              </Chip>
            ))}
            {asset.sensitive && (
              <Chip tone="warning" size="sm" variant="flat">
                {t('capabilities.pluginDetail.sensitiveAsset')}
              </Chip>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function PermissionSection({ permissions }: { permissions: AgentCapabilityPluginPermission[] }): React.ReactElement {
  const { t } = useTranslation()
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-medium text-foreground">{t('capabilities.pluginDetail.permissions')}</h2>
      </div>
      <div className="divide-y divide-border/70 px-4">
        {permissions.map((permission, index) => (
          <div key={`${permission.kind}-${index}`} className="space-y-2 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip tone={permission.kind === 'read' ? 'neutral' : 'warning'} size="sm" variant="flat">
                {permission.kind}
              </Chip>
              {permission.scopes.map((scope) => (
                <Chip key={`${permission.kind}-${scope}`} tone="neutral" size="sm" variant="flat">
                  {t(`common.scope.${scope}`)}
                </Chip>
              ))}
            </div>
            <div className="space-y-1">
              {permission.pathPatterns.map((pattern) => (
                <p key={`${permission.kind}-${pattern}`} className="break-all rounded-md bg-muted/35 px-2 py-1 font-mono text-xs text-muted-foreground">
                  {pattern}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function PluginDetail(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pluginId } = useParams()
  const decodedPluginId = safeDecodePluginId(pluginId)
  const { plugins, loading, error } = useAgentCapabilityPlugins()
  const plugin = plugins.find((candidate) => candidate.id === decodedPluginId)
  const title = plugin?.displayName ?? t('capabilities.pluginDetail.title')
  const references = plugin?.references ?? []

  const actions = useMemo(() => (
    <button
      type="button"
      onClick={() => navigate('/capabilities/plugins')}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      {t('capabilities.pluginDetail.backToPlugins')}
    </button>
  ), [navigate, t])

  const pageChrome = useMemo<PageChromeConfig>(() => ({
    title,
    sectionLabelKey: 'nav.sections.capabilities',
    parentLabel: t('capabilities.tabs.plugins'),
    actions
  }), [actions, t, title])
  usePageChrome(pageChrome, [pageChrome])

  if (loading && !plugin) {
    return <LoadingState title={t('capabilities.pluginDetail.loading')} icon={Puzzle} />
  }

  if (!plugin) {
    return (
      <div className={PAGE_EMPTY_FILL}>
        <EmptyState
          fullHeight
          icon={Puzzle}
          message={error ?? t('capabilities.pluginDetail.notFound')}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Puzzle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h1 className="text-base font-semibold text-foreground">{plugin.displayName}</h1>
              <Chip tone={plugin.enabled ? 'success' : 'neutral'} size="sm" variant="flat">
                {plugin.enabled ? t('capabilities.plugins.enabled') : t('capabilities.plugins.disabled')}
              </Chip>
              <Chip tone={plugin.detected ? 'success' : 'neutral'} size="sm" variant="flat">
                {plugin.detected ? t('settings.agentPluginDetected') : t('settings.agentPluginNotDetected')}
              </Chip>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('capabilities.pluginDetail.summary', {
                agent: plugin.agentCompatibility.name
              })}
            </p>
          </div>
          {references.length > 0 && <PluginReferenceButtons plugin={plugin} references={references} />}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label={t('capabilities.pluginDetail.version')} value={`v${plugin.version}`} />
        <SummaryCard label={t('capabilities.pluginDetail.target')} value={plugin.agentCompatibility.name} />
        <SummaryCard label={t('capabilities.pluginDetail.sources')} value={plugin.sourceDescriptors.length} />
        <SummaryCard label={t('capabilities.pluginDetail.assets')} value={plugin.assetDescriptors.length} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <SourceSection sources={plugin.sourceDescriptors} />
        <div className="space-y-4">
          <AssetSection assets={plugin.assetDescriptors} />
          <PermissionSection permissions={plugin.permissions} />
        </div>
      </div>
    </div>
  )
}
