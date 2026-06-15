import type {
  AgentScanSourceGroup,
  AssetScanPartial,
  AssetScanProgress,
  ScanResult
} from '@shared/types/ipc'
import type { ProjectScopeCandidate } from '@shared/scope'
import { getMainLog } from '../../log'

export interface AssetRuntimeScanOptions {
  onProgress?: (progress: AssetScanProgress) => void
  onPartial?: (partial: AssetScanPartial) => void
}

export interface AssetRuntimeScanner {
  scanAll(options?: AssetRuntimeScanOptions): Promise<ScanResult>
  getScanSourceGroups(): Promise<AgentScanSourceGroup[]>
  getProjectScopeCandidates(): ProjectScopeCandidate[]
  getProjectDir(): string | undefined
  /** Abort an in-flight scan (cancel/pause, GH-135). The helper kills its process;
   * the worker has no hard abort, so the coordinator drops its result instead. */
  cancel?(): void
}

/** Everything a completed scan hands back for the runtime to commit. */
export interface ScanOutcome {
  scanResult: ScanResult
  sources: AgentScanSourceGroup[]
  projectCandidates: ProjectScopeCandidate[]
  projectDir: string | undefined
}

/** The runtime's data-commit surface; the coordinator never touches state itself. */
export interface ScanSink {
  onProgress(progress: AssetScanProgress): void
  onPartial(partial: AssetScanPartial): void
  onCompleted(outcome: ScanOutcome): void
  onFailed(error: unknown): void
}

/**
 * GH-122: owns the scanner lifecycle, in-flight dedupe and the generation
 * guard. `swap()` replaces the scanner when the project changes; every callback
 * of a scan started against an older scanner is dropped (GH-111 R4 — a stale
 * scan must never clobber the newly-selected project's state). Scheduling /
 * backpressure for the background indexer (链 ③) lands here.
 */
export class ScanCoordinator {
  private scanner: AssetRuntimeScanner
  private inFlight: Promise<void> | null = null
  private cancelled = false

  constructor(
    private readonly createScanner: (projectDir?: string) => AssetRuntimeScanner,
    projectDir?: string
  ) {
    this.scanner = createScanner(projectDir)
  }

  /** Replace the scanner for a new project dir; in-flight scans of the old
   * generation keep running but their results are discarded. */
  swap(projectDir?: string): void {
    this.scanner = this.createScanner(projectDir)
  }

  /** Read-only access for scanner metadata (e.g. resolved project dir). */
  current(): AssetRuntimeScanner {
    return this.scanner
  }

  isScanning(): boolean {
    return this.inFlight !== null
  }

  wait(): Promise<void> {
    return this.inFlight ?? Promise.resolve()
  }

  /** Execute one scan; concurrent calls join the same in-flight promise. */
  run(sink: ScanSink): Promise<void> {
    if (this.inFlight) return this.inFlight
    this.cancelled = false
    this.inFlight = this.execute(sink).finally(() => {
      this.inFlight = null
    })
    return this.inFlight
  }

  /** Abort the in-flight scan (cancel/pause, GH-135): tell the scanner to stop
   * (helper kills its process) and mark the run cancelled so the aborted scan's
   * progress/result/failure is dropped, not committed. */
  cancel(): void {
    if (!this.inFlight) return
    this.cancelled = true
    this.scanner.cancel?.()
  }

  private async execute(sink: ScanSink): Promise<void> {
    const scanner = this.scanner
    const isCurrent = (): boolean => this.scanner === scanner && !this.cancelled
    try {
      const scanResult = await scanner.scanAll({
        onProgress: (progress) => { if (isCurrent()) sink.onProgress(progress) },
        onPartial: (partial) => { if (isCurrent()) sink.onPartial(partial) }
      })
      if (!isCurrent()) return
      const sources = await scanner.getScanSourceGroups()
      const projectCandidates = scanner.getProjectScopeCandidates()
      const projectDir = scanner.getProjectDir()
      if (!isCurrent()) return
      sink.onCompleted({ scanResult, sources, projectCandidates, projectDir })
    } catch (error) {
      // A cancelled scan rejects because the helper was killed — expected, not a
      // failure; drop it silently. (GH-135)
      if (this.cancelled) return
      // GH-115 T6: the single sink for all scan failures — log unconditionally
      // (even for a swapped-away generation) so the stack is never lost; only
      // the state transition is generation-guarded.
      getMainLog().log('asset-runtime', error)
      if (!isCurrent()) return
      sink.onFailed(error)
    }
  }
}
