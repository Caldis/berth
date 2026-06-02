import { useState, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  Puzzle,
  ShieldCheck
} from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'
import type {
  AgentCapabilityPlugin,
  AgentCapabilityPluginCapability,
  AgentCapabilityPluginManifestEntry,
  AgentCapabilityPluginManifestActivationStatus,
  AgentCapabilityPluginManifestPermission,
  AgentCapabilityPluginPermission,
  AgentCapabilityPluginSource,
  AgentCapabilityPluginSourceCoverage
} from '@shared/types/agent-plugin'
import type { ScanSourceStatus } from '@shared/types/asset'

const SOURCE_STATUS_ORDER: ScanSourceStatus[] = ['scanned', 'missing', 'not-scanned']

interface AgentCapabilityPluginsSectionProps {
  plugins: AgentCapabilityPlugin[]
  manifests: AgentCapabilityPluginManifestEntry[]
  loading: boolean
  error: string | null
}

export function AgentCapabilityPluginsSection({
  plugins,
  manifests,
  loading,
  error
}: AgentCapabilityPluginsSectionProps): ReactElement {
  const { t } = useTranslation()
  const [expandedPlugins, setExpandedPlugins] = useState<Record<string, boolean>>({})
  const [expandedManifests, setExpandedManifests] = useState<Record<string, boolean>>({})

  const togglePlugin = (pluginId: string): void => {
    setExpandedPlugins((current) => ({
      ...current,
      [pluginId]: !current[pluginId]
    }))
  }

  const toggleManifest = (manifestPath: string): void => {
    setExpandedManifests((current) => ({
      ...current,
      [manifestPath]: !current[manifestPath]
    }))
  }

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t('settings.agentPlugins')}
      </h2>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {loading && (
          <div className="p-4 text-sm text-muted-foreground">{t('common.loading')}</div>
        )}
        {!loading && error && (
          <div className="p-4 text-sm text-muted-foreground">
            {t('settings.agentPluginsLoadError', { error })}
          </div>
        )}
        {!loading && !error && plugins.length === 0 && manifests.length === 0 && (
          <div className="p-4">
            <EmptyState
              icon={Puzzle}
              message={t('settings.agentPluginsEmpty')}
              className="border-0 py-8"
            />
          </div>
        )}
        {!loading && !error &&
          plugins.map((plugin, index) => {
            const expanded = expandedPlugins[plugin.id] === true
            return (
              <div key={plugin.id} className={cn(index > 0 && 'border-t border-border')}>
                <button
                  type="button"
                  onClick={() => togglePlugin(plugin.id)}
                  aria-expanded={expanded}
                  className="grid w-full grid-cols-[1fr_auto] items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/5"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    {expanded ? (
                      <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium">{plugin.displayName}</p>
                        <Badge>{t('settings.agentPluginVersion', { version: plugin.version })}</Badge>
                        {plugin.builtin && <Badge>{t('settings.agentPluginBuiltIn')}</Badge>}
                        <Badge tone={plugin.enabled ? 'strong' : 'muted'}>
                          {plugin.enabled
                            ? t('settings.agentPluginEnabled')
                            : t('settings.agentPluginDisabled')}
                        </Badge>
                        <Badge tone={plugin.detected ? 'strong' : 'muted'}>
                          {plugin.detected
                            ? t('settings.agentPluginDetected')
                            : t('settings.agentPluginNotDetected')}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge>
                          {t('settings.agentPluginTarget', {
                            agent: plugin.agentCompatibility.name
                          })}
                        </Badge>
                        <Badge>
                          {t('settings.agentPluginCapabilityCount', {
                            count: plugin.capabilities.length
                          })}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <SourceCoverageSummary coverage={plugin.sourceCoverage} />
                </button>
                {expanded && (
                  <PluginDetails plugin={plugin} />
                )}
              </div>
            )
          })}
        {!loading && !error &&
          manifests.map((manifest, index) => {
            const expanded = expandedManifests[manifest.path] === true
            const title = manifest.displayName ?? manifest.id ?? t('settings.agentPluginManifestUnknown')
            const readinessStatus = manifest.activationReadiness.status
            return (
              <div
                key={manifest.path}
                className={cn((plugins.length > 0 || index > 0) && 'border-t border-border')}
              >
                <button
                  type="button"
                  onClick={() => toggleManifest(manifest.path)}
                  aria-expanded={expanded}
                  className="grid w-full grid-cols-[1fr_auto] items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/5"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    {expanded ? (
                      <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p
                          className={cn(
                            'text-sm font-medium',
                            (readinessStatus === 'invalid' || readinessStatus === 'incompatible') &&
                              'text-muted-foreground'
                          )}
                        >
                          {title}
                        </p>
                        <Badge>{t('settings.agentPluginManifest')}</Badge>
                        <Badge>{t('settings.agentPluginReadOnly')}</Badge>
                        <Badge tone={readinessTone(readinessStatus)}>
                          {t(`settings.agentPluginManifestActivationStatus.${readinessStatus}`)}
                        </Badge>
                        {manifest.version && (
                          <Badge>{t('settings.agentPluginVersion', { version: manifest.version })}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {manifest.agentCompatibility && (
                          <Badge>
                            {t('settings.agentPluginTarget', {
                              agent: manifest.agentCompatibility.name
                            })}
                          </Badge>
                        )}
                        {manifest.agentCompatibility?.versionRange && (
                          <Badge>
                            {t('settings.agentPluginManifestVersionRange', {
                              range: manifest.agentCompatibility.versionRange
                            })}
                          </Badge>
                        )}
                        {manifest.errors.length > 0 && (
                          <Badge tone="muted">
                            {t('settings.agentPluginManifestErrorCount', {
                              count: manifest.errors.length
                            })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <p
                    className="hidden max-w-[16rem] truncate text-right font-mono text-[11px] leading-5 text-muted-foreground sm:block"
                    title={manifest.path}
                  >
                    {manifest.path}
                  </p>
                </button>
                {expanded && (
                  <ManifestDetails manifest={manifest} />
                )}
              </div>
            )
          })}
      </div>
    </section>
  )
}

function PluginDetails({ plugin }: { plugin: AgentCapabilityPlugin }): ReactElement {
  const { t } = useTranslation()

  return (
    <div className="grid gap-0 border-t border-border/70 md:grid-cols-[1.15fr_1fr]">
      <div className="space-y-4 p-4 md:border-r md:border-border/70">
        <DetailBlock
          icon={ShieldCheck}
          title={t('settings.agentPluginPermissionsTitle')}
        >
          <div className="divide-y divide-border/70 border-y border-border/70">
            {plugin.permissions.map((permission) => (
              <PermissionRow key={`${plugin.id}-${permission.kind}`} permission={permission} />
            ))}
          </div>
        </DetailBlock>
        <DetailBlock
          icon={Database}
          title={t('settings.agentPluginSourcesTitle')}
        >
          <SourceCoverageDetails coverage={plugin.sourceCoverage} />
        </DetailBlock>
      </div>
      <div className="space-y-4 border-t border-border/70 p-4 md:border-t-0">
        <DetailBlock
          icon={Puzzle}
          title={t('settings.agentPluginCapabilitiesTitle')}
        >
          <div className="divide-y divide-border/70 border-y border-border/70">
            {plugin.capabilities.map((capability) => (
              <CapabilityRow key={`${plugin.id}-${capability.id}`} capability={capability} />
            ))}
          </div>
        </DetailBlock>
        {plugin.references.length > 0 && (
          <DetailBlock
            icon={ExternalLink}
            title={t('settings.agentPluginReferencesTitle')}
          >
            <div className="flex flex-wrap gap-2">
              {plugin.references.map((reference) => (
                <button
                  key={`${plugin.id}-${reference.url}`}
                  type="button"
                  onClick={() => window.api?.shell.openExternal(reference.url)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3" />
                  {reference.label}
                </button>
              ))}
            </div>
          </DetailBlock>
        )}
      </div>
    </div>
  )
}

function ManifestDetails({
  manifest
}: {
  manifest: AgentCapabilityPluginManifestEntry
}): ReactElement {
  const { t } = useTranslation()

  return (
    <div className="border-t border-border/70 p-4">
      <DetailBlock
        icon={Puzzle}
        title={t('settings.agentPluginManifestDetailsTitle')}
      >
        <div className="space-y-3">
          <ManifestMetaRow label={t('settings.agentPluginManifestPath')}>
            <p
              className="truncate rounded-sm bg-muted/35 px-1.5 py-1 font-mono text-[11px] text-muted-foreground"
              title={manifest.path}
            >
              {manifest.path}
            </p>
          </ManifestMetaRow>
          {manifest.agentCompatibility && (
            <>
              <ManifestMetaRow label={t('settings.agentPluginManifestTarget')}>
                <span>{manifest.agentCompatibility.name}</span>
              </ManifestMetaRow>
              {manifest.agentCompatibility.versionRange && (
                <ManifestMetaRow label={t('settings.agentPluginManifestVersionRangeLabel')}>
                  <span>{manifest.agentCompatibility.versionRange}</span>
                </ManifestMetaRow>
              )}
              <ManifestMetaRow label={t('settings.agentPluginManifestDetectedVersionLabel')}>
                <span>
                  {manifest.agentCompatibility.detectedVersion ??
                    t('settings.agentPluginManifestDetectedVersionUnknown')}
                </span>
              </ManifestMetaRow>
            </>
          )}
          <ManifestReadinessDetails manifest={manifest} />
          {manifest.permissions && manifest.permissions.length > 0 && (
            <ManifestPermissionsDetails permissions={manifest.permissions} />
          )}
          <div>
            <p className="mb-2 text-xs font-medium text-foreground">
              {t('settings.agentPluginManifestErrorsTitle')}
            </p>
            {manifest.errors.length > 0 ? (
              <div className="divide-y divide-border/70 border-y border-border/70">
                {manifest.errors.map((error, index) => (
                  <div key={`${manifest.path}-${error.code}-${index}`} className="py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="muted">{error.code}</Badge>
                      {error.field && <Badge>{error.field}</Badge>}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {error.message}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs leading-5 text-muted-foreground">
                {t('settings.agentPluginManifestNoErrors')}
              </p>
            )}
          </div>
        </div>
      </DetailBlock>
    </div>
  )
}

function ManifestReadinessDetails({
  manifest
}: {
  manifest: AgentCapabilityPluginManifestEntry
}): ReactElement {
  const { t } = useTranslation()
  const readiness = manifest.activationReadiness

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-foreground">
        {t('settings.agentPluginManifestReadinessTitle')}
      </p>
      <div className="rounded-md border border-border/70 bg-muted/20 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={readinessTone(readiness.status)}>
            {t(`settings.agentPluginManifestActivationStatus.${readiness.status}`)}
          </Badge>
          <Badge>{t(`settings.agentPluginManifestActivationReasons.${readiness.reasonCode}`)}</Badge>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {t(`settings.agentPluginManifestActivationReasonDetails.${readiness.reasonCode}`, {
            defaultValue: readiness.message
          })}
        </p>
        {manifest.implementation && (
          <div className="mt-3 space-y-2">
            <ManifestMetaRow label={t('settings.agentPluginManifestImplementationKind')}>
              <Badge>
                {t(`settings.agentPluginManifestImplementationKinds.${manifest.implementation.kind}`)}
              </Badge>
            </ManifestMetaRow>
            <ManifestMetaRow label={t('settings.agentPluginManifestImplementationEntrypoint')}>
              <p
                className="truncate rounded-sm bg-muted/35 px-1.5 py-1 font-mono text-[11px] text-muted-foreground"
                title={manifest.implementation.entrypoint}
              >
                {manifest.implementation.entrypoint}
              </p>
            </ManifestMetaRow>
          </div>
        )}
        {readiness.blockedPermissionKinds && readiness.blockedPermissionKinds.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              {t('settings.agentPluginManifestBlockedPermissions')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {readiness.blockedPermissionKinds.map((kind) => (
                <Badge key={`${manifest.path}-${kind}`} tone="muted">
                  {t(`settings.agentPluginPermissionKinds.${kind}`)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ManifestPermissionsDetails({
  permissions
}: {
  permissions: AgentCapabilityPluginManifestPermission[]
}): ReactElement {
  const { t } = useTranslation()

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-foreground">
        {t('settings.agentPluginManifestPermissionsTitle')}
      </p>
      <div className="divide-y divide-border/70 border-y border-border/70">
        {permissions.map((permission, index) => (
          <ManifestPermissionRow
            key={`${permission.kind}-${permission.reason}-${index}`}
            permission={permission}
          />
        ))}
      </div>
    </div>
  )
}

function ManifestPermissionRow({
  permission
}: {
  permission: AgentCapabilityPluginManifestPermission
}): ReactElement {
  const { t } = useTranslation()
  const strategyFallback = t('settings.agentPluginManifestPermissionNotDeclared')

  return (
    <div className="space-y-2 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={permission.kind === 'read' ? 'muted' : 'strong'}>
          {t(`settings.agentPluginPermissionKinds.${permission.kind}`)}
        </Badge>
        {permission.scopes.map((scope) => (
          <Badge key={`${permission.kind}-${scope}`}>
            {t(`common.scope.${scope}`)}
          </Badge>
        ))}
      </div>
      <ManifestMetaRow label={t('settings.agentPluginManifestPermissionReason')}>
        <p className="text-xs leading-5 text-muted-foreground">{permission.reason}</p>
      </ManifestMetaRow>
      <ManifestMetaRow label={t('settings.agentPluginManifestPermissionPathPatterns')}>
        <div className="space-y-1">
          {permission.pathPatterns.map((pathPattern) => (
            <p
              key={`${permission.kind}-${pathPattern}`}
              className="truncate rounded-sm bg-muted/35 px-1.5 py-1 font-mono text-[11px] text-muted-foreground"
              title={pathPattern}
            >
              {pathPattern}
            </p>
          ))}
        </div>
      </ManifestMetaRow>
      <ManifestMetaRow label={t('settings.agentPluginManifestPermissionBackupStrategy')}>
        <p className="text-xs leading-5 text-muted-foreground">
          {permission.backupStrategy ?? strategyFallback}
        </p>
      </ManifestMetaRow>
      <ManifestMetaRow label={t('settings.agentPluginManifestPermissionConflictStrategy')}>
        <p className="text-xs leading-5 text-muted-foreground">
          {permission.conflictStrategy ?? strategyFallback}
        </p>
      </ManifestMetaRow>
    </div>
  )
}

function PermissionRow({
  permission
}: {
  permission: AgentCapabilityPluginPermission
}): ReactElement {
  const { t } = useTranslation()

  return (
    <div className="py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={permission.kind === 'write' ? 'strong' : 'muted'}>
          {t(`settings.agentPluginPermissionKinds.${permission.kind}`)}
        </Badge>
        {permission.scopes.map((scope) => (
          <Badge key={`${permission.kind}-${scope}`}>
            {t(`common.scope.${scope}`)}
          </Badge>
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {t(permission.reasonKey)}
      </p>
      <div className="mt-2 space-y-1">
        {permission.pathPatterns.map((pathPattern) => (
          <p
            key={`${permission.kind}-${pathPattern}`}
            className="truncate rounded-sm bg-muted/35 px-1.5 py-1 font-mono text-[11px] text-muted-foreground"
            title={pathPattern}
          >
            {pathPattern}
          </p>
        ))}
      </div>
    </div>
  )
}

function CapabilityRow({
  capability
}: {
  capability: AgentCapabilityPluginCapability
}): ReactElement {
  const { t } = useTranslation()

  return (
    <div className="py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="text-xs font-medium text-foreground">{t(capability.labelKey)}</p>
        <Badge tone={capability.status === 'available' ? 'strong' : 'muted'}>
          {t(`settings.agentPluginCapabilityStatus.${capability.status}`)}
        </Badge>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {t(capability.descriptionKey)}
      </p>
      {capability.statusDetailKey && (
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground/80">
          {t(capability.statusDetailKey)}
        </p>
      )}
    </div>
  )
}

function SourceCoverageSummary({
  coverage
}: {
  coverage: AgentCapabilityPluginSourceCoverage
}): ReactElement {
  const { t } = useTranslation()

  return (
    <div className="hidden max-w-[13rem] shrink-0 text-right text-xs text-muted-foreground sm:block">
      <p>{t('settings.agentPluginSourceTotal', { count: coverage.total })}</p>
      <p className="mt-1 leading-4">{formatCoverage(t, coverage)}</p>
    </div>
  )
}

function SourceCoverageDetails({
  coverage
}: {
  coverage: AgentCapabilityPluginSourceCoverage
}): ReactElement {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {SOURCE_STATUS_ORDER.map((status) => (
          <Badge
            key={status}
            tone={status === 'scanned' && coverage.counts[status] > 0 ? 'strong' : 'muted'}
          >
            {t(`settings.agentPluginSourceStatus.${status}`, {
              count: coverage.counts[status]
            })}
          </Badge>
        ))}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        {formatCoverage(t, coverage)}
      </p>
      {coverage.sources.length > 0 ? (
        <div className="divide-y divide-border/70 border-y border-border/70">
          {coverage.sources.map((source, index) => (
            <PluginSourceRow key={`${source.path}-${source.code ?? index}`} source={source} />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {t('settings.agentPluginSourceNoRows')}
        </p>
      )}
    </div>
  )
}

function PluginSourceRow({
  source
}: {
  source: AgentCapabilityPluginSource
}): ReactElement {
  const { t } = useTranslation()
  const title = source.labelKey
    ? t(source.labelKey)
    : source.code
      ? t(`settings.agentPluginSourceCodes.${source.code}`, { defaultValue: source.code })
      : source.pathPattern ?? source.path
  const description = source.descriptionKey ? t(source.descriptionKey) : null
  const visiblePath = source.path || source.pathPattern

  return (
    <div className="space-y-1.5 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="min-w-0 text-xs font-medium text-foreground">{title}</p>
        <Badge tone={source.status === 'scanned' ? 'strong' : 'muted'}>
          {t(`settings.agentPluginSourceRowStatus.${source.status}`)}
        </Badge>
        <Badge>{t(`common.scope.${source.scope}`)}</Badge>
        <Badge>
          {t(`settings.agentPluginSourceKinds.${source.kind ?? 'unknown'}`)}
        </Badge>
        {(source.categories ?? []).map((category) => (
          <Badge key={`${source.path}-${category}`}>
            {t(`common.category.${category}`)}
          </Badge>
        ))}
        <Badge tone={source.declared ? 'strong' : 'muted'}>
          {source.declared
            ? t('settings.agentPluginSourceDeclared')
            : t('settings.agentPluginSourceDetectedOnly')}
        </Badge>
      </div>
      {description && (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      )}
      {visiblePath && (
        <p
          className="truncate rounded-sm bg-muted/35 px-1.5 py-1 font-mono text-[11px] text-muted-foreground"
          title={visiblePath}
        >
          {visiblePath}
        </p>
      )}
      {source.pathPattern && source.pathPattern !== visiblePath && (
        <p className="text-[11px] leading-4 text-muted-foreground">
          {t('settings.agentPluginSourcePathPattern', { pattern: source.pathPattern })}
        </p>
      )}
    </div>
  )
}

function DetailBlock({
  icon: Icon,
  title,
  children
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}): ReactElement {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {title}
      </div>
      {children}
    </div>
  )
}

function ManifestMetaRow({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): ReactElement {
  return (
    <div className="grid gap-1 text-xs sm:grid-cols-[8rem_1fr] sm:items-center">
      <p className="text-muted-foreground">{label}</p>
      <div className="min-w-0 text-foreground">{children}</div>
    </div>
  )
}

function Badge({
  children,
  tone = 'muted'
}: {
  children: React.ReactNode
  tone?: 'muted' | 'strong'
}): ReactElement {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-[11px] leading-4',
        tone === 'strong'
          ? 'border-foreground/15 bg-foreground/[0.04] text-foreground'
          : 'border-border text-muted-foreground'
      )}
    >
      {children}
    </span>
  )
}

function readinessTone(status: AgentCapabilityPluginManifestActivationStatus): 'muted' | 'strong' {
  return status === 'metadata-only' || status === 'activation-ready' ? 'strong' : 'muted'
}

function formatCoverage(
  t: (key: string, options?: Record<string, unknown>) => string,
  coverage: AgentCapabilityPluginSourceCoverage
): string {
  return t('settings.agentPluginSourceSummary', {
    scanned: coverage.counts.scanned,
    missing: coverage.counts.missing,
    notScanned: coverage.counts['not-scanned']
  })
}
