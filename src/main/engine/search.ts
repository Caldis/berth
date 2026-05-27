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
}

export class AssetSearch {
  private index: MiniSearch<SearchDoc>

  constructor() {
    this.index = new MiniSearch<SearchDoc>({
      fields: ['name', 'type', 'scope', 'category', 'path'],
      storeFields: ['name', 'type', 'scope', 'category', 'path'],
      searchOptions: {
        boost: { name: 3, type: 2 },
        fuzzy: 0.2,
        prefix: true
      }
    })
  }

  buildIndex(assets: Asset[]): void {
    this.index.removeAll()
    const docs: SearchDoc[] = assets.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      scope: a.scope,
      category: a.category,
      path: a.path
    }))
    this.index.addAll(docs)
  }

  search(query: string, assets: Asset[]): SearchResult[] {
    if (!query.trim()) return []
    const assetMap = new Map(assets.map((a) => [a.id, a]))
    const results = this.index.search(query)
    const searchResults: SearchResult[] = []
    for (const r of results) {
      const asset = assetMap.get(r.id)
      if (!asset) continue
      const matches: { field: string; snippet: string }[] = []
      for (const [field, terms] of Object.entries(r.match)) {
        matches.push({
          field,
          snippet: Array.isArray(terms) ? terms.join(', ') : String(terms)
        })
      }
      searchResults.push({
        id: r.id,
        asset,
        score: r.score,
        matches
      })
    }
    return searchResults
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
      path: asset.path
    })
  }

  removeAsset(id: string): void {
    try {
      this.index.discard(id)
    } catch {
      // not in index
    }
  }
}

let _searchInstance: AssetSearch | null = null

export function getSearch(): AssetSearch {
  if (!_searchInstance) {
    _searchInstance = new AssetSearch()
  }
  return _searchInstance
}
