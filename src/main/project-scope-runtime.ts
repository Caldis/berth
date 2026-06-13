import type { ProjectScopeActivationResult } from '@shared/types/ipc'
import { normalizeProjectPath, sameProjectPath } from '@shared/scope'
import { getAssetRuntime } from '@berth/scan-engine/engine/assets/runtime'
import { getWatcher } from '@berth/scan-engine/engine/watcher'

interface WatcherRuntime {
  restart: (projectDir?: string) => Promise<void>
}

interface AssetRuntime {
  getProjectDir: () => string | undefined
  setProjectDir: (projectDir?: string) => void
  hasSnapshotFor: (projectDir?: string) => boolean
  refresh: (opts: { reason: 'project-scope'; wait: boolean }) => Promise<unknown>
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
  // A cached snapshot for this project is served instantly by setProjectDir. On a
  // cache miss, keep the current snapshot visible and refresh in the background;
  // project scope activation must not wait for a full scan.
  const cached = runtime.hasSnapshotFor(nextProjectDir)
  if (shouldReinitialize) {
    runtime.setProjectDir(nextProjectDir)
  }
  if (shouldReinitialize && !cached) {
    void runtime.refresh({ reason: 'project-scope', wait: false })
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
