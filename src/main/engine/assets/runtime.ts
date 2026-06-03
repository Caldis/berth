import type { AssetStats } from '@shared/types/asset'
import type {
  AgentScanSourceGroup,
  AssetRuntimeStatus,
  AssetScanReason,
  AssetSnapshot,
  ScanResult
} from '@shared/types/ipc'
import type { ProjectScopeCandidate } from '@shared/scope'
import { AssetScanner } from '../scanner'

export interface AssetRuntimeScanner {
  scanAll(): Promise<ScanResult>
  getScanSourceGroups(): Promise<AgentScanSourceGroup[]>
  getProjectScopeCandidates(): ProjectScopeCandidate[]
  getProjectDir(): string | undefined
}

export interface AssetRefreshOptions {
  reason?: AssetScanReason
  wait?: boolean
}

export interface AssetRuntimeOptions {
  projectDir?: string
  createScanner?: (projectDir?: string) => AssetRuntimeScanner
  now?: () => string
  createSnapshotId?: () => string
}

export interface AssetSelectorCache {
  select<T>(key: string, snapshot: AssetSnapshot, derive: (snapshot: AssetSnapshot) => T): T
  clear(): void
}

const EMPTY_ASSET_STATS: AssetStats = {
  skills: 0,
  mcpServers: 0,
  sessions: 0,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0,
  teams: 0
}

class SnapshotSelectorCache implements AssetSelectorCache {
  private readonly values = new Map<string, { snapshotId: string; value: unknown }>()

  select<T>(key: string, snapshot: AssetSnapshot, derive: (snapshot: AssetSnapshot) => T): T {
    const cached = this.values.get(key)
    if (cached?.snapshotId === snapshot.id) return cached.value as T

    const value = derive(snapshot)
    this.values.set(key, { snapshotId: snapshot.id, value })
    return value
  }

  clear(): void {
    this.values.clear()
  }
}

export class AgentAssetRuntime {
  private projectDir?: string
  private scanner: AssetRuntimeScanner
  private snapshot: AssetSnapshot
  private status: AssetRuntimeStatus
  private inFlight: Promise<void> | null = null
  private readonly selectorCache: AssetSelectorCache
  private readonly createScanner: (projectDir?: string) => AssetRuntimeScanner
  private readonly now: () => string
  private readonly createSnapshotId: () => string

  constructor(options: AssetRuntimeOptions = {}) {
    this.projectDir = options.projectDir
    this.createScanner = options.createScanner ?? ((projectDir) => new AssetScanner(projectDir))
    this.now = options.now ?? (() => new Date().toISOString())
    this.createSnapshotId = options.createSnapshotId ?? createDefaultSnapshotId
    this.scanner = this.createScanner(this.projectDir)
    this.selectorCache = new SnapshotSelectorCache()
    this.status = this.createIdleStatus()
    this.snapshot = this.createInitialSnapshot()
  }

  getStatus(): AssetRuntimeStatus {
    return this.status
  }

  getSnapshot(): AssetSnapshot {
    return this.snapshot
  }

  getProjectDir(): string | undefined {
    return this.projectDir
  }

  setProjectDir(projectDir?: string): void {
    if (this.projectDir === projectDir) return

    this.projectDir = projectDir
    this.scanner = this.createScanner(projectDir)
    this.selectorCache.clear()
    this.status = this.snapshot.id === 'initial'
      ? this.createIdleStatus()
      : {
          ...this.status,
          state: 'stale',
          projectDir,
          stale: true
        }
    this.snapshot = {
      ...this.snapshot,
      projectDir,
      status: this.status
    }
  }

  async refresh(options: AssetRefreshOptions = {}): Promise<AssetRuntimeStatus> {
    if (this.inFlight) {
      if (options.wait) await this.inFlight
      return this.status
    }

    const reason = options.reason ?? 'manual'
    this.status = {
      state: 'scanning',
      reason,
      projectDir: this.projectDir,
      startedAt: this.now(),
      lastCompletedAt: this.status.lastCompletedAt,
      stale: this.snapshot.id !== 'initial'
    }
    this.snapshot = {
      ...this.snapshot,
      status: this.status
    }

    this.inFlight = this.runRefresh(reason)
    if (options.wait) await this.inFlight
    return this.status
  }

  select<T>(key: string, derive: (snapshot: AssetSnapshot) => T): T {
    return this.selectorCache.select(key, this.snapshot, derive)
  }

  private async runRefresh(reason: AssetScanReason): Promise<void> {
    try {
      const scanResult = await this.scanner.scanAll()
      const sources = await this.scanner.getScanSourceGroups()
      const projectCandidates = this.scanner.getProjectScopeCandidates()
      const projectDir = this.scanner.getProjectDir() ?? this.projectDir
      const status: AssetRuntimeStatus = {
        state: 'ready',
        reason,
        projectDir,
        startedAt: this.status.startedAt,
        lastCompletedAt: this.now(),
        stale: false
      }

      this.projectDir = projectDir
      this.status = status
      this.snapshot = {
        id: this.createSnapshotId(),
        projectDir,
        assets: scanResult.assets,
        stats: scanResult.stats,
        errors: scanResult.errors,
        sources,
        projectCandidates,
        status
      }
    } catch (error) {
      this.status = {
        state: 'error',
        reason,
        projectDir: this.projectDir,
        startedAt: this.status.startedAt,
        lastCompletedAt: this.status.lastCompletedAt,
        stale: this.snapshot.id !== 'initial',
        error: error instanceof Error ? error.message : String(error)
      }
      this.snapshot = {
        ...this.snapshot,
        status: this.status
      }
    } finally {
      this.inFlight = null
    }
  }

  private createIdleStatus(): AssetRuntimeStatus {
    return {
      state: 'idle',
      stale: false,
      projectDir: this.projectDir
    }
  }

  private createInitialSnapshot(): AssetSnapshot {
    return {
      id: 'initial',
      projectDir: this.projectDir,
      assets: [],
      stats: EMPTY_ASSET_STATS,
      errors: [],
      sources: [],
      projectCandidates: [],
      status: this.status
    }
  }
}

let runtimeInstance: AgentAssetRuntime | null = null

export function getAssetRuntime(): AgentAssetRuntime {
  if (!runtimeInstance) {
    runtimeInstance = new AgentAssetRuntime({ projectDir: process.cwd() })
  }
  return runtimeInstance
}

export function initAssetRuntime(projectDir?: string): AgentAssetRuntime {
  runtimeInstance = new AgentAssetRuntime({ projectDir })
  return runtimeInstance
}

function createDefaultSnapshotId(): string {
  return `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
