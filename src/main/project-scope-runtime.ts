import type { ProjectScopeActivationResult } from '@shared/types/ipc'
import { normalizeProjectPath, sameProjectPath } from '@shared/scope'
import { getAssetRuntime } from './engine/assets/runtime'
import { getWatcher } from './engine/watcher'

interface WatcherRuntime {
  restart: (projectDir?: string) => Promise<void>
}

interface AssetRuntime {
  getProjectDir: () => string | undefined
  setProjectDir: (projectDir?: string) => void
  hasSnapshotFor: (projectDir?: string) => boolean
  refresh: (opts: { reason: 'project-scope'; wait: true }) => Promise<unknown>
  getScanResult: () => ProjectScopeActivationResult['scanResult']
  getProjectCandidates: () => Promise<ProjectScopeActivationResult['candidates']>
}

export interface ProjectScopeRuntimeDeps {
  getRuntime: () => AssetRuntime
  getWatcher: () => WatcherRuntime
}

export async function activateProjectScope(
  projectPath?: string,
  deps: ProjectScopeRuntimeDeps = {
    getRuntime: getAssetRuntime,
    getWatcher
  }
): Promise<ProjectScopeActivationResult> {
  const runtime = deps.getRuntime()
  const nextProjectDir = normalizeActivatedProjectDir(projectPath)
  const shouldReinitialize = !sameOptionalProjectPath(runtime.getProjectDir(), nextProjectDir)
  // A cached snapshot for this project is served instantly by setProjectDir; only
  // (re)scan when there is no cache (the watcher keeps the active project fresh).
  const cached = runtime.hasSnapshotFor(nextProjectDir)
  if (shouldReinitialize) {
    runtime.setProjectDir(nextProjectDir)
  }
  if (!cached) {
    await runtime.refresh({ reason: 'project-scope', wait: true })
  }

  if (shouldReinitialize) {
    await deps.getWatcher().restart(nextProjectDir)
  }

  return {
    projectDir: runtime.getProjectDir(),
    scanResult: runtime.getScanResult(),
    candidates: await runtime.getProjectCandidates()
  }
}

function normalizeActivatedProjectDir(projectPath: string | undefined): string | undefined {
  const normalized = normalizeProjectPath(projectPath ?? '')
  return normalized || undefined
}

function sameOptionalProjectPath(left: string | undefined, right: string | undefined): boolean {
  if (!left && !right) return true
  if (!left || !right) return false
  return sameProjectPath(left, right)
}
