import type { Asset } from '@shared/types/asset'
import type { ProjectScopeActivationResult } from '@shared/types/ipc'
import { normalizeProjectPath, sameProjectPath } from '@shared/scope'
import type { AssetScanner } from './engine/scanner'
import { getScanner, initScanner } from './engine/scanner'
import { getSearch } from './engine/search'
import { getWatcher } from './engine/watcher'

interface SearchIndex {
  buildIndex: (assets: Asset[]) => void
}

interface WatcherRuntime {
  restart: (projectDir?: string) => Promise<void>
}

export interface ProjectScopeRuntimeDeps {
  getScanner: () => AssetScanner
  initScanner: (projectDir?: string) => AssetScanner
  getSearch: () => SearchIndex
  getWatcher: () => WatcherRuntime
}

export async function activateProjectScope(
  projectPath?: string,
  deps: ProjectScopeRuntimeDeps = {
    getScanner,
    initScanner,
    getSearch,
    getWatcher
  }
): Promise<ProjectScopeActivationResult> {
  const currentScanner = deps.getScanner()
  const nextProjectDir = normalizeActivatedProjectDir(projectPath)
  const shouldReinitialize = !sameOptionalProjectPath(currentScanner.getProjectDir(), nextProjectDir)
  const scanner = shouldReinitialize ? deps.initScanner(nextProjectDir) : currentScanner
  const scanResult = await scanner.scanAll()

  deps.getSearch().buildIndex(scanResult.assets)
  if (shouldReinitialize) {
    await deps.getWatcher().restart(nextProjectDir)
  }

  return {
    projectDir: scanner.getProjectDir(),
    scanResult,
    candidates: scanner.getProjectScopeCandidates()
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
