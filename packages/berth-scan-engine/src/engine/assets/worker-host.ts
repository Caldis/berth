import * as path from 'path'
import { Worker } from 'worker_threads'
import type { ProjectScopeCandidate } from '@shared/scope'
import type { Asset } from '@shared/types/asset'
import type {
  AgentScanSourceGroup,
  AssetScanPartial,
  AssetScanProgress,
  ScanResult
} from '@shared/types/ipc'
import type { AssetFileCacheSnapshot } from './file-cache'
import type { AssetRuntimeScanOptions, AssetRuntimeScanner } from './runtime'

export interface AssetWorkerData {
  projectDir?: string
  sessionCache?: AssetFileCacheSnapshot<Asset>
  projectScanCache?: AssetFileCacheSnapshot<Asset[]>
  /** Backpressure passed through to the scanner (GH-135 B4). */
  batchPauseMs?: number
  excludePaths?: string[]
  /** Respect project .gitignore/.berthignore during enumeration (GH-142). */
  respectGitignore?: boolean
}

export interface AssetWorkerScanPayload {
  projectDir?: string
  scanResult: ScanResult
  sources: AgentScanSourceGroup[]
  projectCandidates: ProjectScopeCandidate[]
  sessionCache: AssetFileCacheSnapshot<Asset>
  projectScanCache: AssetFileCacheSnapshot<Asset[]>
}

export type AssetWorkerMessage =
  | { type: 'progress'; progress: AssetScanProgress }
  | { type: 'partial'; partial: AssetScanPartial }
  | { type: 'done'; result: AssetWorkerScanPayload }
  | { type: 'error'; error: { message: string; stack?: string } }

/** Scan-relevant option passthrough, single-sourced (GH-151 S1). Both scanner
 * wrappers (worker + helper) assemble their boundary payload here and both child
 * entries (worker.ts + scan-helper.ts) unpack with the inverse below, so a new
 * scan option reaches every chain — a field can no longer be silently dropped on
 * one leg (the respectGitignore production bug). */
export function workerDataFromScanOptions(
  base: Omit<AssetWorkerData, 'batchPauseMs' | 'excludePaths' | 'respectGitignore'>,
  options: AssetRuntimeScanOptions
): AssetWorkerData {
  return {
    ...base,
    batchPauseMs: options.batchPauseMs,
    excludePaths: options.excludePaths,
    respectGitignore: options.respectGitignore
  }
}

/** Inverse of {@link workerDataFromScanOptions}: unpack the boundary payload back
 * into `AssetScanner.scanAll` options at the child entry. */
export function scanOptionsFromWorkerData(
  data: AssetWorkerData,
  callbacks: Pick<AssetRuntimeScanOptions, 'onProgress' | 'onPartial'>
): AssetRuntimeScanOptions {
  return {
    onProgress: callbacks.onProgress,
    onPartial: callbacks.onPartial,
    batchPauseMs: data.batchPauseMs,
    excludePaths: data.excludePaths,
    respectGitignore: data.respectGitignore
  }
}

export interface WorkerLike {
  on(event: string, listener: (...args: unknown[]) => void): WorkerLike
  once(event: string, listener: (...args: unknown[]) => void): WorkerLike
}

export interface AssetWorkerHostOptions {
  workerPath?: string
  createWorker?: (workerData: AssetWorkerData) => WorkerLike
}

export interface AssetWorkerRunOptions {
  onProgress?: (progress: AssetScanProgress) => void
  onPartial?: (partial: AssetScanPartial) => void
}

export class AssetWorkerHost {
  private readonly workerPath: string
  private readonly createWorker: (workerData: AssetWorkerData) => WorkerLike

  constructor(options: AssetWorkerHostOptions = {}) {
    this.workerPath = options.workerPath ?? resolveAssetWorkerPath()
    this.createWorker = options.createWorker ?? ((workerData) => new Worker(this.workerPath, { workerData }))
  }

  runScan(workerData: AssetWorkerData, options: AssetWorkerRunOptions = {}): Promise<AssetWorkerScanPayload> {
    const worker = this.createWorker(workerData)

    return new Promise<AssetWorkerScanPayload>((resolve, reject) => {
      let settled = false
      const finish = (fn: () => void): void => {
        if (settled) return
        settled = true
        fn()
      }

      worker.on('message', (message) => {
        const workerMessage = message as AssetWorkerMessage
        if (workerMessage.type === 'progress') {
          options.onProgress?.(workerMessage.progress)
          return
        }
        if (workerMessage.type === 'partial') {
          options.onPartial?.(workerMessage.partial)
          return
        }
        if (workerMessage.type === 'done') {
          finish(() => resolve(workerMessage.result))
          return
        }
        if (workerMessage.type === 'error') {
          finish(() => reject(createWorkerError(workerMessage.error.message, workerMessage.error.stack)))
        }
      })

      worker.once('error', (error) => {
        finish(() => reject(error instanceof Error ? error : new Error(String(error))))
      })

      worker.once('exit', (code) => {
        if (settled || code === 0) return
        finish(() => reject(new Error(`Asset scan worker exited with code ${String(code)}`)))
      })
    })
  }
}

export interface WorkerAssetScannerOptions {
  host?: Pick<AssetWorkerHost, 'runScan'>
}

export class WorkerAssetScanner implements AssetRuntimeScanner {
  private sources: AgentScanSourceGroup[] = []
  private projectCandidates: ProjectScopeCandidate[] = []
  private sessionCache: AssetFileCacheSnapshot<Asset> = { entries: [] }
  private projectScanCache: AssetFileCacheSnapshot<Asset[]> = { entries: [] }
  private resolvedProjectDir?: string
  private readonly host: Pick<AssetWorkerHost, 'runScan'>

  constructor(
    private readonly projectDir?: string,
    options: WorkerAssetScannerOptions = {}
  ) {
    this.host = options.host ?? new AssetWorkerHost()
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
      {
        onProgress: options.onProgress,
        onPartial: options.onPartial
      }
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
}

export function resolveAssetWorkerPath(): string {
  return path.join(__dirname, 'asset-worker.js')
}

function createWorkerError(message: string, stack?: string): Error {
  const error = new Error(message)
  if (stack) error.stack = stack
  return error
}
