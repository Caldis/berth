import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Check, ExternalLink, FileText, Folder, Globe2, Loader2, UserRound } from 'lucide-react'
import {
  createProjectScopeCandidate,
  normalizeProjectPathKey,
  type AppScopeSelection,
  type ProjectScopeCandidate,
  type ProjectScopeCandidateSource
} from '@shared/scope'
import type { ScanRoot, ScanSourceStatus } from '@shared/types/asset'
import type { AgentScanSourceGroup } from '@shared/types/ipc'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'
import {
  formatScanSourceStatusCount,
  getScanSourceCopy,
  getScanSourceStatusLabel
} from '@/components/settings/local-source-copy'

const SOURCE_STATUS_ORDER: ScanSourceStatus[] = ['scanned', 'not-scanned', 'missing']

interface ProjectSourceSummary {
  total: number
  counts: Record<ScanSourceStatus, number>
}

interface ProjectScopeSwitcherProps {
  collapsed: boolean
}

export function ProjectScopeSwitcher({ collapsed }: ProjectScopeSwitcherProps): React.ReactElement {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceGroups, setSourceGroups] = useState<AgentScanSourceGroup[]>([])
  const [sourceLoading, setSourceLoading] = useState(false)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const setScopeSelection = useAppStore((s) => s.setScopeSelection)
  const candidates = useAppStore((s) => s.projectCandidates)
  const setProjectCandidates = useAppStore((s) => s.setProjectCandidates)
  const setAssets = useAppStore((s) => s.setAssets)
  const setStats = useAppStore((s) => s.setStats)
  const setAssetSnapshot = useAppStore((s) => s.setAssetSnapshot)
  const currentProject = useMemo(
    () => currentProjectCandidate(scopeSelection, candidates),
    [candidates, scopeSelection]
  )
  const selectedProject = useMemo(() => {
    if (scopeSelection.mode !== 'project') return undefined
    return currentProject ?? createProjectScopeCandidate({
      path: scopeSelection.projectPath,
      source: 'current'
    }) ?? undefined
  }, [currentProject, scopeSelection])
  const selectedProjectSourceGroups = useMemo(
    () => selectedProject ? projectSourceGroupsFor(selectedProject, sourceGroups) : [],
    [selectedProject, sourceGroups]
  )
  const label = scopeLabel(t, scopeSelection, currentProject)
  const description = scopeDescription(t, scopeSelection, currentProject)

  const loadCandidates = useCallback(async () => {
    setLoading(true)
    setSourceLoading(true)
    setError(null)
    setSourceError(null)

    const [candidateResult, sourceResult] = await Promise.allSettled([
      window.api.projectScope.candidates(),
      window.api?.assets?.scanSources ? window.api.assets.scanSources() : Promise.resolve([])
    ])

    if (candidateResult.status === 'fulfilled') {
      setProjectCandidates(candidateResult.value)
    } else {
      const err = candidateResult.reason
      setError(err instanceof Error ? err.message : String(err))
    }

    if (sourceResult.status === 'fulfilled') {
      setSourceGroups(sourceResult.value ?? [])
    } else {
      const err = sourceResult.reason
      setSourceError(err instanceof Error ? err.message : String(err))
    }

    setLoading(false)
    setSourceLoading(false)
  }, [setProjectCandidates])

  const toggleOpen = (): void => {
    const nextOpen = !open
    setOpen(nextOpen)
    if (nextOpen) void loadCandidates()
  }

  const selectScope = async (selection: Partial<AppScopeSelection>): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const projectPath = selection.mode === 'project' ? selection.projectPath : undefined
      const result = await window.api.projectScope.activate({ projectPath })
      setAssets(result.scanResult.assets ?? [])
      setStats(result.scanResult.stats)
      setProjectCandidates(result.candidates ?? [])
      if (window.api?.assets?.snapshot) {
        setAssetSnapshot(await window.api.assets.snapshot())
      }
      setScopeSelection(selection)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="titlebar-no-drag relative">
      <button
        type="button"
        onClick={toggleOpen}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.stopPropagation()
            setOpen(false)
          }
        }}
        className={cn(
          'flex h-8 w-full min-w-0 items-center gap-2 rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/10 hover:text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-ring',
          collapsed ? 'w-8 justify-center' : 'justify-start px-2.5'
        )}
        title={collapsed ? t('projectScope.label') : description}
        aria-label={t('projectScope.label')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Folder className="h-3.5 w-3.5 shrink-0" />
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
            {label}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-10 z-50 max-h-[calc(100vh-7rem)] w-80 overflow-y-auto rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg"
          role="listbox"
          aria-label={t('projectScope.listLabel')}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
          }}
        >
          <div className="mb-2 px-2 py-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {t('projectScope.label')}
            </p>
            <p className="mt-0.5 truncate text-sm font-medium" title={description}>
              {label}
            </p>
          </div>

          <div className="grid gap-1">
            <ScopeOption
              icon={<Globe2 className="h-3.5 w-3.5" />}
              title={t('projectScope.global')}
              description={t('projectScope.globalDesc')}
              selected={scopeSelection.mode === 'global'}
              onClick={() => void selectScope({ mode: 'global' })}
            />
            <ScopeOption
              icon={<UserRound className="h-3.5 w-3.5" />}
              title={t('projectScope.user')}
              description={t('projectScope.userDesc')}
              selected={scopeSelection.mode === 'user'}
              onClick={() => void selectScope({ mode: 'user' })}
            />
          </div>

          <div className="mt-3 border-t border-border pt-2">
            <div className="mb-1 flex items-center justify-between px-2">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                {t('projectScope.projects')}
              </p>
              {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
            {error && (
              <div className="mb-1 flex items-start gap-2 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate" title={error}>{t('projectScope.loadError')}</span>
              </div>
            )}
            {sourceError && (
              <div className="mb-1 flex items-start gap-2 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate" title={sourceError}>{t('projectScope.projectSourcesError')}</span>
              </div>
            )}
            {!loading && candidates.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                {t('projectScope.emptyProjects')}
              </p>
            ) : (
              <div className="grid max-h-64 gap-1 overflow-y-auto">
                {candidates.map((candidate) => (
                  <ProjectOption
                    key={candidate.id}
                    candidate={candidate}
                    sourceSummary={projectSourceSummaryFor(candidate, sourceGroups)}
                    selected={scopeSelection.mode === 'project' && scopeSelection.projectPathKey === candidate.pathKey}
                    onClick={() => void selectScope({ mode: 'project', projectPath: candidate.path })}
                  />
                ))}
              </div>
            )}
          </div>

          <SelectedProjectSources
            candidate={selectedProject}
            groups={selectedProjectSourceGroups}
            loading={sourceLoading}
            error={sourceError}
          />
        </div>
      )}
    </div>
  )
}

