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

export class AssetFileCache<T> {
  private readonly entries = new Map<string, AssetFileCacheEntry<T>>()

  static fromSnapshot<T>(snapshot?: AssetFileCacheSnapshot<T>): AssetFileCache<T> {
    const cache = new AssetFileCache<T>()
    for (const entry of snapshot?.entries ?? []) {
      cache.entries.set(entry.fingerprint.path, entry)
    }
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
      return { status: 'hit', fingerprint, value: cached.value }
    }

    try {
      const value = parse()
      this.entries.set(filePath, { fingerprint, value })
      return { status: 'miss', fingerprint, value }
    } catch (error) {
      this.entries.delete(filePath)
      return { status: 'error', path: filePath, fingerprint, error }
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
