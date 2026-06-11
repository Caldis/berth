import type { Asset, WatchEvent } from '@shared/types/asset'
import { resolveProjectConfigRoots } from '../../project-config-roots'
import { deriveAssetsForPath } from './derive-asset'

/** The minimal runtime surface the watcher wiring needs, so the translation is
 * unit-testable without the full AgentAssetRuntime or an Electron main process. */
export interface WatchableRuntime {
  getProjectDir(): string | undefined
  applyFileChange(sourceKey: string, derivedAssets: Asset[]): void
  refresh(options?: { reason?: 'watcher' }): unknown
}

/**
 * Translate a filesystem change into a live-snapshot update (GH-113 I1). A
 * supported file (root-level convention files, for now) is re-derived and folded
 * in incrementally by `sourceKey` — no full rescan. Anything not yet supported
 * incrementally (derived === null: sessions, settings, skills, ...) falls back to
 * a background full refresh, matching the previous full-rescan behavior.
 */
export function applyWatchEvent(event: WatchEvent, runtime: WatchableRuntime): void {
  const derived = event.filePath
    ? deriveAssetsForPath(event.filePath, { projectRoots: resolveProjectConfigRoots(runtime.getProjectDir()) })
    : null
  if (derived === null) {
    void runtime.refresh({ reason: 'watcher' })
  } else {
    runtime.applyFileChange(event.sourceKey ?? '', derived)
  }
}
