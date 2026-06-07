import type { Asset } from './types/asset'

export type AppScopeMode = 'global' | 'user' | 'project'

export type ProjectScopeCandidateSource = 'current' | 'session' | 'scan-source'

export type AppScopeSelection =
  | { mode: 'global' }
  | { mode: 'user' }
  | { mode: 'project'; projectPath: string; projectPathKey: string }

export interface ProjectScopeCandidate {
  id: string
  path: string
  pathKey: string
  name: string
  displayPath: string
  sources: ProjectScopeCandidateSource[]
  lastSeenAt?: string
  sessionCount: number
}

export interface ProjectScopeCandidateInput {
  path: string
  name?: string
  displayPath?: string
  source: ProjectScopeCandidateSource
  lastSeenAt?: string
  sessionCount?: number
}

export const DEFAULT_SCOPE_SELECTION: AppScopeSelection = { mode: 'global' }

export function normalizeProjectPath(projectPath: string): string {
  const value = String(projectPath || '').trim()
  if (!value) return ''
  const normalized = value.replace(/[\\/]+/g, '/')
  if (/^[A-Za-z]:\/?$/.test(normalized)) return normalized.slice(0, 2)
  return normalized.length > 1 ? normalized.replace(/\/+$/g, '') : normalized
}

export function normalizeProjectPathKey(projectPath: string): string {
  const normalized = normalizeProjectPath(projectPath)
  if (!normalized) return ''
  return isWindowsLikePath(projectPath) ? normalized.toLowerCase() : normalized
}

export function sameProjectPath(left: string, right: string): boolean {
  return normalizeProjectPathKey(left) === normalizeProjectPathKey(right)
}

export function normalizeScopeSelection(selection: Partial<AppScopeSelection> | null | undefined): AppScopeSelection {
  if (!selection || selection.mode === 'global') return DEFAULT_SCOPE_SELECTION
  if (selection.mode === 'user') return { mode: 'user' }
  if (selection.mode === 'project') {
    const projectPath = normalizeProjectPath(selection.projectPath || '')
    const projectPathKey = normalizeProjectPathKey(projectPath)
    if (projectPath && projectPathKey) return { mode: 'project', projectPath, projectPathKey }
  }
  return DEFAULT_SCOPE_SELECTION
}

export function projectPathForScope(selection: AppScopeSelection): string | undefined {
  return selection.mode === 'project' ? selection.projectPath : undefined
}

export function assetProjectPath(asset: Asset): string | undefined {
  return readString(asset.meta, 'projectPath')
}

export function assetMatchesProjectPath(asset: Asset, projectPath: string | undefined): boolean {
  if (!projectPath) return true
  const explicitProjectPath = assetProjectPath(asset)
  if (explicitProjectPath) return sameProjectPath(explicitProjectPath, projectPath)
  // No explicit owner: a project-scoped asset without a recorded `projectPath`
  // was scanned as part of the ACTIVE project's snapshot — including inheritance
  // chain configs rooted ABOVE a selected subdir (path containment would wrongly
  // exclude those). Cross-project assets (shallow-indexed other projects) always
  // carry an explicit `projectPath` and are matched above. (GH-113 T3)
  return asset.scope === 'project'
}

export function assetMatchesAppScope(asset: Asset, selection: AppScopeSelection): boolean {
  if (selection.mode === 'global') return true
  if (selection.mode === 'user') return asset.scope === 'user' || asset.scope === 'enterprise'
  if (asset.scope === 'user' || asset.scope === 'enterprise') return true
  if (asset.scope === 'project' || asset.scope === 'session') {
    return assetMatchesProjectPath(asset, selection.projectPath)
  }
  return false
}

export function filterAssetsByAppScope(assets: Asset[], selection: AppScopeSelection): Asset[] {
  return assets.filter((asset) => assetMatchesAppScope(asset, selection))
}

export function createProjectScopeCandidate(input: ProjectScopeCandidateInput): ProjectScopeCandidate | null {
  const path = normalizeProjectPath(input.path)
  const pathKey = normalizeProjectPathKey(path)
  if (!path || !pathKey) return null
  return {
    id: `project:${pathKey}`,
    path,
    pathKey,
    name: input.name || projectNameFromPath(path),
    displayPath: input.displayPath || path,
    sources: [input.source],
    lastSeenAt: input.lastSeenAt,
    sessionCount: Math.max(0, Math.trunc(input.sessionCount || 0))
  }
}

export function mergeProjectScopeCandidates(candidates: ProjectScopeCandidate[]): ProjectScopeCandidate[] {
  const byPath = new Map<string, ProjectScopeCandidate>()
  for (const candidate of candidates) {
    const normalized = createProjectScopeCandidate({
      path: candidate.path,
      name: candidate.name,
      displayPath: candidate.displayPath,
      source: candidate.sources[0] || 'scan-source',
      lastSeenAt: candidate.lastSeenAt,
      sessionCount: candidate.sessionCount
    })
    if (!normalized) continue
    const existing = byPath.get(normalized.pathKey)
    if (!existing) {
      byPath.set(normalized.pathKey, {
        ...normalized,
        sources: uniqueSources(candidate.sources.length > 0 ? candidate.sources : normalized.sources)
      })
      continue
    }
    byPath.set(normalized.pathKey, {
      ...existing,
      sources: uniqueSources([...existing.sources, ...candidate.sources]),
      lastSeenAt: newestIso(existing.lastSeenAt, candidate.lastSeenAt),
      sessionCount: existing.sessionCount + Math.max(0, Math.trunc(candidate.sessionCount || 0))
    })
  }
  return Array.from(byPath.values()).sort((a, b) => {
    if (b.sessionCount !== a.sessionCount) return b.sessionCount - a.sessionCount
    return a.name.localeCompare(b.name)
  })
}

function isWindowsLikePath(projectPath: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(projectPath) || /^\\\\/.test(projectPath) || projectPath.includes('\\')
}

function projectNameFromPath(projectPath: string): string {
  const parts = normalizeProjectPath(projectPath).split('/').filter(Boolean)
  return parts[parts.length - 1] || projectPath
}

function uniqueSources(sources: ProjectScopeCandidateSource[]): ProjectScopeCandidateSource[] {
  return Array.from(new Set(sources))
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

function newestIso(left?: string, right?: string): string | undefined {
  if (!left) return right
  if (!right) return left
  return Date.parse(right) > Date.parse(left) ? right : left
}