function ScopeOption({
  icon,
  title,
  description,
  selected,
  onClick
}: {
  icon: React.ReactNode
  title: string
  description: string
  selected: boolean
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      role="option"
      aria-label={title}
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted',
        selected && 'bg-muted text-foreground'
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
    </button>
  )
}

function ProjectOption({
  candidate,
  sourceSummary,
  selected,
  onClick
}: {
  candidate: ProjectScopeCandidate
  sourceSummary: ProjectSourceSummary
  selected: boolean
  onClick: () => void
}): React.ReactElement {
  const { t, i18n } = useTranslation()
  return (
    <button
      type="button"
      role="option"
      aria-label={candidate.name}
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'flex w-full min-w-0 items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted',
        selected && 'bg-muted text-foreground'
      )}
    >
      <Folder className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium" title={candidate.name}>
          {candidate.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground" title={candidate.displayPath}>
          {candidate.displayPath}
        </span>
        <span className="mt-1 flex flex-wrap gap-1">
          {candidate.sources.map((source) => (
            <span
              key={source}
              className="inline-flex rounded border border-border px-1.5 py-0.5 text-[10px] leading-3 text-muted-foreground"
            >
              {sourceLabel(t, source)}
            </span>
          ))}
          {candidate.sessionCount > 0 && (
            <span className="inline-flex rounded border border-border px-1.5 py-0.5 text-[10px] leading-3 text-muted-foreground">
              {t('projectScope.sessionCount', { count: candidate.sessionCount })}
            </span>
          )}
          {sourceSummary.total > 0 && (
            <span className="inline-flex rounded border border-border px-1.5 py-0.5 text-[10px] leading-3 text-muted-foreground">
              {t('projectScope.sourceCount', { count: sourceSummary.total })}
            </span>
          )}
          {SOURCE_STATUS_ORDER.map((status) => {
            const count = sourceSummary.counts[status]
            if (count <= 0) return null
            return (
              <span
                key={status}
                className="inline-flex rounded border border-border px-1.5 py-0.5 text-[10px] leading-3 text-muted-foreground"
              >
                {formatScanSourceStatusCount(status, count, i18n.language)}
              </span>
            )
          })}
        </span>
      </span>
      {selected && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
    </button>
  )
}

