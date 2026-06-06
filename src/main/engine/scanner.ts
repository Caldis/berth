import * as fs from 'fs'
import * as path from 'path'
import type { AgentAdapter, Asset, AssetCategory, AssetStats } from '@shared/types/asset'
import type { ScanRoot } from '@shared/types/asset'
import type { AgentScanSourceGroup, AssetScanPartial, AssetScanProgress, ScanResult } from '@shared/types/ipc'
import type { ProjectScopeCandidate } from '@shared/scope'
import { createAgentAdapters, type AgentAdapterRegistryOptions } from '../agent-plugins/adapter-registry'
import { projectScopeCandidatesFromAssets } from '../project-scope'
import { AssetFileCache, type AssetFileCacheSnapshot } from './assets/file-cache'

interface HookEquivalentSource {
  id: string
  agentId: string
  scope: Asset['scope']
  name: string
  path: string
  enabled: boolean
  managed: boolean
}

interface AssetScannerOptions {
  sessionCache?: AssetFileCache<Asset>
  adapterRegistry?: Omit<AgentAdapterRegistryOptions, 'sessionCache'>
}

/**
 * Streaming hooks for a full scan (GH-110 P4.6). `onProgress` fires once per
 * adapter boundary; `onPartial` carries the cumulative assets scanned so far so
 * the UI can render already-discovered items before the scan completes. Both are
 * optional — a scan without them behaves exactly as before.
 */
export interface AssetScanStreamOptions {
  onProgress?: (progress: AssetScanProgress) => void
  onPartial?: (partial: AssetScanPartial) => void
}

export class AssetScanner {
  private adapters: AgentAdapter[]
  private cachedAssets: Asset[] = []
  private cachedErrors: ScanResult['errors'] = []
  private assetMap = new Map<string, Asset>()
  private scanned = false
  private scanPromise: Promise<ScanResult> | null = null
  private readonly projectDir?: string
  private readonly sessionCache: AssetFileCache<Asset>

  constructor(projectDir?: string, options: AssetScannerOptions = {}) {
    this.projectDir = projectDir
    this.sessionCache = options.sessionCache ?? new AssetFileCache<Asset>()
    this.adapters = createAgentAdapters(projectDir, {
      ...options.adapterRegistry,
      sessionCache: this.sessionCache
    })
  }

  async scanAll(options: AssetScanStreamOptions = {}): Promise<ScanResult> {
    if (this.scanPromise) return this.scanPromise

    this.scanPromise = this.runScanAll(options)
    try {
      return await this.scanPromise
    } finally {
      this.scanPromise = null
    }
  }

