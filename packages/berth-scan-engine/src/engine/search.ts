import MiniSearch from 'minisearch'
import type { Asset } from '@shared/types/asset'
import type { SearchResult } from '@shared/types/ipc'

interface SearchDoc {
  id: string
  name: string
  type: string
  scope: string
  category: string
  path: string
  agentId: string
  summary: string
  metadata: string
}

export class AssetSearch {
  private index: MiniSearch<SearchDoc>
  // Dirty key = the asset ARRAY REFERENCE (GH-152 T2). The runtime rebuilds
  // `snapshot.assets` immutably on every content change (commit, partial fold,
  // applyFileChange — the latter two under a STABLE snapshot id, so snapshot.id
  // would miss them), which makes same-ref ⟺ same-content an O(1) check. The
  // previous content signature walked every asset's meta per new query —
  // O(all-text) per keystroke — just to conclude "unchanged".
  private indexedAssets: Asset[] | null = null

  constructor() {
    this.index = new MiniSearch<SearchDoc>({
      fields: ['name', 'type', 'scope', 'category', 'path', 'agentId', 'summary', 'metadata'],
      storeFields: ['name', 'type', 'scope', 'category', 'path', 'agentId', 'summary', 'metadata'],
      searchOptions: {
        boost: { name: 4, type: 2, summary: 3, metadata: 2, agentId: 2 },
        fuzzy: 0.2,
        prefix: true
      }
    })
  }

  buildIndex(assets: Asset[]): void {
    this.buildIndexFromDocs(buildSearchDocs(assets))
    this.indexedAssets = assets
  }

  ensureIndexed(assets: Asset[]): void {
    if (this.indexedAssets === assets) return
    this.buildIndexFromDocs(buildSearchDocs(assets))
    this.indexedAssets = assets
  }

  private buildIndexFromDocs(docs: SearchDoc[]): void {
    this.index.removeAll()
    this.index.addAll(docs)
  }

  search(query: string, assets: Asset[]): SearchResult[] {
    if (!query.trim()) return []
    this.ensureIndexed(assets)
    const assetMap = new Map(assets.map((a) => [a.id, a]))
    const results = this.index.search(query)
    const searchResults: SearchResult[] = []
    for (const r of results) {
      const asset = assetMap.get(r.id)
      if (!asset) continue
      const matches = toSearchMatches(r.match)
      searchResults.push({
        id: r.id,
        asset,
        score: r.score,
        matches
      })
    }
    return searchResults.slice(0, 20)
  }

  addAsset(asset: Asset): void {
    // Remove first if exists (MiniSearch throws on duplicate)
    try {
      this.index.discard(asset.id)
    } catch {
      // not in index
    }
    this.index.add({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      scope: asset.scope,
      category: asset.category,
      path: asset.path,
      agentId: asset.agentId,
      summary: extractSearchSummary(asset),
      metadata: extractSearchMetadata(asset)
    })
    this.indexedAssets = null
  }

  removeAsset(id: string): void {
    try {
      this.index.discard(id)
    } catch {
      // not in index
    }
    this.indexedAssets = null
  }
}

function buildSearchDocs(assets: Asset[]): SearchDoc[] {
  // Dedupe by id (GH-140): under SWR a derived read can be served the snapshot
  // mid-rescan, where the live asset list transiently carries the same id twice
  // (partial fold across a project-scope switch). The committed snapshot is
  // dup-free, but MiniSearch.addAll throws on duplicate ids — guard the transient
  // read by keeping the first occurrence.
  const seen = new Set<string>()
  const docs: SearchDoc[] = []
  for (const asset of assets) {
    if (seen.has(asset.id)) continue
    seen.add(asset.id)
    docs.push({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      scope: asset.scope,
      category: asset.category,
      path: asset.path,
      agentId: asset.agentId,
      summary: extractSearchSummary(asset),
      metadata: extractSearchMetadata(asset)
    })
  }
  return docs
}

function extractSearchSummary(asset: Asset): string {
  return collectMetaText(asset, [
    'title',
    'description',
    'summary',
    'project',
    'model',
    'event',
    'matcher',
    'serverName',
    'name'
  ])
}

function extractSearchMetadata(asset: Asset): string {
  const byType: Record<string, string[]> = {
    session: ['project', 'projectPath', 'model', 'transcriptPath', 'skillsUsed', 'mcpServers', 'startedAt', 'endedAt'],
    hook: ['event', 'matcher', 'type', 'hookType', 'command', 'sourcePath'],
    skill: ['description', 'summary', 'name', 'scope', 'path'],
    agent: ['description', 'summary', 'name', 'model'],
    command: ['description', 'summary', 'command', 'name'],
    'mcp-server': ['description', 'summary', 'serverName', 'name', 'command', 'transport'],
    plugin: ['description', 'summary', 'name', 'version'],
    permission: ['description', 'summary', 'name', 'rule'],
    statusline: ['description', 'summary', 'command', 'name']
  }
  const preferredKeys = byType[asset.type] ?? []
  return collectMetaText(asset, preferredKeys, true)
}

function collectMetaText(asset: Asset, preferredKeys: string[], includeShallow = false): string {
  const parts: string[] = []
  const seen = new Set<string>()

  for (const key of preferredKeys) {
    appendMetaValue(asset.meta[key], parts, seen, key)
  }

  if (includeShallow) {
    for (const [key, value] of Object.entries(asset.meta)) {
      if (preferredKeys.includes(key)) continue
      appendMetaValue(value, parts, seen, key, 0)
    }
  }

  return parts.join(' ')
}

function appendMetaValue(
  value: unknown,
  parts: string[],
  seen: Set<string>,
  key = '',
  depth = 0
): void {
  if (isSensitiveSearchKey(key)) return

  if (typeof value === 'string') {
    const text = value.trim()
    if (!text || text.length > 500 || seen.has(text)) return
    seen.add(text)
    parts.push(text)
    return
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value)
    if (seen.has(text)) return
    seen.add(text)
    parts.push(text)
    return
  }

  if (Array.isArray(value)) {
    for (const item of value.slice(0, 20)) {
      appendMetaValue(item, parts, seen, key, depth + 1)
    }
    return
  }

  if (!value || typeof value !== 'object' || depth > 1) return

  for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
    appendMetaValue(childValue, parts, seen, childKey, depth + 1)
  }
}

function isSensitiveSearchKey(key: string): boolean {
  return /^(raw|content|body|message|messages|transcript|secret|token|api[_-]?key|password|credential)$/i.test(key)
}

function toSearchMatches(match: Record<string, string[] | string>): { field: string; snippet: string }[] {
  const seen = new Set<string>()
  const matches: { field: string; snippet: string }[] = []

  for (const [term, fields] of Object.entries(match)) {
    const fieldList = Array.isArray(fields) ? fields : [fields]
    for (const field of fieldList) {
      const key = `${field}:${term}`
      if (seen.has(key)) continue
      seen.add(key)
      matches.push({ field, snippet: term })
    }
  }

  return matches.slice(0, 6)
}

let _searchInstance: AssetSearch | null = null

export function getSearch(): AssetSearch {
  if (!_searchInstance) {
    _searchInstance = new AssetSearch()
  }
  return _searchInstance
}
