/**
 * Time-window dedupe for the uncaughtException error box (GH-152 T7). A looping
 * throw source (timer/event callback re-raising the same error) used to stack
 * modal dialogs until the app was unusable. Keyed by message: the same failure
 * surfaces at most once per window; distinct failures are never suppressed.
 * Logging is NOT gated — every occurrence still lands in userData/logs.
 */
export interface ErrorDialogGate {
  shouldShow(message: string): boolean
}

export function createErrorDialogGate(windowMs: number, now: () => number = () => Date.now()): ErrorDialogGate {
  const lastShownAt = new Map<string, number>()
  return {
    shouldShow(message: string): boolean {
      const at = lastShownAt.get(message)
      const current = now()
      if (at !== undefined && current - at < windowMs) return false
      lastShownAt.set(message, current)
      return true
    }
  }
}
