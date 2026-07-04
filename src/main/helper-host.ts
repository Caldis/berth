import { utilityProcess, type UtilityProcess } from 'electron'
import { execFile } from 'child_process'
import * as path from 'path'
import { getMainLog } from '@berth/scan-engine/log'
import type { Asset } from '@berth/scan-engine/shared/types/asset'
import type { ProjectScopeCandidate } from '@berth/scan-engine/shared/scope'
import type { AgentScanSourceGroup, ScanError, ScanResult } from '@berth/scan-engine/shared/types/ipc'
import type { AssetRuntimeScanner, AssetRuntimeScanOptions } from '@berth/scan-engine/engine/assets/runtime'
import type { AssetFileCacheSnapshot } from '@berth/scan-engine/engine/assets/file-cache'
import {
  workerDataFromScanOptions,
  type AssetWorkerData,
  type AssetWorkerMessage,
  type AssetWorkerScanPayload
} from '@berth/scan-engine/engine/assets/worker-host'

/** GH-155 C3: per-project deep-scan request the host posts to the helper child.
 * The projectScanCache snapshot rides along (same model as AssetWorkerData) so
 * deep scans and full scans share warm file fingerprints. */
export interface ProjectDeepScanRequest {
  projectRoot: string
  excludePaths?: string[]
  respectGitignore?: boolean
  projectScanCache?: AssetFileCacheSnapshot<Asset[]>
}

/** GH-155 C3: helper child reply for one project's deep scan. */
export interface ProjectDeepScanPayload {
  assets: Asset[]
  errors: ScanError[]
  projectScanCache: AssetFileCacheSnapshot<Asset[]>
}

/** Every message the helper child can post (scan stream + deep-scan reply). */
export type ScanHelperChildMessage =
  | AssetWorkerMessage
  | { type: 'project-deep-done'; result: ProjectDeepScanPayload }

export interface ScanHelperHostOptions {
  helperPath?: string
  createChild?: () => UtilityProcess
  /** Apply OS-level I/O+CPU throttle to the helper pid on spawn (GH-135 C2).
   * Default true; on win32 lowers CPU PriorityClass only (no I/O background
   * without a native binding — GH-8). */
  osThrottle?: boolean
  /** Injectable throttle hook (tests). Default runs taskpolicy/ionice via execFile. */
  applyThrottle?: (pid: number) => void
  /** Inactivity watchdog (GH-151 S2): a scan whose helper sends no message for
   * this long is presumed wedged (hung fs on a dead mount, AV-locked file) and
   * gets killed so the pipeline stays recoverable. 0 disables. */
  inactivityTimeoutMs?: number
}

/** Default no-message window before a scan is presumed wedged (GH-151 S2).
 * Progress ticks flow continuously during a healthy scan, so two minutes of
 * total silence means the child is stuck, not slow. Internal constant on
 * purpose — not a user-facing setting. */
const SCAN_INACTIVITY_TIMEOUT_MS = 120_000

/** Wider window for per-project deep scans (GH-155 review M1): one synchronous
 * engine call, ack tick then silence until done — a huge tree walk may honestly
 * exceed the full-scan window. Still bounded so a dead-mount wedge recovers. */
const DEEP_SCAN_INACTIVITY_TIMEOUT_MS = 600_000

/**
 * Manages a single long-lived utilityProcess scan helper (GH-135). Unlike the
 * one-shot worker_threads model, the child stays alive between scans; fork is
 * lazy (first scan) and the child auto-respawns on the next scan after a crash
 * or `kill()`. Scanning runs in this separate process for OS-level throttle (C2)
 * + crash/memory isolation; the host stays in the main process so the engine's
 * AgentAssetRuntime remains the single source of truth (方案 X).
 */
export class ScanHelperHost {
  private child: UtilityProcess | null = null
  private spawnPromise: Promise<void> | null = null
  /** Request serialization tail (GH-155 C3) — never rejects. */
  private tail: Promise<unknown> = Promise.resolve()
  private readonly helperPath: string
  private readonly createChild: () => UtilityProcess
  private readonly osThrottle: boolean
  private readonly applyThrottle: (pid: number) => void
  private readonly inactivityTimeoutMs: number

