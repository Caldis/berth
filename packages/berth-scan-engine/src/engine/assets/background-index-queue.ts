import type { Asset } from '@shared/types/asset'
import type { BackgroundIndexStatus, ScanError } from '@shared/types/ipc'
import type { ProjectScopeCandidate } from '@shared/scope'
import { normalizeProjectPathKey } from '@shared/scope'
import { resolveProjectConfigRoots } from '../../project-config-roots'

/** Scanner surface the queue needs — resolved per pump so coordinator.swap()
 * (project switch) always yields the current generation's scanner. */
export interface BackgroundIndexScanner {
  scanProjectDeep?(
    projectRoot: string,
    options?: { excludePaths?: string[]; respectGitignore?: boolean }
  ): Promise<{ assets: Asset[]; errors: ScanError[] }>
  cancel?(): void
}

export interface BackgroundIndexQueueDeps {
  getScanner(): BackgroundIndexScanner
  /** True while the coordinator has a foreground scan in flight — the queue
   * always yields (A4 前台让位; the helper is a serialized single child). */
  isForegroundBusy(): boolean
  /** Mirrors runtime.schedulerPaused — pause() freezes the queue too (A5). */
  isPaused(): boolean
  /** idle/AC gates, same semantics as runPeriodicScan (A5). */
  gatesOpen(): boolean
  scanOptions(): { excludePaths?: string[]; respectGitignore?: boolean; interProjectPauseMs: number }
  /** Commit one project's deep result (runtime.applyBackgroundProjectResult). */
  commit(projectRoot: string, result: { assets: Asset[]; errors: ScanError[] }): void
  /** Background-index status changed — re-emit runtime status (banner N/M). */
  onChange(): void
  log?: (error: unknown) => void
  /** Re-check delay when gated/busy. Injectable for tests. */
  retryDelayMs?: number
}

const DEFAULT_RETRY_DELAY_MS = 60_000

interface QueueItem {
  /** Resolved repository config root — the owner key committed against. */
  root: string
  /** Deepest known leaf (session cwd) — scanned so the config-root CHAIN from
   * root to leaf is covered (a monorepo subdir's own .claude). Multiple leaves
   * under one root keep the most recent one (v1 bound, nested `**\/CLAUDE.md`
   * still covers the whole tree's conventions). */
  scanPath: string
  lastSeenAt?: string
}

/**
 * GH-155 C4: background deep-index queue — makes [全局] progressively complete by
 * deep-scanning every session-derived project the full scan only shallow-indexes.
 * Most-recently-active first (决策④); yields to foreground scans and the idle/AC
 * gates (决策① no foreground cost); pause/resume ride the scheduler state (A5).
 * One round then silent (Q3) — each full-scan commit re-syncs, which both admits
 * newly discovered projects and revalidates grafted ones (W2's stale-deep bound).
 */
export class BackgroundIndexQueue {
  private readonly pending = new Map<string, QueueItem>()
  /** Every root ever finished: verdict + its item for revalidation rounds. */
  /** Every root ever finished (done or failed — failed still converges the round
   * and retries on the next revalidation), keyed to its item for re-enqueueing. */
  private readonly processed = new Map<string, QueueItem>()
  private inFlight: { key: string; item: QueueItem; dropped: boolean } | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private unsupported = false
  private readonly retryDelayMs: number

  constructor(private readonly deps: BackgroundIndexQueueDeps) {
    this.retryDelayMs = deps.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS
  }

  /**
   * Reconcile the queue with a commit's candidate list. New roots enqueue;
   * the active project's config-root chain counts as done (its deep scan just
   * ran via the adapters). When the queue was settled, previously processed
   * roots re-enqueue as a silent revalidation round — commitScan grafted their
   * deep rows (W2), so a rescan must reconcile deletions eventually.
   */
  sync(candidates: ProjectScopeCandidate[], activeProjectDir: string | undefined): void {
    const activeKeys = new Set<string>()
    for (const root of [activeProjectDir ?? '', ...resolveProjectConfigRoots(activeProjectDir)]) {
      const key = normalizeProjectPathKey(root)
      if (key) activeKeys.add(key)
    }

    const wasSettled = this.pending.size === 0 && !this.inFlight

    for (const candidate of candidates) {
      const root = resolveProjectConfigRoots(candidate.path)[0] ?? candidate.path
      const key = normalizeProjectPathKey(root)
      if (!key) continue
      if (activeKeys.has(key)) {
        // Active root: deep by definition — never queue-scanned, counts indexed.
        this.pending.delete(key)
        this.processed.set(key, { root, scanPath: candidate.path, lastSeenAt: candidate.lastSeenAt })
        continue
      }
      const pending = this.pending.get(key)
      if (pending) {
        if (isNewer(candidate.lastSeenAt, pending.lastSeenAt)) {
          pending.lastSeenAt = candidate.lastSeenAt
          pending.scanPath = candidate.path
        }
        continue
      }
      if (this.inFlight?.key === key) {
        // Review m4: an update arriving mid-flight rides the requeue item, so a
        // drop/preempt re-enters with the freshest leaf and priority.
        if (isNewer(candidate.lastSeenAt, this.inFlight.item.lastSeenAt)) {
          this.inFlight.item.lastSeenAt = candidate.lastSeenAt
          this.inFlight.item.scanPath = candidate.path
        }
        continue
      }
      if (!this.processed.has(key)) {
        this.pending.set(key, { root, scanPath: candidate.path, lastSeenAt: candidate.lastSeenAt })
      }
    }

    if (wasSettled && this.processed.size > 0) {
      for (const [key, item] of this.processed) {
        if (activeKeys.has(key)) continue
        if (!this.pending.has(key)) this.pending.set(key, item)
      }
    }

    this.deps.onChange()
  }