  private async runScanAll(options: AssetScanStreamOptions): Promise<ScanResult> {
    const assets: Asset[] = []
    const errors: ScanResult['errors'] = []
    const total = this.adapters.length
    // Emit per-adapter progress + a cumulative partial after each adapter so the
    // UI can render already-scanned assets mid-scan (per-category counts are
    // derived downstream from these cumulative assets — see P4.6).
    options.onProgress?.({ phase: 'parsing', current: 0, total })
    let index = 0
    for (const adapter of this.adapters) {
      options.onProgress?.({ phase: 'parsing', current: index, total, label: adapter.displayName })
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
      index += 1
      options.onProgress?.({ phase: 'parsing', current: index, total, label: adapter.displayName })
      options.onPartial?.({ assets: [...assets], stats: this.computeStats(assets) })
    }
    annotateEquivalentHookSources(assets)
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

  getProjectScopeCandidates(): ProjectScopeCandidate[] {
    return projectScopeCandidatesFromAssets(this.cachedAssets, this.projectDir)
  }

  getSessionCacheSnapshot(): AssetFileCacheSnapshot<Asset> {
    return this.sessionCache.toSnapshot()
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
        const sources = adapter.scanSourceCoverage
          ? await adapter.scanSourceCoverage()
          : result.paths
        const sourceCoverage = this.withProjectSourceCandidates(adapter.id, sources)
        groups.push({
          agentId: adapter.id,
          agentName: adapter.displayName,
          installed: result.installed,
          version: result.version,
          roots: result.paths,
          sources: sourceCoverage
        })
      } catch {
        groups.push({
          agentId: adapter.id,
          agentName: adapter.displayName,
          installed: false,
          roots: [],
          sources: []
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
      subagents: assets.filter((a) => a.type === 'agent').length
    }
  }

  private withProjectSourceCandidates(
    agentId: string,
    sources: ScanRoot[]
  ): ScanRoot[] {
    const projectPaths = this.getProjectCandidatePaths(agentId)
    if (projectPaths.length === 0) return sources

    const nextSources = [...sources]
    for (const projectPath of projectPaths) {
      if (sourceListContainsProject(nextSources, projectPath)) continue
      const isCurrentProject = samePath(projectPath, this.projectDir)
      const projectExists = fs.existsSync(projectPath)
      nextSources.push({
        path: projectPath,
        scope: 'project',
        code: isCurrentProject ? 'project.current-candidate' : 'project.session-derived-candidate',
        categories: ['instruction', 'capability'],
        kind: 'directory',
        status: isCurrentProject ? 'missing' : projectExists ? 'not-scanned' : 'missing',
        reason: isCurrentProject ? 'current-project' : 'session-derived-project'
      })
    }
    return nextSources
  }

  private getProjectCandidatePaths(agentId: string): string[] {
    const projectPaths = new Set<string>()
    if (this.projectDir) projectPaths.add(this.projectDir)

    for (const asset of this.cachedAssets) {
      if (asset.type !== 'session' || asset.agentId !== agentId) continue
      const projectPath = readString(asset.meta, 'projectPath')
      if (projectPath) projectPaths.add(projectPath)
    }

    return [...projectPaths].filter((projectPath) => projectPath.trim().length > 0)
  }
}

function sourceListContainsProject(sources: ScanRoot[], projectPath: string): boolean {
  return sources.some((source) => {
    if (source.scope !== 'project') return false
    return samePath(source.path, projectPath) || isPathInside(source.path, projectPath)
  })
}

function isPathInside(candidate: string, parent: string): boolean {
  const normalizedCandidate = normalizePath(candidate)
  const normalizedParent = normalizePath(parent)
  return normalizedCandidate.startsWith(`${normalizedParent}${path.sep}`)
}

function samePath(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  return normalizePath(a) === normalizePath(b)
}

function normalizePath(filePath: string): string {
  const resolved = path.resolve(filePath)
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved
}

function annotateEquivalentHookSources(assets: Asset[]): void {
  const groups = new Map<string, Asset[]>()
  for (const asset of assets) {
    if (asset.type !== 'hook') continue
    const scenarioHash = readString(asset.meta, 'scenarioHash')
    const hookHash = readString(asset.meta, 'hookHash')
    if (!scenarioHash || !hookHash) continue

    const groupKey = `${asset.agentId}:${scenarioHash}:${hookHash}`
    const group = groups.get(groupKey) ?? []
    group.push(asset)
    groups.set(groupKey, group)
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue
    const sources = group.map(toHookEquivalentSource)
    const effectiveEnabled = sources.some((source) => source.enabled)

    for (const asset of group) {
      asset.meta = {
        ...asset.meta,
        equivalentSources: sources,
        equivalentSourceCount: sources.length,
        effectiveEnabled
      }
    }
  }
}

function toHookEquivalentSource(asset: Asset): HookEquivalentSource {
  return {
    id: asset.id,
    agentId: asset.agentId,
    scope: asset.scope,
    name: asset.name,
    path: asset.path,
    enabled: asset.meta.enabled !== false && asset.meta.disabledByBerth !== true,
    managed: asset.meta.managed === true
  }
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
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
