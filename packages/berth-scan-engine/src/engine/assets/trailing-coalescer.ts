/**
 * Leading+trailing event coalescer for asynchronous push streams (GH-151 S7).
 *
 * Built for the `assets:changed` broadcast: every renderer subscriber re-queries
 * on each event, so the event rate is the IPC amplification factor. A lone event
 * (the common single-file edit) passes through instantly (leading edge); a burst
 * (git checkout touching dozens of files, an active session transcript flushing)
 * collapses to at most one delivery per window, latest-wins, with the newest
 * event always delivered at the trailing edge — never dropped.
 *
 * Timer-based, unlike {@link ProgressCoalescer}'s wall-clock gating: that one is
 * built for synchronous scan loops where a timeout could never fire mid-loop and
 * needs a manual flush. Filesystem events arrive asynchronously, so a setTimeout
 * trailing edge works and guarantees delivery without a flush contract.
 */
export class TrailingCoalescer<T> {
  private timer: ReturnType<typeof setTimeout> | null = null
  private buffered: T | undefined
  private hasBuffered = false

  constructor(
    private readonly emit: (event: T) => void,
    private readonly windowMs = 250
  ) {}

  push(event: T): void {
    if (!this.timer) {
      this.emit(event)
      this.timer = setTimeout(() => this.flushTrailing(), this.windowMs)
      return
    }
    this.buffered = event
    this.hasBuffered = true
  }

  /** Cancel the pending trailing emit (shutdown). */
  dispose(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.buffered = undefined
    this.hasBuffered = false
  }

  private flushTrailing(): void {
    this.timer = null
    if (!this.hasBuffered) return
    const event = this.buffered as T
    this.buffered = undefined
    this.hasBuffered = false
    this.emit(event)
    // Keep the window rolling during sustained bursts — one emit per window.
    this.timer = setTimeout(() => this.flushTrailing(), this.windowMs)
  }
}
