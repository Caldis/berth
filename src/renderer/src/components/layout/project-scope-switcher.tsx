import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Check, Folder, Globe2, Loader2, UserRound } from 'lucide-react'
import type { AppScopeSelection, ProjectScopeCandidate, ProjectScopeCandidateSource } from '@shared/scope'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'

interface ProjectScopeSwitcherProps {
  collapsed: boolean
}

export function ProjectScopeSwitcher({ collapsed }: ProjectScopeSwitcherProps): React.ReactElement {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const setScopeSelection = useAppStore((s) => s.setScopeSelection)
  const candidates = useAppStore((s) => s.projectCandidates)
  const setProjectCandidates = useAppStore((s) => s.setProjectCandidates)
  const setAssets = useAppStore((s) => s.setAssets)
  const setStats = useAppStore((s) => s.setStats)
  const setScanning = useAppStore((s) => s.setScanning)
  const currentProject = useMemo(
    () => currentProjectCandidate(scopeSelection, candidates),
    [candidates, scopeSelection]
  )
  const label = scopeLabel(t, scopeSelection, currentProject)
  const description = scopeDescription(t, scopeSelection, currentProject)

  const loadCandidates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const nextCandidates = await window.api.projectScope.candidates()
      setProjectCandidates(nextCandidates)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [setProjectCandidates])

  const toggleOpen = (): void => {
    const nextOpen = !open
    setOpen(nextOpen)
    if (nextOpen) void loadCandidates()
  }

  const selectScope = async (selection: Partial<AppScopeSelection>): Promise<void> => {
    setLoading(true)
    setError(null)
    setScanning(true)
    try {
      const projectPath = selection.mode === 'project' ? selection.projectPath : undefined
      const result = await window.api.projectScope.activate({ projectPath })
      setAssets(result.scanResult.assets ?? [])
      setStats(result.scanResult.stats)
      setProjectCandidates(result.candidates ?? [])
      setScopeSelection(selection)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
      setScanning(false)
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
          className="absolute bottom-10 left-0 z-50 w-80 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg"
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
                    selected={scopeSelection.mode === 'project' && scopeSelection.projectPathKey === candidate.pathKey}
                    onClick={() => void selectScope({ mode: 'project', projectPath: candidate.path })}
                  />
                ))}
              </div>
            )}
          </div>
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
  selected,
  onClick
}: {
  candidate: ProjectScopeCandidate
  selected: boolean
  onClick: () => void
}): React.ReactElement {
  const { t } = useTranslation()
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
        </span>
      </span>
      {selected && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
    </button>
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
