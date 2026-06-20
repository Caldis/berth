import type { AssetScanProgress } from '@shared/types/ipc'

/**
 * Coalesces high-frequency scan-progress events at the emit boundary so per-file
 * ticks can't saturate the worker→main→renderer IPC chain (GH-10, the issue's
 * HARD prerequisite for file-level granularity).
 *
 * Per-file emission can fire thousands of times per scan; sending each across
 * three process boundaries would flood structured-clone + the renderer event
 * loop. This throttles to at most one emit per `windowMs`, latest-wins: within a
 * window the newest progress overwrites the buffered one (no queue — we only care
 * about the latest path/count). A trailing event is buffered, not dropped; the
 * caller MUST `flush()` when the stream ends so the last tick is always delivered.
 *
 * Terminal events are never dropped: `flush()` delivers the buffered tail, and a
 * phase change (e.g. parsing→indexing) emits immediately rather than waiting out
 * the window, so the bar never appears stuck on a stale phase.
 *
 * Time-based (not timer-based) on purpose: the heaviest adapter loops run
 * synchronously (glob.sync + sync parse), so a `setTimeout` trailing flush would
 * never fire mid-loop. Gating on elapsed wall-clock bounds the emit rate inside a
 * tight sync loop; `flush()` covers the tail the same way rAF's final frame does.
 */
export class ProgressCoalescer {
  private hasEmitted = false
  private lastEmitMs = 0
  private buffered: AssetScanProgress | null = null
  private lastPhase: AssetScanProgress['phase'] | null = null

  constructor(
    private readonly emit: (progress: AssetScanProgress) => void,
    private readonly windowMs = 50,
    private readonly now: () => number = () => Date.now()
  ) {}

  /**
   * Offer a progress event. Emits immediately if it's the first event, the window
   * has elapsed, or the phase changed; otherwise buffers it (latest-wins) for the
   * next emit / flush.
   */
  push(progress: AssetScanProgress): void {
    const phaseChanged = this.lastPhase !== null && progress.phase !== this.lastPhase
    const elapsed = this.now() - this.lastEmitMs
    if (!this.hasEmitted || phaseChanged || elapsed >= this.windowMs) {
      this.deliver(progress)
      return
    }
    this.buffered = progress
  }

  /** Deliver any buffered trailing event. Call when the progress stream ends so
   * the terminal/latest tick is never lost. No-op when nothing is buffered. */
  flush(): void {
    if (this.buffered) this.deliver(this.buffered)
  }

  private deliver(progress: AssetScanProgress): void {
    this.buffered = null
    this.hasEmitted = true
    this.lastEmitMs = this.now()
    this.lastPhase = progress.phase
    this.emit(progress)
  }
}
