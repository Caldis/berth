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
  kind: 'root' | 'current-parent' | 'parent' | 'project' | 'unknown'
  items: SessionSummary[]
  latestStartedAtMs: number
}

const WINDOWS_DRIVE_ROOT_PATTERN = /^[A-Za-z]:\/$/
const WINDOWS_DRIVE_ONLY_PATTERN = /^[A-Za-z]:$/

export function buildSessionProjectGroups(
  sessions: readonly SessionSummary[],
  options: SessionProjectGroupOptions
): VirtualListGroup<SessionSummary>[] {
  const groups = new Map<string, MutableSessionProjectGroup>()
  const currentParentPath = parentPathForProjectPath(options.currentProjectPath ?? '')

  for (const session of sessions) {
    const descriptor = describeSessionProjectGroup(session, options.labels, currentParentPath)
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

  return [...groups.values()].sort(compareSessionProjectGroups).map((group) => ({
    id: group.id,
    label: group.label,
    count: group.items.length,
    items: group.items,
    meta: {
      kind: group.kind,
      pathTitle: group.pathTitle,
      latestStartedAtMs: group.latestStartedAtMs,
      sortRank: sessionProjectGroupRank(group.kind)
    }
  }))
}

function describeSessionProjectGroup(
  session: SessionSummary,
  labels: SessionProjectGroupLabels,
  currentParentPath: string
): Pick<MutableSessionProjectGroup, 'id' | 'label' | 'pathTitle' | 'kind'> {
  const projectPath = normalizeProjectPath(session.projectPath)

  if (projectPath) {
    if (isRootPath(projectPath)) {
      return {
        id: `project-root:${projectPath}`,
        label: projectPath === '/' ? labels.root : projectPath,
        pathTitle: projectPath,
        kind: 'root'
      }
    }

    const parentPath = parentPathForProjectPath(projectPath)
    const kind = parentPath && parentPath === currentParentPath ? 'current-parent' : 'parent'

    return {
      id: `project-parent:${parentPath}`,
      label: formatParentPathLabel(parentPath, labels.root),
      pathTitle: parentPath,
      kind
    }
  }

  const project = session.project.trim()
  if (project) {
    return {
      id: `project-name:${project}`,
      label: project,
      pathTitle: project,
      kind: 'project'
    }
  }

  return {
    id: 'project-unknown',
    label: labels.unknown,
    pathTitle: labels.unknown,
    kind: 'unknown'
  }
}

function compareSessionProjectGroups(
  a: MutableSessionProjectGroup,
  b: MutableSessionProjectGroup
): number {
  const rankDelta = sessionProjectGroupRank(a.kind) - sessionProjectGroupRank(b.kind)
  if (rankDelta !== 0) return rankDelta

  const latestDelta = b.latestStartedAtMs - a.latestStartedAtMs
  if (latestDelta !== 0) return latestDelta

  const countDelta = b.items.length - a.items.length
  if (countDelta !== 0) return countDelta

  return a.label.localeCompare(b.label)
}

function sessionProjectGroupRank(kind: MutableSessionProjectGroup['kind']): number {
  if (kind === 'root') return 0
  if (kind === 'current-parent') return 1
  if (kind === 'parent') return 2
  if (kind === 'project') return 3
  return 99
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
