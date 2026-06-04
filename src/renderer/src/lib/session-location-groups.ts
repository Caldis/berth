import type { SessionSummary } from '@shared/types/asset'
import type { VirtualListGroup } from '@/lib/virtual-list-model'

interface SessionProjectGroupLabels {
  root: string
  unknown: string
}

interface SessionProjectGroupOptions {
  labels: SessionProjectGroupLabels
  currentProjectPath?: string | null
}

interface MutableSessionProjectGroup {
  id: string
  label: string
  pathTitle: string
  kind: 'root' | 'current-project' | 'project' | 'named-project' | 'unknown'
  parentPath: string
  parentLabel: string
  items: SessionSummary[]
  latestStartedAtMs: number
}

interface SessionParentStats {
  label: string
  latestStartedAtMs: number
  containsCurrentProject: boolean
}

const WINDOWS_DRIVE_ROOT_PATTERN = /^[A-Za-z]:\/$/
const WINDOWS_DRIVE_ONLY_PATTERN = /^[A-Za-z]:$/

export function buildSessionProjectGroups(
  sessions: readonly SessionSummary[],
  options: SessionProjectGroupOptions
): VirtualListGroup<SessionSummary>[] {
  const groups = new Map<string, MutableSessionProjectGroup>()
  const currentProjectPath = normalizeProjectPath(options.currentProjectPath ?? '')

  for (const session of sessions) {
    const descriptor = describeSessionProjectGroup(session, options.labels, currentProjectPath)
    const existing = groups.get(descriptor.id)
    const startedAtMs = getSessionStartedAtMs(session)

    if (existing) {
      existing.items.push(session)
      existing.latestStartedAtMs = Math.max(existing.latestStartedAtMs, startedAtMs)
      continue
    }

    groups.set(descriptor.id, {
      ...descriptor,
      items: [session],
      latestStartedAtMs: startedAtMs
    })
  }

  const parentStats = buildParentStats(groups)

  return [...groups.values()].sort((a, b) => compareSessionProjectGroups(a, b, parentStats)).map((group) => ({
    id: group.id,
    label: group.label,
    count: group.items.length,
    items: group.items,
    meta: createSessionProjectGroupMeta(group)
  }))
}

function createSessionProjectGroupMeta(group: MutableSessionProjectGroup): VirtualListGroup<SessionSummary>['meta'] {
  const meta: NonNullable<VirtualListGroup<SessionSummary>['meta']> = {
      kind: group.kind,
      pathTitle: group.pathTitle,
      latestStartedAtMs: group.latestStartedAtMs,
      sortRank: sessionProjectGroupRank(group.kind)
    }

  if (group.parentPath) {
    meta.parentPath = group.parentPath
    meta.parentLabel = group.parentLabel
  }

  return meta
}

function describeSessionProjectGroup(
  session: SessionSummary,
  labels: SessionProjectGroupLabels,
  currentProjectPath: string
): Pick<MutableSessionProjectGroup, 'id' | 'label' | 'pathTitle' | 'kind' | 'parentPath' | 'parentLabel'> {
  const projectPath = normalizeProjectPath(session.projectPath)

  if (projectPath) {
    if (isRootPath(projectPath)) {
      return {
        id: `project-root:${projectPath}`,
        label: projectPath === '/' ? labels.root : projectPath,
        pathTitle: projectPath,
        kind: 'root',
        parentPath: '',
        parentLabel: ''
      }
    }

    const parentPath = parentPathForProjectPath(projectPath)
    const projectLabel = formatProjectPathLabel(projectPath, session.project)

    return {
      id: `project-path:${projectPath}`,
      label: projectLabel,
      pathTitle: projectPath,
      kind: projectPath === currentProjectPath ? 'current-project' : 'project',
      parentPath,
      parentLabel: formatParentPathLabel(parentPath, labels.root)
    }
  }

  const project = session.project.trim()
  if (project) {
    return {
      id: `project-name:${project}`,
      label: project,
      pathTitle: project,
      kind: 'named-project',
      parentPath: '',
      parentLabel: ''
    }
  }

  return {
    id: 'project-unknown',
    label: labels.unknown,
    pathTitle: labels.unknown,
    kind: 'unknown',
    parentPath: '',
    parentLabel: ''
  }
}

