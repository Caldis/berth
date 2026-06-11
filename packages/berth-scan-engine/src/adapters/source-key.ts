import { dedupePathKey } from '@shared/asset-dedupe'
import type { Asset } from './types'

/**
 * Stamp an asset with its per-source replacement key (GH-113), derived from the
 * asset's own source file (`asset.path`). `applyFileChange` evicts a changed
 * file's previous rows by `meta.sourceKey` before re-adding the freshly derived
 * ones; a capability asset without it (sourceKey === undefined) is never evicted
 * → duplicate rows on every incremental re-derive. Keying on `asset.path` (not a
 * passed-in filePath) keeps a settings.json's many rows sharing one key and a
 * sidecar hook keyed on its own `entry.sourcePath` correct. Idempotent, so it is
 * safe over parsers (parseClaudeMd / parseAgentsMd) that already set sourceKey.
 */
export function stampSourceKey(asset: Asset): Asset {
  return { ...asset, meta: { ...asset.meta, sourceKey: dedupePathKey(asset.path) } }
}

/** Array form for multi-asset parsers — one settings.json yields mcp + hooks +
 * permissions + env + statusline rows, all sharing that file's sourceKey. */
export function stampSourceKeys(assets: Asset[]): Asset[] {
  return assets.map((asset) => stampSourceKey(asset))
}
