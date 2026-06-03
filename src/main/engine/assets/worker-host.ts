import * as path from 'path'
import { Worker } from 'worker_threads'
import type { ProjectScopeCandidate } from '@shared/scope'
import type {
  AgentScanSourceGroup,
  AssetScanProgress,
  ScanResult
} from '@shared/types/ipc'
import type { AssetRuntimeScanOptions, AssetRuntimeScanner } from './runtime'

export interface AssetWorkerData {
  projectDir?: string
}

export interface AssetWorkerScanPayload {
  projectDir?: string
  scanResult: ScanResult
  sources: AgentScanSourceGroup[]
  projectCandidates: ProjectScopeCandidate[]
}

export type AssetWorkerMessage =
  | { type: 'progress'; progress: AssetScanProgress }
  | { type: 'done'; result: AssetWorkerScanPayload }
  | { type: 'error'; error: { message: string; stack?: string } }

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
    const result = await this.host.runScan({ projectDir: this.projectDir }, {
      onProgress: options.onProgress
    })
    this.sources = result.sources
    this.projectCandidates = result.projectCandidates
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
