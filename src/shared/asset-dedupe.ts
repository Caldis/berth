import * as path from 'path'

/**
 * Canonical key identifying the same *physical* file across adapters and
 * platforms. AGENTS.md is a cross-agent open standard, so the Claude and Codex
 * adapters both legitimately scan the same file; this key lets the engine
 * collapse the two rows into a single asset (see `mergeSharedConventions`).
 *
 * Case-folds only on Windows (case-insensitive filesystem); POSIX paths are
 * compared exactly. Uses the platform-specific `path` implementation so the key
 * is reproducible regardless of the host OS running the computation.
 */
export function dedupePathKey(filePath: string, platform: NodeJS.Platform = process.platform): string {
  if (platform === 'win32') {
    return path.win32.resolve(filePath).toLowerCase()
  }
  return path.posix.resolve(filePath)
}

/**
 * Small deterministic non-cryptographic hash (base36) used to build STABLE asset
 * ids from a path. Stability across scans matters because ids are consumed as
 * opaque handles by the renderer (selection, raw-content refetch) — a
 * `Date.now()`-based id would break those on every refresh.
 */
export function stableAssetHash(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}
