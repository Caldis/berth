import { useAppStore } from '@/stores/app'
import type { AssetRuntimeState, AssetScanProgress } from '@shared/types/ipc'

/**
 * Single derived model for the ambient "indexing" presence shown across the app
 * (header hairline, sidebar pulse, per-page hints). Everything reads from the one
 * central runtime status so the surfaces never disagree — the indexer is one
 * background activity, surfaced calmly in several places. (GH-113 observability)
 */
export interface IndexActivity {
  /** Background indexing is running (fresh scan or a stale re-validation). */
  active: boolean
  state: AssetRuntimeState
  phase?: AssetScanProgress['phase']
  /** True only during the bulk `parsing` phase with a known total — the one
   * moment a real percentage is meaningful. Other phases sweep indeterminately. */
  determinate: boolean
  /** 0–100, valid only when `determinate`. */
  pct: number
  /** Assets discovered so far — grows live as partial results stream in. */
  scanned: number
  /** Engine-computed estimated seconds remaining (single source of truth, GH-135).
   * Undefined until the engine has a baseline; never derived in the GUI. */
  etaSeconds?: number
  /** Engine-computed scan rate in assets/sec (GH-135), undefined until known. */
  ratePerSec?: number
  errorCount: number
}

export function useIndexActivity(): IndexActivity {
  const status = useAppStore((s) => s.assetRuntimeStatus)
  const scanned = useAppStore((s) => s.assets.length)
  const errorCount = useAppStore((s) => s.assetErrors.length)

  const active = status.state === 'scanning' || status.state === 'stale'
  const progress = status.progress
  const determinate =
    active && progress?.phase === 'parsing' && typeof progress.total === 'number' && progress.total > 0
  const pct = determinate ? Math.min(100, Math.round((progress!.current / progress!.total) * 100)) : 0
  // Engine-computed ETA/rate ride the progress stream (B1 enrichProgress) — read
  // them straight through; the GUI never recomputes a time estimate of its own.
  const etaSeconds = progress?.etaMs !== undefined ? Math.ceil(progress.etaMs / 1000) : undefined
  const ratePerSec = progress?.ratePerSec

  return {
    active,
    state: status.state,
    phase: progress?.phase,
    determinate,
    pct,
    scanned,
    etaSeconds,
    ratePerSec,
    errorCount
  }
}