  constructor(options: ScanHelperHostOptions = {}) {
    this.helperPath = options.helperPath ?? path.join(__dirname, 'scan-helper.js')
    this.osThrottle = options.osThrottle ?? true
    this.applyThrottle = options.applyThrottle ?? defaultApplyThrottle
    this.inactivityTimeoutMs = options.inactivityTimeoutMs ?? SCAN_INACTIVITY_TIMEOUT_MS
    // No execArgv: utilityProcess routes it through NODE_OPTIONS, which Electron
    // rejects ("Most NODE_OPTIONs are not supported"). Process isolation already
    // separates the helper's V8 heap from main without it.
    this.createChild =
      options.createChild ?? (() => utilityProcess.fork(this.helperPath, [], { serviceName: 'berth-scan-helper' }))
  }

  /** Live child pid once spawned — OS throttle (C2) targets this. */
  pid(): number | undefined {
    return this.child?.pid ?? undefined
  }

  /** Terminate the helper (cancel / shutdown); the next scan respawns it. */
  kill(): void {
    this.child?.kill()
    this.child = null
    this.spawnPromise = null
  }

  private ensure(): { child: UtilityProcess; ready: Promise<void> } {
    if (this.child && this.spawnPromise) return { child: this.child, ready: this.spawnPromise }
    const child = this.createChild()
    this.child = child
    this.spawnPromise = new Promise<void>((resolve, reject) => {
      child.once('spawn', () => {
        // GH-135 C2: lower the helper's OS scheduling priority once it has a pid.
        if (this.osThrottle && typeof child.pid === 'number') this.applyThrottle(child.pid)
        resolve()
      })
      // GH-151 S2: utilityProcess can exit without ever spawning (missing helper
      // script, resource exhaustion). Reject so runScan fails instead of hanging
      // forever on `await ready`. Post-spawn exits hit an already-resolved
      // promise — a no-op.
      child.once('exit', (code) => {
        reject(new Error(`Asset scan helper exited before spawn (code ${String(code)})`))
      })
    })
    // A pre-spawn exit with no scan awaiting must not surface as an unhandled
    // rejection; runScan awaiters attach their own handlers.
    this.spawnPromise.catch(() => undefined)
    child.once('exit', () => {
      // Long-lived child died (crash/kill); drop it so the next scan respawns.
      if (this.child === child) {
        this.child = null
        this.spawnPromise = null
      }
    })
    return { child, ready: this.spawnPromise }
  }

  runScan(data: AssetWorkerData, options: AssetRuntimeScanOptions = {}): Promise<AssetWorkerScanPayload> {
    // Capture the session synchronously — same fork-at-request timing as the
    // pre-GH-155 single-request model; only the postMessage waits for its slot.
    const session = this.ensure()
    return this.serialize(() =>
      this.dispatch<AssetWorkerScanPayload>(session, { type: 'scan', data }, (message, settle) => {
        if (message.type === 'progress') {
          options.onProgress?.(message.progress)
          return
        }
        if (message.type === 'partial') {
          options.onPartial?.(message.partial)
          return
        }
        if (message.type === 'done') settle.resolve(message.result)
      })
    )
  }

  /** One project's deep scan in the helper (GH-155 C3). Serialized with runScan —
   * concurrent requests on the single long-lived child would interleave replies.
   * Uses a WIDER inactivity window (review M1): the deep scan is one synchronous
   * engine call that posts an ack tick then no messages until done — the default
   * 120s window assumes continuous progress ticks and would kill any project
   * whose tree walk outlasts it (then falsely count it indexed-failed). 0 (user
   * disabled) stays disabled. */
  runProjectDeepScan(request: ProjectDeepScanRequest): Promise<ProjectDeepScanPayload> {
    const session = this.ensure()
    const deepTimeoutMs =
      this.inactivityTimeoutMs <= 0
        ? 0
        : Math.max(this.inactivityTimeoutMs, DEEP_SCAN_INACTIVITY_TIMEOUT_MS)
    return this.serialize(() =>
      this.dispatch<ProjectDeepScanPayload>(
        session,
        { type: 'scan-project-deep', data: request },
        (message, settle) => {
          if (message.type === 'project-deep-done') settle.resolve(message.result)
        },
        deepTimeoutMs
      )
    )
  }

