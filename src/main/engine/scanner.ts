import type { AgentAdapter, Asset, AssetCategory, AssetStats } from '@shared/types/asset'
import type { AgentScanSourceGroup, ScanResult } from '@shared/types/ipc'
import { ClaudeCodeAdapter } from '../adapters/claude-code'
import { CodexAdapter } from '../adapters/codex'

export class AssetScanner {
  private adapters: AgentAdapter[]
  private cachedAssets: Asset[] = []
  private cachedErrors: ScanResult['errors'] = []
  private assetMap = new Map<string, Asset>()
  private scanned = false
  private scanPromise: Promise<ScanResult> | null = null
  private readonly projectDir?: string

  constructor(projectDir?: string) {
    this.projectDir = projectDir
    this.adapters = [new ClaudeCodeAdapter(projectDir), new CodexAdapter(projectDir)]
  }

  async scanAll(): Promise<ScanResult> {
    if (this.scanPromise) return this.scanPromise

    this.scanPromise = this.runScanAll()
    try {
      return await this.scanPromise
    } finally {
      this.scanPromise = null
    }
  }

  private async runScanAll(): Promise<ScanResult> {
    const assets: Asset[] = []
    const errors: ScanResult['errors'] = []
    for (const adapter of this.adapters) {
      try {
        const result = await adapter.scanAll()
        assets.push(...result.assets)
        errors.push(...result.errors)
      } catch (err) {
        errors.push({
          path: adapter.id,
          type: 'adapter',
          message: err instanceof Error ? err.message : String(err)
        })
      }
    }
    this.cachedAssets = assets
    this.cachedErrors = errors
    this.scanned = true
    this.assetMap.clear()
    for (const a of assets) {
      this.assetMap.set(a.id, a)
    }
    return {
      assets,
      stats: this.computeStats(assets),
      errors
    }
  }

  async scanCategory(category: AssetCategory): Promise<Asset[]> {
    const assets: Asset[] = []
    for (const adapter of this.adapters) {
      assets.push(...(await adapter.scanAssets(category)))
    }
    return assets
  }

  getAsset(id: string): Asset | null {
    return this.assetMap.get(id) ?? null
  }

  getAllAssets(): Asset[] {
    return this.cachedAssets
  }

  getScanErrors(): ScanResult['errors'] {
    return this.cachedErrors
  }

  getProjectDir(): string | undefined {
    return this.projectDir
  }

  hasScanned(): boolean {
    return this.scanned
  }

  getAdapters(): AgentAdapter[] {
    return this.adapters
  }

  async getScanSourceGroups(): Promise<AgentScanSourceGroup[]> {
    const groups: AgentScanSourceGroup[] = []
    for (const adapter of this.adapters) {
      try {
        const result = await adapter.detect()
        groups.push({
          agentId: adapter.id,
          agentName: adapter.displayName,
          installed: result.installed,
          roots: result.paths
        })
      } catch {
        groups.push({
          agentId: adapter.id,
          agentName: adapter.displayName,
          installed: false,
          roots: []
        })
      }
    }
    return groups
  }

  updateAsset(asset: Asset): void {
    const idx = this.cachedAssets.findIndex((a) => a.id === asset.id)
    if (idx >= 0) {
      this.cachedAssets[idx] = asset
    } else {
      this.cachedAssets.push(asset)
    }
    this.assetMap.set(asset.id, asset)
  }

  removeAsset(id: string): void {
    this.cachedAssets = this.cachedAssets.filter((a) => a.id !== id)
    this.assetMap.delete(id)
  }

  private computeStats(assets: Asset[]): AssetStats {
    return {
      skills: assets.filter((a) => a.type === 'skill').length,
      mcpServers: assets.filter((a) => a.type === 'mcp-server').length,
      sessions: assets.filter((a) => a.type === 'session').length,
      plugins: assets.filter((a) => a.type === 'plugin').length,
      hooks: assets.filter((a) => a.type === 'hook').length,
      commands: assets.filter((a) => a.type === 'command').length,
      subagents: assets.filter((a) => a.type === 'agent').length,
      teams: assets.filter((a) => a.type === 'team').length
    }
  }
}

let _scannerInstance: AssetScanner | null = null

export function getScanner(): AssetScanner {
  if (!_scannerInstance) {
    _scannerInstance = new AssetScanner(process.cwd())
  }
  return _scannerInstance
}

export function initScanner(projectDir?: string): AssetScanner {
  _scannerInstance = new AssetScanner(projectDir)
  return _scannerInstance
}
