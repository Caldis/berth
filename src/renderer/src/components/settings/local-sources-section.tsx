import { useState, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  FolderOpen
} from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'
import type {
  AssetCategory,
  AssetScope,
  ScanRoot,
  ScanSourceStatus
} from '@shared/types/asset'
import type { AgentScanSourceGroup } from '@shared/types/ipc'
import {
  formatScanSourceStatusCount,
  getScanSourceCopy,
  getScanSourceStatusLabel
} from './local-source-copy'

const SOURCE_CATEGORY_ORDER: AssetCategory[] = [
  'instruction',
  'capability',
  'state',
  'observability',
  'integration'
]

const SOURCE_SCOPE_ORDER: AssetScope[] = ['user', 'project', 'enterprise', 'session']
const SOURCE_STATUS_ORDER: ScanSourceStatus[] = ['scanned', 'not-scanned', 'missing']

interface LocalSourcesSectionProps {
  groups: AgentScanSourceGroup[]
  loading: boolean
}

export function LocalSourcesSection({
  groups,
  loading
}: LocalSourcesSectionProps): ReactElement {
  const { t, i18n } = useTranslation()
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({})

  const toggleSourceGroup = (agentId: string): void => {
    setExpandedSources((current) => ({ ...current, [agentId]: !current[agentId] }))
  }

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t('settings.localSources')}
      </h2>
      <div className="rounded-lg border border-border bg-card">
        {loading && <div className="p-4 text-sm text-muted-foreground">{t('common.loading')}</div>}
        {!loading && groups.length === 0 && (
          <div className="p-4">
            <EmptyState
              icon={FolderOpen}
              message={t('settings.localSourcesEmpty')}
              className="border-0 py-8"
            />
          </div>
        )}
        {!loading &&
          groups.map((group, groupIndex) => {
            const sources = group.sources ?? group.roots
            const sourceCategories = getSourceCategories(sources)
            const statusCounts = getSourceStatusCounts(sources)
            const scopedSources = groupSourcesByScope(sources)
            const expanded = expandedSources[group.agentId] === true

            return (
              <div
                key={group.agentId}
                className={cn(groupIndex > 0 && 'border-t border-border')}
              >
                <button
                  type="button"
                  onClick={() => toggleSourceGroup(group.agentId)}
                  aria-expanded={expanded}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/5"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    {expanded ? (
                      <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-medium">{group.agentName}</p>
                        <span className="text-xs text-muted-foreground">
                          {group.installed
                            ? t('settings.sourceCount', { count: group.roots.length })
                            : t('settings.sourceNotFound')}
                        </span>
                      </div>
                      {sourceCategories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {sourceCategories.map((category) => (
                            <span
                              key={`${group.agentId}-${category}`}
                              className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {t(`settings.sourceCategories.${category}`)}
                            </span>
                          ))}
                        </div>
                      )}
                      <SourceStatusCounts counts={statusCounts} language={i18n.language} />
                      <p className="text-xs text-muted-foreground">
                        {group.installed
                          ? t('settings.sourceSummary')
                          : t('settings.sourceNotFoundDesc')}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-md border px-2 py-1 text-xs',
                      group.installed
                        ? 'border-accent/30 bg-accent/10 text-foreground'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    {group.installed ? t('settings.detected') : t('settings.notFound')}
                  </span>
                </button>
                {expanded && sources.length > 0 ? (
                  <div className="border-t border-border/70">
                    {scopedSources.map((scopeGroup, scopeIndex) => (
                      <div
                        key={`${group.agentId}-${scopeGroup.scope}`}
                        className={cn(scopeIndex > 0 && 'border-t border-border/70')}
                      >
                        <div className="bg-muted/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {t(`settings.sourceScopes.${scopeGroup.scope}`)}
                        </div>
                        {scopeGroup.sources.map((source, sourceIndex) => (
                          <SourceRow
                            key={`${group.agentId}-${source.path}-${source.reason ?? ''}`}
                            source={source}
                            showSeparator={sourceIndex > 0}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : expanded ? (
                  <div className="border-t border-border/70 px-4 py-3">
                    <EmptyState
                      icon={FolderOpen}
                      message={t('settings.noSourceRoots')}
                      className="border-0 py-6"
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
      </div>
    </section>
  )
}

function SourceStatusCounts({
  counts,
  language
}: {
  counts: Record<ScanSourceStatus, number>
  language: string
}): ReactElement | null {
  const visibleStatuses = SOURCE_STATUS_ORDER.filter((status) => counts[status] > 0)
  if (visibleStatuses.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {visibleStatuses.map((status) => (
        <span
          key={status}
          className={cn(
            'rounded-md border px-1.5 py-0.5 text-[11px]',
            status === 'scanned'
              ? 'border-accent/30 bg-accent/10 text-foreground'
              : 'border-border text-muted-foreground'
          )}
        >
          {formatScanSourceStatusCount(status, counts[status], language)}
        </span>
      ))}
    </div>
  )
}

function SourceRow({
  source,
  showSeparator
}: {
  source: ScanRoot
  showSeparator: boolean
}): ReactElement {
  const { t, i18n } = useTranslation()
  const SourceIcon = source.kind === 'file' ? FileText : FolderOpen
  const status = source.status ?? 'scanned'
  const copy = getScanSourceCopy(source, i18n.language)

  return (
    <div
      data-scan-source-root
      className={cn(
        'flex items-start justify-between gap-3 px-4 py-3',
        showSeparator && 'border-t border-border/70'
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <SourceIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{copy.title}</p>
            <SourceStatusBadge status={status} />
          </div>
          {copy.summary && (
            <p className="max-w-[60ch] text-xs text-muted-foreground">{copy.summary}</p>
          )}
          <p className="truncate font-mono text-xs text-muted-foreground">{source.path}</p>
          {copy.actionHint && (
            <p className="max-w-[60ch] text-xs text-muted-foreground">{copy.actionHint}</p>
          )}
        </div>
      </div>
      {status === 'scanned' ? (
        <button
          onClick={() => window.api?.shell.openPath(source.path)}
          className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-accent/10"
        >
          <ExternalLink className="h-3 w-3" />
          {t('instructions.showInExplorer')}
        </button>
      ) : null}
    </div>
  )
}

function SourceStatusBadge({ status }: { status: NonNullable<ScanRoot['status']> }): ReactElement {
  const { i18n } = useTranslation()

  return (
    <span
      className={cn(
        'rounded-md border px-1.5 py-0.5 text-[11px]',
        status === 'scanned'
          ? 'border-accent/30 bg-accent/10 text-foreground'
          : 'border-border text-muted-foreground'
      )}
    >
      {getScanSourceStatusLabel(status, i18n.language)}
    </span>
  )
}

function getSourceCategories(sources: ScanRoot[]): AssetCategory[] {
  const found = new Set<AssetCategory>()
  for (const source of sources) {
    for (const category of source.categories ?? []) {
      found.add(category)
    }
  }
  return SOURCE_CATEGORY_ORDER.filter((category) => found.has(category))
}

function getSourceStatusCounts(sources: ScanRoot[]): Record<ScanSourceStatus, number> {
  const counts: Record<ScanSourceStatus, number> = {
    scanned: 0,
    missing: 0,
    'not-scanned': 0
  }
  for (const source of sources) {
    counts[source.status ?? 'scanned'] += 1
  }
  return counts
}

function groupSourcesByScope(sources: ScanRoot[]): { scope: AssetScope; sources: ScanRoot[] }[] {
  const grouped = new Map<AssetScope, ScanRoot[]>()
  for (const source of sources) {
    grouped.set(source.scope, [...(grouped.get(source.scope) ?? []), source])
  }
  return SOURCE_SCOPE_ORDER
    .filter((scope) => grouped.has(scope))
    .map((scope) => ({ scope, sources: grouped.get(scope) ?? [] }))
}
