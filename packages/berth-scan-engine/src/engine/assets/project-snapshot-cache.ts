import type { AssetSnapshot } from '@shared/types/ipc'
import { normalizeProjectPathKey } from '@shared/scope'

/**
 * GH-122: per-project snapshot cache. Re-selecting an already-scanned project
 * serves its snapshot instantly (no rescan — the watcher keeps the active
 * project fresh). The normalized-path key ('' = no/global project) lives here
 * so callers never repeat the projectKey() idiom.
 */
export class ProjectSnapshotCache {
  private readonly entries = new Map<string, AssetSnapshot>()

  has(projectDir?: string): boolean {
    return this.entries.has(projectSnapshotKey(projectDir))
  }

  get(projectDir?: string): AssetSnapshot | undefined {
    return this.entries.get(projectSnapshotKey(projectDir))
  }

  set(projectDir: string | undefined, snapshot: AssetSnapshot): void {
    this.entries.set(projectSnapshotKey(projectDir), snapshot)
  }

  /** Drop every cached project snapshot (rebuild, GH-135). */
  clear(): void {
    this.entries.clear()
  }
}

/** Stable per-project cache key (normalized; empty for no/global project).
 * Also used by the runtime's persist-default-view predicate. */
export function projectSnapshotKey(projectDir?: string): string {
  return projectDir ? normalizeProjectPathKey(projectDir) : ''
}