  /** All child requests share one reply stream, so they must run one at a time
   * (GH-155 C3). The tail never rejects — each link settles to undefined. */
  private serialize<T>(run: () => Promise<T>): Promise<T> {
    const result = this.tail.then(run)
    this.tail = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  /** One request/reply exchange with the child: registers listeners + the GH-151
   * S2 inactivity watchdog before awaiting spawn, posts `payload`, and lets
   * `handle` route stream messages until it resolves. `error` replies and child
   * exit reject for every request type. A session whose child died while queued
   * is bounded by the watchdog (postMessage to a killed child is a no-op). */
  private dispatch<T>(
    session: { child: UtilityProcess; ready: Promise<void> },
    payload: { type: string; data: unknown },
    handle: (message: ScanHelperChildMessage, settle: { resolve: (value: T) => void }) => void,
    inactivityTimeoutMs: number = this.inactivityTimeoutMs
  ): Promise<T> {
    const { child, ready } = session

    return new Promise<T>((resolve, reject) => {
      let settled = false
      let watchdog: ReturnType<typeof setTimeout> | null = null
      const clearWatchdog = (): void => {
        if (watchdog) clearTimeout(watchdog)
        watchdog = null
      }
      // GH-151 S2: any message resets the window; total silence past it means the
      // child is alive but wedged (hung fs on a dead mount, AV-locked file) — the
      // only failure mode done/error/exit can't cover. Kill so inFlight settles
      // and the pipeline stays recoverable.
      const armWatchdog = (): void => {
        clearWatchdog()
        if (inactivityTimeoutMs <= 0) return
        watchdog = setTimeout(() => {
          if (this.child === child) this.kill()
          else child.kill()
          finish(() =>
            reject(new Error(`Asset scan helper sent no message for ${String(inactivityTimeoutMs)}ms; killed as wedged`))
          )
        }, inactivityTimeoutMs)
      }
      const cleanup = (): void => {
        child.removeListener('message', onMessage)
        child.removeListener('exit', onExit)
        clearWatchdog()
      }
      const finish = (fn: () => void): void => {
        if (settled) return
        settled = true
        cleanup()
        fn()
      }
      const onMessage = (message: ScanHelperChildMessage): void => {
        armWatchdog()
        if (message.type === 'error') {
          finish(() => reject(createHelperError(message.error.message, message.error.stack)))
          return
        }
        handle(message, { resolve: (value) => finish(() => resolve(value)) })
      }
      const onExit = (code: number): void => {
        finish(() => reject(new Error(`Asset scan helper exited with code ${String(code)}`)))
      }

      // Listeners + watchdog are registered BEFORE awaiting spawn so the wait for
      // 'spawn' itself is covered — a child that neither spawns nor exits can no
      // longer pin the scan forever (GH-151 S2).
      child.on('message', onMessage)
      child.on('exit', onExit)
      armWatchdog()
      ready.then(
        () => {
          if (settled) return
          // utilityProcess has no workerData — the scan input rides the first message.
          child.postMessage(payload)
        },
        (error) => finish(() => reject(error instanceof Error ? error : new Error(String(error))))
      )
    })
  }
}

/**
 * AssetRuntimeScanner backed by the long-lived utilityProcess helper (GH-135).
 * Drop-in replacement for the engine's WorkerAssetScanner with the same contract,
 * but the scan runs in a separate Electron utility process. main/index.ts injects
 * this as the runtime's `createScanner`, keeping the engine package electron-free
 * (its WorkerAssetScanner stays for the CLI).
 */
export class HelperAssetScanner implements AssetRuntimeScanner {
  /** 长驻 utilityProcess (GH-154 条目8 能力元数据照实)。 */
  readonly workerMode = 'long-lived' as const
  private sources: AgentScanSourceGroup[] = []
  private projectCandidates: ProjectScopeCandidate[] = []
  private sessionCache: AssetFileCacheSnapshot<Asset> = { entries: [] }
  private projectScanCache: AssetFileCacheSnapshot<Asset[]> = { entries: [] }
  private resolvedProjectDir?: string
  private readonly host: Pick<ScanHelperHost, 'runScan' | 'runProjectDeepScan' | 'kill'>

  constructor(
    private readonly projectDir?: string,
    host?: Pick<ScanHelperHost, 'runScan' | 'runProjectDeepScan' | 'kill'>
  ) {
    this.host = host ?? getScanHelperHost()
    this.resolvedProjectDir = projectDir
  }