function SelectedProjectSources({
  candidate,
  groups,
  loading,
  error
}: {
  candidate: ProjectScopeCandidate | undefined
  groups: ProjectSourceGroup[]
  loading: boolean
  error: string | null
}): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="mt-3 border-t border-border pt-2">
      <div className="mb-1 flex items-center justify-between px-2">
        <p className="text-[11px] font-semibold uppercase text-muted-foreground">
          {t('projectScope.projectSources')}
        </p>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      {loading && (
        <p className="px-2 py-2 text-xs text-muted-foreground">
          {t('projectScope.projectSourcesLoading')}
        </p>
      )}

      {!loading && !candidate && !error && (
        <p className="px-2 py-2 text-xs text-muted-foreground">
          {t('projectScope.projectSourcesHint')}
        </p>
      )}

      {candidate && !loading && !error && groups.length === 0 && (
        <p className="px-2 py-2 text-xs text-muted-foreground">
          {t('projectScope.projectSourcesEmpty')}
        </p>
      )}

      {candidate && !error && groups.length > 0 && (
        <div className="grid max-h-56 gap-2 overflow-y-auto px-1">
          {groups.map(({ group, sources }) => (
            <div key={group.agentId} className="min-w-0 rounded-md border border-border/70 px-2 py-2">
              <p className="mb-1.5 truncate text-xs font-medium" title={group.agentName}>
                {group.agentName}
              </p>
              <div className="grid gap-1.5">
                {sources.map((source) => (
                  <ProjectSourceRow
                    key={`${group.agentId}:${source.code ?? source.path}:${source.path}`}
                    source={source}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectSourceRow({ source }: { source: ScanRoot }): React.ReactElement {
  const { t, i18n } = useTranslation()
  const status = source.status ?? 'scanned'
  const copy = getScanSourceCopy(source, i18n.language)
  const Icon = source.kind === 'file' ? FileText : Folder
  const summary = copy.actionHint ?? copy.summary

  return (
    <div
      data-project-source-root
      className="min-w-0 rounded border border-transparent px-1.5 py-1 text-xs hover:border-border hover:bg-muted/50"
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="min-w-0 flex-1 truncate font-medium" title={copy.title}>
              {copy.title}
            </p>
            <ProjectSourceStatusBadge status={status} />
          </div>
          {summary && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground" title={summary}>
              {summary}
            </p>
          )}
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground" title={source.path}>
            {source.path}
          </p>
        </div>
        {status === 'scanned' && (
          <button
            type="button"
            aria-label={t('instructions.showInExplorer')}
            title={t('instructions.showInExplorer')}
            onClick={(event) => {
              event.stopPropagation()
              void window.api?.shell.openPath(source.path)
            }}
            className="mt-0.5 rounded p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function ProjectSourceStatusBadge({ status }: { status: ScanSourceStatus }): React.ReactElement {
  const { i18n } = useTranslation()

  return (
    <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] leading-3 text-muted-foreground">
      {getScanSourceStatusLabel(status, i18n.language)}
    </span>
  )
}

function currentProjectCandidate(
  selection: AppScopeSelection,
  candidates: ProjectScopeCandidate[]
): ProjectScopeCandidate | undefined {
  if (selection.mode !== 'project') return undefined
  return candidates.find((candidate) => candidate.pathKey === selection.projectPathKey)
}

function scopeLabel(
  t: (key: string) => string,
  selection: AppScopeSelection,
  candidate: ProjectScopeCandidate | undefined
): string {
  if (selection.mode === 'global') return t('projectScope.global')
  if (selection.mode === 'user') return t('projectScope.user')
  return candidate?.name ?? selection.projectPath
}

function scopeDescription(
  t: (key: string) => string,
  selection: AppScopeSelection,
  candidate: ProjectScopeCandidate | undefined
): string {
  if (selection.mode === 'global') return t('projectScope.globalDesc')
  if (selection.mode === 'user') return t('projectScope.userDesc')
  return candidate?.displayPath ?? selection.projectPath
}

function sourceLabel(
  t: (key: string) => string,
  source: ProjectScopeCandidateSource
): string {
  return t(`projectScope.sources.${source}`)
}

interface ProjectSourceGroup {
  group: AgentScanSourceGroup
  sources: ScanRoot[]
}

function projectSourceSummaryFor(
  candidate: ProjectScopeCandidate,
  groups: AgentScanSourceGroup[]
): ProjectSourceSummary {
  const summary = emptyProjectSourceSummary()
  for (const { sources } of projectSourceGroupsFor(candidate, groups)) {
    for (const source of sources) {
      const status = source.status ?? 'scanned'
      summary.total += 1
      summary.counts[status] += 1
    }
  }
  return summary
}

function projectSourceGroupsFor(
  candidate: ProjectScopeCandidate,
  groups: AgentScanSourceGroup[]
): ProjectSourceGroup[] {
  return groups
    .map((group) => ({
      group,
      sources: sourceRootsForGroup(group).filter((source) => sourceMatchesProject(source, candidate.path))
    }))
    .filter(({ sources }) => sources.length > 0)
}

function sourceRootsForGroup(group: AgentScanSourceGroup): ScanRoot[] {
  return group.sources ?? group.roots ?? []
}

function sourceMatchesProject(source: ScanRoot, projectPath: string): boolean {
  if (source.scope !== 'project') return false
  const sourcePathKey = normalizeProjectPathKey(source.path)
  const projectPathKey = normalizeProjectPathKey(projectPath)
  if (!sourcePathKey || !projectPathKey) return false
  return sourcePathKey === projectPathKey || sourcePathKey.startsWith(`${projectPathKey}/`)
}

function emptyProjectSourceSummary(): ProjectSourceSummary {
  return {
    total: 0,
    counts: {
      scanned: 0,
      'not-scanned': 0,
      missing: 0
    }
  }
}
