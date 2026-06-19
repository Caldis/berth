import * as fs from 'fs'

export interface FileFingerprint {
  path: string
  size: number
  mtimeMs: number
}

export interface AssetFileCacheEntry<T> {
  fingerprint: FileFingerprint
  value: T
}

export interface AssetFileCacheSnapshot<T> {
  entries: AssetFileCacheEntry<T>[]
}

export type AssetFileCacheReadResult<T> =
  | { status: 'hit'; fingerprint: FileFingerprint; value: T }
  | { status: 'miss'; fingerprint: FileFingerprint; value: T }
  | { status: 'deleted'; path: string }
  | { status: 'error'; path: string; fingerprint?: FileFingerprint; error: unknown }

/**
 * GH-148: optional LRU bounds. Default = NONE (unbounded), so existing callers
 * (sessionCache / projectScanCache / fromSnapshot) keep byte-identical behaviour
 * — sessionCache must stay unbounded because it has snapshot persistence + a
 * pruneTo contract. Only the unbounded-growth module caches (replayCache,
 * executionDetailCache) pass bounds.
 */
export interface AssetFileCacheOptions<T> {
  /** Cap on entry count; oldest (least-recently-read) evicted past the cap. */
  maxEntries?: number
  /** Cap on summed `sizeOf(value)`; oldest evicted until within the cap. */
  maxBytes?: number
  /** Required when `maxBytes` is set — byte weight of one cached value. */
  sizeOf?: (value: T) => number
}

export class AssetFileCache<T> {
  private readonly entries = new Map<string, AssetFileCacheEntry<T>>()
  private readonly options: AssetFileCacheOptions<T>
  private readonly bounded: boolean

  constructor(options: AssetFileCacheOptions<T> = {}) {
    this.options = options
    this.bounded = options.maxEntries != null || options.maxBytes != null
  }

  static fromSnapshot<T>(
    snapshot?: AssetFileCacheSnapshot<T>,
    options: AssetFileCacheOptions<T> = {}
  ): AssetFileCache<T> {
    const cache = new AssetFileCache<T>(options)
    for (const entry of snapshot?.entries ?? []) {
      cache.entries.set(entry.fingerprint.path, entry)
    }
    cache.evictToBounds()
    return cache
  }

  getOrParse(filePath: string, parse: () => T): T {
    const result = this.read(filePath, parse)
    if (result.status === 'hit' || result.status === 'miss') return result.value
    if (result.status === 'deleted') throw new Error(`File no longer exists: ${filePath}`)
    throw result.error
  }

  read(filePath: string, parse: () => T): AssetFileCacheReadResult<T> {
    const fingerprint = fingerprintFile(filePath)
    if (!fingerprint) {
      this.entries.delete(filePath)
      return { status: 'deleted', path: filePath }
    }

    const cached = this.entries.get(filePath)
    if (cached && sameFingerprint(cached.fingerprint, fingerprint)) {
      // LRU recency: move the hit entry to the tail. Gated on `bounded` so an
      // unbounded cache (sessionCache) never reorders its Map — its snapshot
      // round-trip stays byte-identical to pre-GH-148.
      if (this.bounded) {
        this.entries.delete(filePath)
        this.entries.set(filePath, cached)
      }
      return { status: 'hit', fingerprint, value: cached.value }
    }

    try {
      const value = parse()
      // Bounded caches re-insert at the tail (delete first) so a refreshed entry
      // counts as newest for LRU. Unbounded caches keep the original in-place
      // `set` so sessionCache's Map order (and thus its snapshot) is unchanged.
      if (this.bounded) this.entries.delete(filePath)
      this.entries.set(filePath, { fingerprint, value })
      this.evictToBounds()
      return { status: 'miss', fingerprint, value }
    } catch (error) {
      this.entries.delete(filePath)
      return { status: 'error', path: filePath, fingerprint, error }
    }
  }

  /** Evict oldest entries (Map head) until within maxEntries / maxBytes. */
  private evictToBounds(): void {
    if (!this.bounded) return
    const { maxEntries, maxBytes, sizeOf } = this.options

    if (maxEntries != null) {
      while (this.entries.size > maxEntries) {
        const oldest = this.entries.keys().next().value
        if (oldest === undefined) break
        this.entries.delete(oldest)
      }
    }

    if (maxBytes != null && sizeOf) {
      let total = 0
      for (const entry of this.entries.values()) total += sizeOf(entry.value)
      // Keep evicting the oldest while over budget, but never drop the last entry
      // (a single oversized value still gets to live, matching a simple LRU).
      while (total > maxBytes && this.entries.size > 1) {
        const oldestKey = this.entries.keys().next().value
        if (oldestKey === undefined) break
        const oldest = this.entries.get(oldestKey)
        if (oldest) total -= sizeOf(oldest.value)
        this.entries.delete(oldestKey)
      }
    }
  }

  pruneTo(filePaths: Iterable<string>): string[] {
    const live = new Set(filePaths)
    const removed: string[] = []
    for (const filePath of this.entries.keys()) {
      if (live.has(filePath)) continue
      this.entries.delete(filePath)
      removed.push(filePath)
    }
    return removed
  }

  toSnapshot(): AssetFileCacheSnapshot<T> {
    return {
      entries: Array.from(this.entries.values())
    }
  }
}

export function fingerprintFile(filePath: string): FileFingerprint | null {
  try {
    const stat = fs.statSync(filePath)
    if (!stat.isFile()) return null
    return {
      path: filePath,
      size: stat.size,
      mtimeMs: stat.mtimeMs
    }
  } catch {
    return null
  }
}

export function sameFingerprint(left: FileFingerprint, right: FileFingerprint): boolean {
  return left.path === right.path && left.size === right.size && left.mtimeMs === right.mtimeMs
}