  async scanAll(options: AssetRuntimeScanOptions = {}): Promise<ScanResult> {
    const result = await this.host.runScan(
      workerDataFromScanOptions(
        {
          projectDir: this.projectDir,
          sessionCache: this.sessionCache,
          projectScanCache: this.projectScanCache
        },
        options
      ),
      { onProgress: options.onProgress, onPartial: options.onPartial }
    )
    this.sources = result.sources
    this.projectCandidates = result.projectCandidates
    this.sessionCache = result.sessionCache
    this.projectScanCache = result.projectScanCache
    this.resolvedProjectDir = result.projectDir
    return result.scanResult
  }

  async getScanSourceGroups(): Promise<AgentScanSourceGroup[]> {
    return this.sources
  }

  getProjectScopeCandidates(): ProjectScopeCandidate[] {
    return this.projectCandidates
  }

  getProjectDir(): string | undefined {
    return this.resolvedProjectDir
  }

  /** Deep-scan one non-active project in the helper (GH-155 C4). The
   * projectScanCache snapshot round-trips so consecutive deep scans (and the
   * next full scan on this instance) reuse warm fingerprints. */
  async scanProjectDeep(
    projectRoot: string,
    options: { excludePaths?: string[]; respectGitignore?: boolean } = {}
  ): Promise<{ assets: Asset[]; errors: ScanError[] }> {
    const result = await this.host.runProjectDeepScan({
      projectRoot,
      excludePaths: options.excludePaths,
      respectGitignore: options.respectGitignore,
      projectScanCache: this.projectScanCache
    })
    this.projectScanCache = result.projectScanCache
    return { assets: result.assets, errors: result.errors }
  }

  /** Abort the in-flight scan by killing the helper (GH-135). The host respawns it
   * on the next scan; partial assets already streamed are kept by the runtime. */
  cancel(): void {
    this.host.kill()
  }
}

let sharedHost: ScanHelperHost | null = null

/** Process-wide singleton helper (one scan helper per app). */
export function getScanHelperHost(): ScanHelperHost {
  if (!sharedHost) sharedHost = new ScanHelperHost()
  return sharedHost
}

function createHelperError(message: string, stack?: string): Error {
  const error = new Error(message)
  if (stack) error.stack = stack
  return error
}

/**
 * Lower the helper process's OS scheduling priority (GH-135 C2 / GH-8). Node has
 * no IO-priority binding, so shell out to the platform CLI: macOS `taskpolicy -b`
 * (DARWIN_BG = IOPOL_THROTTLE + background CPU), Linux `ionice -c3` (idle I/O) +
 * `renice 19` (lowest CPU), Windows PowerShell `PriorityClass='BelowNormal'`
 * (lowest CPU scheduling). Best-effort: a missing or failing CLI must never
 * block scanning.
 *
 * Windows limitation (GH-8): true `PROCESS_MODE_BACKGROUND_BEGIN` (which also
 * lowers *I/O* priority, the win32 analog of DARWIN_BG / ionice idle) can only be
 * set by a process *on itself* via `SetPriorityClass(GetCurrentProcess(), …)`,
 * which needs a native binding we deliberately do not introduce here. The parent
 * can only set the child's *CPU* PriorityClass from outside, so this path gives
 * CPU throttle but not I/O background — weaker than mac/linux. Closing the I/O
 * gap requires the helper to self-throttle (native addon), tracked in GH-8.
 */
function defaultApplyThrottle(pid: number): void {
  const cmds: Array<[string, string[]]> =
    process.platform === 'darwin'
      ? [['taskpolicy', ['-b', '-p', String(pid)]]]
      : process.platform === 'linux'
        ? [
            ['ionice', ['-c', '3', '-p', String(pid)]],
            ['renice', ['-n', '19', '-p', String(pid)]]
          ]
        : process.platform === 'win32'
          ? [
              [
                'powershell',
                [
                  '-NoProfile',
                  '-NonInteractive',
                  '-Command',
                  `(Get-Process -Id ${String(pid)}).PriorityClass = 'BelowNormal'`
                ]
              ]
            ]
          : []
  for (const [cmd, args] of cmds) {
    execFile(cmd, args, (err) => {
      if (err) getMainLog().log('scan-helper-throttle', err)
    })
  }
}