  /** Schedule a pump on a macrotask — lets the coordinator's in-flight promise
   * settle first (commitScan runs inside the scan's own promise chain). */
  kick(delayMs = 0): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      this.pump()
    }, delayMs)
  }

  /** pause(): freeze the queue and drop the in-flight result, keeping its spot.
   * Also kills the in-flight helper scan (review m1) — pause usually means "give
   * me the CPU back", and a result we will drop is not worth finishing. */
  notifyPaused(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (!this.inFlight) return
    this.inFlight.dropped = true
    try {
      this.deps.getScanner().cancel?.()
    } catch (error) {
      this.deps.log?.(error)
    }
  }

  /** rebuild(): the persisted + in-memory index was wiped — every prior verdict
   * is void (review m2). Reset so the next commit's sync re-runs a FIRST round
   * (banner visible again) instead of a silent revalidation over stale counts. */
  reset(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.pending.clear()
    this.processed.clear()
    if (this.inFlight) this.inFlight.dropped = true
    this.unsupported = false
    this.deps.onChange()
  }

  /** refresh() 入口 (A4): a foreground scan must not wait behind a background
   * project on the serialized helper — kill it (host respawns lazily) and requeue
   * the project at its old priority. */
  preemptForForeground(): void {
    if (!this.inFlight) return
    this.inFlight.dropped = true
    try {
      this.deps.getScanner().cancel?.()
    } catch (error) {
      this.deps.log?.(error)
    }
  }

  /** N/M projection for AssetRuntimeStatus.backgroundIndex (C1). Undefined while
   * nothing is known — absent field = idle. */
  status(): BackgroundIndexStatus | undefined {
    if (this.unsupported) return { state: 'unsupported', indexedProjects: 0, totalProjects: 0 }
    const activeKeys = [...this.pending.keys(), ...(this.inFlight ? [this.inFlight.key] : [])]
    const freshCount = activeKeys.filter((key) => !this.processed.has(key)).length
    const indexedProjects = this.processed.size
    const totalProjects = indexedProjects + freshCount
    if (totalProjects === 0) return undefined
    const state: BackgroundIndexStatus['state'] =
      freshCount > 0 ? 'indexing' : activeKeys.length > 0 ? 'revalidating' : 'done'
    return { state, indexedProjects, totalProjects }
  }

  private pump(): void {
    if (this.inFlight || this.deps.isPaused()) return
    if (this.pending.size === 0) {
      this.deps.onChange()
      return
    }
    if (this.deps.isForegroundBusy() || !this.deps.gatesOpen()) {
      this.kick(this.retryDelayMs)
      return
    }
    const scanner = this.deps.getScanner()
    if (typeof scanner.scanProjectDeep !== 'function') {
      this.unsupported = true
      this.deps.onChange()
      return
    }
    this.unsupported = false

    const key = this.nextKey()
    const item = this.pending.get(key)!
    this.pending.delete(key)
    const flight = { key, item, dropped: false }
    this.inFlight = flight
    this.deps.onChange()

    const options = this.deps.scanOptions()
    scanner
      // The LEAF goes to the scanner (config-root chain coverage); the resolved
      // ROOT goes to commit (owner-tag replacement key) — they must not swap.
      .scanProjectDeep(item.scanPath, {
        excludePaths: options.excludePaths,
        respectGitignore: options.respectGitignore
      })
      .then((result) => {
        if (flight.dropped) {
          this.pending.set(key, item)
          return
        }
        this.deps.commit(item.root, result)
        for (const error of result.errors) this.deps.log?.(error)
        this.processed.set(key, item)
      })
      .catch((error) => {
        if (flight.dropped) {
          this.pending.set(key, item)
          return
        }
        // A failed project (deleted dir, unreadable tree) counts as processed so
        // the round still converges; the next revalidation round retries it.
        this.processed.set(key, item)
        this.deps.log?.(error)
      })
      .finally(() => {
        this.inFlight = null
        this.deps.onChange()
        if (!this.deps.isPaused()) {
          // Inter-project backpressure (A11) — same yield knob as inter-adapter.
          this.kick(this.pending.size > 0 ? options.interProjectPauseMs : 0)
        }
      })
  }

  /** Most-recently-active first (决策④): max lastSeenAt; undefined sorts last. */
  private nextKey(): string {
    let bestKey: string | undefined
    let bestSeen: string | undefined
    for (const [key, item] of this.pending) {
      if (bestKey === undefined || isNewer(item.lastSeenAt, bestSeen)) {
        bestKey = key
        bestSeen = item.lastSeenAt
      }
    }
    return bestKey!
  }
}

function isNewer(candidate: string | undefined, current: string | undefined): boolean {
  if (!candidate) return false
  if (!current) return true
  return candidate > current
}
