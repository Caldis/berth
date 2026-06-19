import * as crypto from 'crypto'
import * as path from 'path'

/**
 * Canonical key identifying the same *physical* file across adapters and
 * platforms. AGENTS.md is a cross-agent open standard, so the Claude and Codex
 * adapters both legitimately scan the same file; this key lets the engine
 * collapse the two rows into a single asset (see `mergeSharedConventions`) and is
 * the per-source replacement key for incremental indexing (GH-113 V2).
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
 * Deterministic, collision-safe digest (16 hex chars / 64 bits of SHA-256) used
 * to build STABLE asset ids. Stability matters because ids are opaque handles for
 * the renderer (selection, raw refetch) AND will become the persistent SQLite
 * primary key (GH-113 V2) — a `Date.now()` id or a narrow 32-bit hash (collision
 * risk at thousands of assets) is unsafe for a PK. (Codex round-2 D1)
 */
export function stableAssetHash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16)
}

/**
 * Canonical deterministic asset id: `${type}-${scope}-${hash(sourceKey:entityKey)}`.
 * `sourceKey` is the normalized physical path (case-folded on Windows); `entityKey`
 * disambiguates the N assets a single file can yield (hooks/mcp/permission in one
 * settings.json) and MUST be content/structure-derived (never a display name or a
 * handler index), so the id is stable across scans and renames. Empty entityKey =
 * the file is a single-asset source keyed on path alone. (GH-113 Pre-T0)
 */
export function assetEntityId(
  type: string,
  scope: string,
  sourcePath: string,
  entityKey = '',
  platform: NodeJS.Platform = process.platform
): string {
  return `${type}-${scope}-${stableAssetHash(`${dedupePathKey(sourcePath, platform)}:${entityKey}`)}`
}

/**
 * Session-id path hash: djb2-style 32-bit folded to base36. NOT `stableAssetHash`
 * (SHA-256) — session asset ids are pre-existing opaque renderer handles whose
 * exact bytes must stay identical (GH-143), so this reproduces the codex adapter's
 * historical hash verbatim. Only used by `sessionAssetId`.
 */
export function sessionPathHash(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

/**
 * Single source for session asset ids (GH-143). Preserves the two historical
 * formats EXACTLY — renderer handles and agent-teams' `session-${id}` lookup
 * depend on them: codex carries a file-path hash for uniqueness across same-id
 * rollouts, every other agent uses the bare `session-${id}`.
 */
export function sessionAssetId(agentId: string, sessionId: string, filePath?: string): string {
  if (agentId === 'codex') return `codex-session-${sessionId}-${sessionPathHash(filePath ?? '')}`
  return `session-${sessionId}`
}
