import { Fragment, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ExternalLink, FileText, Folder, Globe2, Loader2, UserRound } from 'lucide-react'
import {
  createProjectScopeCandidate,
  normalizeProjectPathKey,
  normalizeScopeSelection,
  type AppScopeSelection,
  type ProjectScopeCandidate,
  type ProjectScopeCandidateSource
} from '@shared/scope'
import type { ScanRoot, ScanSourceStatus } from '@shared/types/asset'
import type { AgentScanSourceGroup } from '@shared/types/ipc'
import { useAppStore } from '@/stores/app'
import {
  formatScanSourceStatusCount,
  getScanSourceCopy,
  getScanSourceStatusLabel
} from '@/components/layout/local-source-copy'
import { ScopeOption, ScopePopover } from './scope-popover'
import { ChromeSearchInput } from './search-control'

// 项目行 meta 只点名"有问题"的来源状态; scanned 是默认态, 从 total 可推出, 不复述。
const PROBLEM_SOURCE_STATUSES: ScanSourceStatus[] = ['not-scanned', 'missing']

// 候选超过该数量时显示项目过滤输入框。
const FILTER_VISIBLE_THRESHOLD = 5

interface ProjectSourceSummary {
  total: number
  counts: Record<ScanSourceStatus, number>
}

interface ProjectScopeSwitcherProps {
  collapsed: boolean
}

interface ProjectScopeActions {
  error: string | null
  loadCandidates: () => Promise<void>
  loading: boolean
  selectScope: (selection: Partial<AppScopeSelection>) => Promise<void>
  sourceError: string | null
  sourceGroups: AgentScanSourceGroup[]
  sourceLoading: boolean
}

