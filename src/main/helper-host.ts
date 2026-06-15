import { utilityProcess, type UtilityProcess } from 'electron'
import { execFile } from 'child_process'
import * as path from 'path'
import { getMainLog } from '@berth/scan-engine/log'
import type { Asset } from '@berth/scan-engine/shared/types/asset'
import type { ProjectScopeCandidate } from '@berth/scan-engine/shared/scope'
import type { AgentScanSourceGroup, ScanResult } from '@berth/scan-engine/shared/types/ipc'
import type { AssetRuntimeScanner, AssetRuntimeScanOptions } from '@berth/scan-engine/engine/assets/runtime'
import type { AssetFileCacheSnapshot } from '@berth/scan-engine/engine/assets/file-cache'
import type {
  AssetWorkerData,
  AssetWorkerMessage,
  AssetWorkerScanPayload
} from '@berth/scan-engine/engine/assets/worker-host'

export interface ScanHelperHostOptions {
  helperPath?: string
  createChild?: () => UtilityProcess
  /** Apply OS-level I/O+CPU throttle to the helper pid on spawn (GH-135 C2).
   * Default true; no-op on win32 (no native binding yet). */
  osThrottle?: boolean
  /** Injectable throttle hook (tests). Default runs taskpolicy/ionice via execFile. */
  applyThrottle?: (pid: number) => void
}

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
  private readonly helperPath: string
  private readonly createChild: () => UtilityProcess
  private readonly osThrottle: boolean
  private readonly applyThrottle: (pid: number) => void

  constructor(options: ScanHelperHostOptions = {}) {
    this.helperPath = options.helperPath ?? path.join(__dirname, 'scan-helper.js')
    this.osThrottle = options.osThrottle ?? true
    this.applyThrottle = options.applyThrottle ?? defaultApplyThrottle
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
    this.spawnPromise = new Promise<void>((resolve) => {
      child.once('spawn', () => {
        // GH-135 C2: lower the helper's OS scheduling priority once it has a pid.
        if (this.osThrottle && typeof child.pid === 'number') this.applyThrottle(child.pid)
        resolve()
      })
    })
    child.once('exit', () => {
      // Long-lived child died (crash/kill); drop it so the next scan respawns.
      if (this.child === child) {
        this.child = null
        this.spawnPromise = null
      }
    })
    return { child, ready: this.spawnPromise }
  }

  async runScan(data: AssetWorkerData, options: AssetRuntimeScanOptions = {}): Promise<AssetWorkerScanPayload> {
    const { child, ready } = this.ensure()
    await ready

    return new Promise<AssetWorkerScanPayload>((resolve, reject) => {
      let settled = false
      const cleanup = (): void => {
        child.removeListener('message', onMessage)
        child.removeListener('exit', onExit)
      }
      const finish = (fn: () => void): void => {
        if (settled) return
        settled = true
        cleanup()
        fn()
      }
      const onMessage = (message: AssetWorkerMessage): void => {
        if (message.type === 'progress') {
          options.onProgress?.(message.progress)
          return
        }
        if (message.type === 'partial') {
          options.onPartial?.(message.partial)
          return
        }
        if (message.type === 'done') {
          finish(() => resolve(message.result))
          return
        }
        if (message.type === 'error') {
          finish(() => reject(createHelperError(message.error.message, message.error.stack)))
        }
      }
      const onExit = (code: number): void => {
        finish(() => reject(new Error(`Asset scan helper exited with code ${String(code)}`)))
      }

      child.on('message', onMessage)
      child.on('exit', onExit)
      // utilityProcess has no workerData — the scan input rides the first message.
      child.postMessage({ type: 'scan', data })
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
  private sources: AgentScanSourceGroup[] = []
  private projectCandidates: ProjectScopeCandidate[] = []
  private sessionCache: AssetFileCacheSnapshot<Asset> = { entries: [] }
  private projectScanCache: AssetFileCacheSnapshot<Asset[]> = { entries: [] }
  private resolvedProjectDir?: string
  private readonly host: Pick<ScanHelperHost, 'runScan' | 'kill'>

  constructor(private readonly projectDir?: string, host?: Pick<ScanHelperHost, 'runScan' | 'kill'>) {
    this.host = host ?? getScanHelperHost()
    this.resolvedProjectDir = projectDir
  }

  async scanAll(options: AssetRuntimeScanOptions = {}): Promise<ScanResult> {
    const result = await this.host.runScan(
      {
        projectDir: this.projectDir,
        sessionCache: this.sessionCache,
        projectScanCache: this.projectScanCache
      },
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
 * Lower the helper process's OS scheduling priority (GH-135 C2). Node has no
 * IO-priority binding, so shell out to the platform CLI: macOS `taskpolicy -b`
 * (DARWIN_BG = IOPOL_THROTTLE + background CPU), Linux `ionice -c3` (idle I/O) +
 * `renice 19` (lowest CPU). Best-effort: a missing or failing CLI must never
 * block scanning. win32 has no equivalent without a native binding (future).
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
        : []
  for (const [cmd, args] of cmds) {
    execFile(cmd, args, (err) => {
      if (err) getMainLog().log('scan-helper-throttle', err)
    })
  }
}
