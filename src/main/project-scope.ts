import type { Asset } from '@shared/types/asset'
import {
  createProjectScopeCandidate,
  mergeProjectScopeCandidates,
  sameProjectPath,
  type ProjectScopeCandidate
} from '@shared/scope'

export function assetProjectPath(asset: Asset): string | undefined {
  return readString(asset.meta, 'projectPath')
}

export function assetMatchesProjectPath(asset: Asset, projectPath: string | undefined): boolean {
  if (!projectPath) return true
  const assetPath = assetProjectPath(asset)
  return assetPath ? sameProjectPath(assetPath, projectPath) : false
}

export function filterAssetsByProjectPath(assets: Asset[], projectPath: string | undefined): Asset[] {
  if (!projectPath) return assets
  return assets.filter((asset) => assetMatchesProjectPath(asset, projectPath))
}

export function projectScopeCandidatesFromAssets(
  assets: Asset[],
  currentProjectDir?: string
): ProjectScopeCandidate[] {
  const candidates: ProjectScopeCandidate[] = []
  const current = currentProjectDir
    ? createProjectScopeCandidate({ path: currentProjectDir, source: 'current' })
    : null
  if (current) candidates.push(current)

  for (const asset of assets) {
    if (asset.type !== 'session') continue
    const projectPath = assetProjectPath(asset)
    if (!projectPath) continue
    const candidate = createProjectScopeCandidate({
      path: projectPath,
      source: 'session',
      name: readString(asset.meta, 'project') || undefined,
      lastSeenAt: sessionLastSeenAt(asset),
      sessionCount: 1
    })
    if (candidate) candidates.push(candidate)
  }

  return mergeProjectScopeCandidates(candidates)
}

function sessionLastSeenAt(asset: Asset): string | undefined {
  return readString(asset.meta, 'endedAt') ?? readString(asset.meta, 'startedAt') ?? readString(asset.meta, 'modifiedAt')
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}