export function ProjectScopeSwitcher({ collapsed }: ProjectScopeSwitcherProps): React.ReactElement {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const closeMenu = useCallback(() => setOpen(false), [])
  const {
    error,
    loadCandidates,
    loading,
    selectScope,
    sourceError,
    sourceGroups,
    sourceLoading
  } = useProjectScopeActions({ onSelected: closeMenu })
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const candidates = useAppStore((s) => s.projectCandidates)
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

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (nextOpen) {
        setFilter('')
        void loadCandidates()
      }
    },
    [loadCandidates]
  )

  const normalizedFilter = filter.trim().toLowerCase()
  const visibleCandidates = normalizedFilter
    ? candidates.filter(
      (candidate) =>
        candidate.name.toLowerCase().includes(normalizedFilter) ||
        candidate.displayPath.toLowerCase().includes(normalizedFilter)
    )
    : candidates
  const showFilterInput = candidates.length > FILTER_VISIBLE_THRESHOLD

  return (
    <ScopePopover
      collapsed={collapsed}
      icon={<Folder className="h-3.5 w-3.5" />}
      label={t('projectScope.label')}
      valuePrefix={t('projectScope.prefix')}
      value={label}
      description={description}
      active={scopeSelection.mode !== 'global'}
      listLabel={t('projectScope.listLabel')}
      open={open}
      onOpenChange={handleOpenChange}
      panelClassName="w-80"
      header={
        <div className="mb-2">
          <div className="px-2 py-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {t('projectScope.label')}
            </p>
            <p className="mt-0.5 truncate text-sm font-medium" title={description}>
              {label}
            </p>
          </div>
          {showFilterInput && (
            <div className="mt-1 px-1">
              <ChromeSearchInput
                value={filter}
                onValueChange={setFilter}
                placeholder={t('projectScope.filterProjects')}
                className="sm:w-full"
                testId="project-scope-filter"
              />
            </div>
          )}
        </div>
      }
      footer={
        <SelectedProjectSources
          candidate={selectedProject}
          groups={selectedProjectSourceGroups}
          loading={sourceLoading}
          error={sourceError}
        />
      }
    >
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

      <div className="mt-2 border-t border-border pt-2">
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
        ) : !loading && visibleCandidates.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            {t('projectScope.filterNoMatches')}
          </p>
        ) : (
          <div className="grid max-h-64 gap-1 overflow-y-auto">
            {visibleCandidates.map((candidate) => (
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
    </ScopePopover>
  )
}

function useProjectScopeActions({ onSelected }: { onSelected: () => void }): ProjectScopeActions {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceGroups, setSourceGroups] = useState<AgentScanSourceGroup[]>([])
  const [sourceLoading, setSourceLoading] = useState(false)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const setScopeSelection = useAppStore((s) => s.setScopeSelection)
  const setProjectCandidates = useAppStore((s) => s.setProjectCandidates)
  const setAssetSnapshot = useAppStore((s) => s.setAssetSnapshot)

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

  const selectScope = useCallback(async (selection: Partial<AppScopeSelection>): Promise<void> => {
    // Inform the engine of the active scope so server-side reads (search) honour
    // it. This is a fast no-rescan IPC — the core of sub-second switching.
    setError(null)
    try {
      await window.api.projectScope.setScope?.(normalizeScopeSelection(selection))
    } catch {
      /* non-fatal: scope still applies client-side */
    }
    // Global / User are pure client-side filters over the current snapshot, so
    // switching is instant (no rescan). Only selecting a specific project
    // (re)scans that project's roots.
    if (selection.mode !== 'project') {
      setScopeSelection(selection)
      onSelected()
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.projectScope.activate({ projectPath: selection.projectPath })
      // GH-115 T4: 资产只走 setAssetSnapshot 单写落点 (fold 不变量), 不再裸替换 —
      // activate 的 scanResult 由随后的快照读取覆盖, 此处只更新候选列表。
      setProjectCandidates(result.candidates ?? [])
      if (window.api?.assets?.snapshot) {
        setAssetSnapshot(await window.api.assets.snapshot())
      }
      setScopeSelection(selection)
      onSelected()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [onSelected, setAssetSnapshot, setProjectCandidates, setScopeSelection])

  return {
    error,
    loadCandidates,
    loading,
    selectScope,
    sourceError,
    sourceGroups,
    sourceLoading
  }
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
  const { t } = useTranslation()
  const metaSegments: { key: string; text: string; warning?: boolean }[] = []
  for (const source of candidate.sources) {
    metaSegments.push({ key: `provenance-${source}`, text: sourceLabel(t, source) })
  }
  if (candidate.sessionCount > 0) {
    metaSegments.push({
      key: 'sessions',
      text: t('projectScope.sessionCount', { count: candidate.sessionCount })
    })
  }
  if (sourceSummary.total > 0) {
    metaSegments.push({
      key: 'sources',
      text: t('projectScope.sourceCount', { count: sourceSummary.total })
    })
  }
  for (const status of PROBLEM_SOURCE_STATUSES) {
    const count = sourceSummary.counts[status]
    if (count <= 0) continue
    metaSegments.push({
      key: status,
      text: formatScanSourceStatusCount(t, status, count),
      warning: status === 'missing'
    })
  }

  return (
    <ScopeOption
      icon={<Folder className="h-3.5 w-3.5" />}
      title={candidate.name}
      description={candidate.displayPath}
      meta={metaSegments.length > 0 ? (
        <span className="mt-0.5 block truncate text-[11px] leading-4 text-muted-foreground">
          {metaSegments.map((segment, index) => (
            <Fragment key={segment.key}>
              {index > 0 && <span aria-hidden="true"> · </span>}
              <span className={segment.warning ? 'text-amber-500' : undefined}>{segment.text}</span>
            </Fragment>
          ))}
        </span>
      ) : undefined}
      selected={selected}
      onClick={onClick}
    />
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
  const { t } = useTranslation()
  const status = source.status ?? 'scanned'
  const copy = getScanSourceCopy(t, source)
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
  const { t } = useTranslation()

  return (
    <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] leading-3 text-muted-foreground">
      {getScanSourceStatusLabel(t, status)}
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
