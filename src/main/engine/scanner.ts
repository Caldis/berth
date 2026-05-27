import type { Asset, AssetCategory, AssetStats } from '@shared/types/asset'
import type { ScanResult } from '@shared/types/ipc'
import { ClaudeCodeAdapter } from '../adapters/claude-code'

export class AssetScanner {
  private adapter: ClaudeCodeAdapter
  private cachedAssets: Asset[] = []
  private assetMap = new Map<string, Asset>()

  constructor(projectDir?: string) {
    this.adapter = new ClaudeCodeAdapter(projectDir)
  }

  async scanAll(): Promise<ScanResult> {
    const { assets, errors } = await this.adapter.scanAll()
    this.cachedAssets = assets
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
    return this.adapter.scanAssets(category)
  }

  getAsset(id: string): Asset | null {
    return this.assetMap.get(id) ?? null
  }

  getAllAssets(): Asset[] {
    return this.cachedAssets
  }

  getAdapter(): ClaudeCodeAdapter {
    return this.adapter
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
