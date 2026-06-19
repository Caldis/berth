import * as fs from 'fs'
import { getMainLog } from '../log'
import type { AgentAdapter, Asset, AssetStats } from '@shared/types/asset'
import type { ScanRoot } from '@shared/types/asset'
import { isPathInside, samePath } from '@shared/path-utils'
import type { AgentScanSourceGroup, AssetScanPartial, AssetScanProgress, ScanResult } from '@shared/types/ipc'
import type { ProjectScopeCandidate } from '@shared/scope'
import { normalizeProjectPathKey } from '@shared/scope'
import { createAgentAdapters, type AgentAdapterRegistryOptions } from '../agent-plugins/adapter-registry'
import { projectScopeCandidatesFromAssets } from '../project-scope'
import { resolveProjectConfigRoots } from '../project-config-roots'
import { AssetFileCache, type AssetFileCacheSnapshot } from './assets/file-cache'
import { scanProjectCapabilities, scanShallowConventions } from './shallow-conventions'

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
  /** Fingerprint cache for background-project capability files — skips re-parsing
   * unchanged configs across scans so indexing many projects stays cheap. (GH-113) */
  projectScanCache?: AssetFileCache<Asset[]>
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
  /** Inter-adapter throttle (GH-135 B4): await this many ms between adapters so the
   * helper yields CPU/IO between batches. 0/undefined = no pause. */
  batchPauseMs?: number
  /** Paths to exclude from the result (GH-135 B4): any asset whose path is inside
   * one of these is dropped. */
  excludePaths?: string[]
  /** Respect project .gitignore/.berthignore during project-tree enumeration
   * (GH-142): nested-convention recursion skips ignored subtrees. */
  respectGitignore?: boolean
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
  private readonly projectScanCache: AssetFileCache<Asset[]>

  constructor(projectDir?: string, options: AssetScannerOptions = {}) {
    this.projectDir = projectDir
    this.sessionCache = options.sessionCache ?? new AssetFileCache<Asset>()
    this.projectScanCache = options.projectScanCache ?? new AssetFileCache<Asset[]>()
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
      // Strip `raw` from partials — the live UI only needs names/counts, and the
      // large transcript/markdown bodies blow up structured-clone cost. (GH-111 P1)
      // Carry the running error count so mid-scan failures are visible. (O4)
      // Merge cross-agent shared conventions (AGENTS.md) on the partial too, so a
      // mid-scan snapshot never shows a transient double row. (GH-113 T1)
      const partialAssets = mergeSharedConventions(assets)
      options.onPartial?.({
        assets: partialAssets.map(stripAssetRaw),
        stats: this.computeStats(partialAssets),
        errorCount: errors.length
      })
      // GH-135 B4: yield CPU/IO between adapters (application-level backpressure).
      if (options.batchPauseMs && options.batchPauseMs > 0 && index < total) {
        await sleep(options.batchPauseMs)
      }
    }
    // Shallow-index other session-derived projects' root conventions so the global
    // scope shows every project's AGENTS.md/CLAUDE.md (GH-113 T3b). Done after the
    // deep adapters (partials above stay deep-only for fast first paint), before
    // the merge so cross-agent shared shallow files collapse too.
    const withShallow = this.appendShallowConventions(assets)
    // Collapse cross-agent shared conventions BEFORE annotation/cache/stats so the
    // single canonical id flows into relations, search, and the renderer. (GH-113 T1)
    const merged = filterExcludedPaths(mergeSharedConventions(withShallow), options.excludePaths)
    annotateEquivalentHookSources(merged)
    this.cachedAssets = merged
    this.cachedErrors = errors
    this.scanned = true
    this.assetMap.clear()
    for (const a of merged) {
      this.assetMap.set(a.id, a)
    }
    return {
      assets: merged,
      stats: this.computeStats(merged),
      errors
    }
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

  getProjectScanCacheSnapshot(): AssetFileCacheSnapshot<Asset[]> {
    return this.projectScanCache.toSnapshot()
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
      } catch (err) {
        // GH-115 T6: detect 异常 ≠ 未安装, 至少留痕 (renderer 级区分随 adapter 契约扩展)。
        getMainLog().log('scan-sources-detect', err)
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

  /**
   * Append shallow-indexed root conventions for every session-derived project
   * EXCEPT the active one (which the deep scan already covers in full). Each
   * shallow asset carries `meta.projectPath` so scope filtering attributes it to
   * its owner — global shows all, project mode shows only the active project.
   *
   * Candidates are resolved to their repository config ROOT so a session whose
   * cwd is a monorepo subdir still surfaces the repo-level conventions, and so a
   * repo with many sessions is shallow-scanned once.
   */
  private appendShallowConventions(assets: Asset[]): Asset[] {
    const activeRootKey = resolvedRootKey(this.projectDir)
    const seen = new Set<string>()
    const shallow: Asset[] = []
    for (const candidate of projectScopeCandidatesFromAssets(assets, this.projectDir)) {
      const root = resolveProjectConfigRoots(candidate.path)[0] ?? candidate.path
      const rootKey = normalizeProjectPathKey(root)
      if (!rootKey || rootKey === activeRootKey || seen.has(rootKey)) continue
      seen.add(rootKey)
      if (!fs.existsSync(root)) continue
      shallow.push(
        ...scanShallowConventions(root, this.projectScanCache),
        ...scanProjectCapabilities(root, this.projectScanCache)
      )
    }
    return shallow.length > 0 ? [...assets, ...shallow] : assets
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

/** Normalized key of a directory's repository config root (repo root when a
 * `.git` is found, else the directory itself). Empty for no directory. */
function resolvedRootKey(dir?: string): string {
  if (!dir) return ''
  return normalizeProjectPathKey(resolveProjectConfigRoots(dir)[0] ?? dir)
}

function sourceListContainsProject(sources: ScanRoot[], projectPath: string): boolean {
  return sources.some((source) => {
    if (source.scope !== 'project') return false
    return isPathInside(source.path, projectPath, { includeEqual: true })
  })
}

/** Drop the heavy `raw` body for partial streaming; identity-preserving when
 * there is no raw to strip so unchanged assets aren't needlessly re-cloned. */
function stripAssetRaw(asset: Asset): Asset {
  return asset.raw === undefined ? asset : { ...asset, raw: undefined }
}

/**
 * Collapse cross-agent shared files into one canonical asset. AGENTS.md uses an
 * explicit `meta.dedupeKey` because each adapter historically used a different
 * asset type/id. Other shared files, such as project skill files under
 * `.agents/skills`, now use the same deterministic id across adapters and are
 * grouped by `id`.
 *
 * The canonical row keeps a stable primary id (claude-code preferred for
 * conventions, otherwise first reader) and unions `readByAgentIds` so the file
 * stays visible under every agent view. Pure (does not mutate the input) and
 * idempotent (safe to run on already-merged input, which is why the partial
 * stream and the final result can both call it).
 */
export function mergeSharedConventions(assets: Asset[]): Asset[] {
  const groups = new Map<string, Asset[]>()
  for (const asset of assets) {
    const dedupeKey = readString(asset.meta, 'dedupeKey')
    const groupKey = dedupeKey ? `dedupe:${dedupeKey}` : `id:${asset.id}`
    const list = groups.get(groupKey) ?? []
    list.push(asset)
    groups.set(groupKey, list)
  }
  if (groups.size === 0) return assets

  const emitted = new Set<string>()
  const result: Asset[] = []
  for (const asset of assets) {
    const dedupeKey = readString(asset.meta, 'dedupeKey')
    const groupKey = dedupeKey ? `dedupe:${dedupeKey}` : `id:${asset.id}`
    if (emitted.has(groupKey)) continue
    emitted.add(groupKey)
    result.push(mergeConventionGroup(groups.get(groupKey) ?? [asset]))
  }
  return result
}

function mergeConventionGroup(group: Asset[]): Asset {
  if (group.length === 1) return group[0]
  const primary = group.find((asset) => asset.agentId === 'claude-code') ?? group[0]
  const readByAgentIds: string[] = []
  for (const asset of group) {
    const readers = Array.isArray(asset.meta.readByAgentIds)
      ? asset.meta.readByAgentIds.filter((value): value is string => typeof value === 'string')
      : [asset.agentId]
    for (const reader of readers) {
      if (!readByAgentIds.includes(reader)) readByAgentIds.push(reader)
    }
  }
  return { ...primary, meta: { ...primary.meta, readByAgentIds } }
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

/** GH-135 B4: application-level inter-adapter pause (helper has no OS-level IO
 * throttle on win; even where it does, this caps total throughput). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** GH-135 B4: drop assets whose path is inside any user-excluded path. */
export function filterExcludedPaths(assets: Asset[], excludePaths?: string[]): Asset[] {
  if (!excludePaths || excludePaths.length === 0) return assets
  return assets.filter((asset) => !excludePaths.some((ex) => isPathInside(asset.path, ex, { includeEqual: true })))
}

