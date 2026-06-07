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

  return {
    active,
    state: status.state,
    phase: progress?.phase,
    determinate,
    pct,
    scanned,
    errorCount
  }
}