function compareSessionProjectGroups(
  a: MutableSessionProjectGroup,
  b: MutableSessionProjectGroup,
  parentStats: ReadonlyMap<string, SessionParentStats>
): number {
  const rankDelta = sessionProjectGroupRank(a.kind, parentStats.get(a.parentPath)) - sessionProjectGroupRank(b.kind, parentStats.get(b.parentPath))
  if (rankDelta !== 0) return rankDelta

  if (a.parentPath && b.parentPath && a.parentPath !== b.parentPath) {
    const parentA = parentStats.get(a.parentPath)
    const parentB = parentStats.get(b.parentPath)
    const parentLatestDelta = (parentB?.latestStartedAtMs ?? 0) - (parentA?.latestStartedAtMs ?? 0)
    if (parentLatestDelta !== 0) return parentLatestDelta

    const parentLabelDelta = (parentA?.label ?? a.parentLabel).localeCompare(parentB?.label ?? b.parentLabel)
    if (parentLabelDelta !== 0) return parentLabelDelta
  }

  const currentProjectDelta = currentProjectSortRank(a.kind) - currentProjectSortRank(b.kind)
  if (currentProjectDelta !== 0) return currentProjectDelta

  const latestDelta = b.latestStartedAtMs - a.latestStartedAtMs
  if (latestDelta !== 0) return latestDelta

  const countDelta = b.items.length - a.items.length
  if (countDelta !== 0) return countDelta

  return a.label.localeCompare(b.label)
}

function sessionProjectGroupRank(kind: MutableSessionProjectGroup['kind'], parent?: SessionParentStats): number {
  if (kind === 'root') return 0
  if (parent?.containsCurrentProject) return 1
  if (kind === 'project' || kind === 'current-project') return 2
  if (kind === 'named-project') return 3
  return 99
}

function currentProjectSortRank(kind: MutableSessionProjectGroup['kind']): number {
  return kind === 'current-project' ? 0 : 1
}

function buildParentStats(
  groups: ReadonlyMap<string, MutableSessionProjectGroup>
): Map<string, SessionParentStats> {
  const parentStats = new Map<string, SessionParentStats>()

  for (const group of groups.values()) {
    if (!group.parentPath) continue

    const existing = parentStats.get(group.parentPath)
    if (existing) {
      existing.latestStartedAtMs = Math.max(existing.latestStartedAtMs, group.latestStartedAtMs)
      existing.containsCurrentProject = existing.containsCurrentProject || group.kind === 'current-project'
      continue
    }

    parentStats.set(group.parentPath, {
      label: group.parentLabel,
      latestStartedAtMs: group.latestStartedAtMs,
      containsCurrentProject: group.kind === 'current-project'
    })
  }

  return parentStats
}

function parentPathForProjectPath(path: string): string {
  const normalizedPath = normalizeProjectPath(path)
  if (!normalizedPath || isRootPath(normalizedPath)) return normalizedPath

  const lastSlashIndex = normalizedPath.lastIndexOf('/')
  if (lastSlashIndex <= 0) return '/'
  if (lastSlashIndex === 2 && normalizedPath[1] === ':') {
    return `${normalizedPath.slice(0, 2)}/`
  }

  return normalizedPath.slice(0, lastSlashIndex)
}

function formatParentPathLabel(parentPath: string, rootLabel: string): string {
  if (!parentPath || parentPath === '/') return rootLabel
  if (WINDOWS_DRIVE_ROOT_PATTERN.test(parentPath)) return parentPath

  const parts = parentPath.split('/').filter(Boolean)
  if (parts.length === 0) return rootLabel

  return parts.slice(-2).join('/')
}

function formatProjectPathLabel(projectPath: string, fallbackProject: string): string {
  const parts = projectPath.split('/').filter(Boolean)
  const label = parts.at(-1)
  if (label && !WINDOWS_DRIVE_ONLY_PATTERN.test(label)) return label

  const project = fallbackProject.trim()
  return project || projectPath
}

function normalizeProjectPath(path: string): string {
  const trimmedPath = path.trim()
  if (!trimmedPath) return ''

  let normalizedPath = trimmedPath.replaceAll('\\', '/').replace(/\/+/g, '/')
  if (normalizedPath === '/') return normalizedPath
  if (WINDOWS_DRIVE_ONLY_PATTERN.test(normalizedPath)) return `${normalizedPath}/`

  while (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1)
  }

  if (WINDOWS_DRIVE_ONLY_PATTERN.test(normalizedPath)) return `${normalizedPath}/`
  return normalizedPath
}

function isRootPath(path: string): boolean {
  return path === '/' || WINDOWS_DRIVE_ROOT_PATTERN.test(path)
}

function getSessionStartedAtMs(session: SessionSummary): number {
  if (!session.startedAt) return 0
  const timestamp = new Date(session.startedAt).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}
