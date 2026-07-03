import type { Asset } from '@shared/types/asset'
import type { AssetSnapshot, ScanHistoryEntry } from '@shared/types/ipc'

export interface SnapshotStore {
  load(): AssetSnapshot | null
  save(snapshot: AssetSnapshot): void
  /** Drop the persisted index so the next scan repopulates from scratch (rebuild,
   * GH-135). Best-effort like load/save — a failure must never break scanning. */
  clear(): void
  /** Row-level incremental write for one file's assets (GH-151 S5): replace every
   * persisted asset whose `source_key` matches, keep all other rows, refresh the
   * envelope. An empty `assets` array means the file was deleted. Optional —
   * callers fall back to a full `save()` when absent; the SQLite backend provides
   * it so the watcher hot path (an active session transcript flushing every
   * 250ms) stops rewriting the whole table synchronously. */
  replaceBySourceKey?(sourceKey: string, assets: Asset[], envelope: AssetSnapshot): void
  /** Persisted scan history for the trend view (GH-135 G7), oldest→newest.
   * Optional so existing stores/tests need no change; absence → no history.
   * History survives `clear()` (rebuild) — it is an audit trail, not index data. */
  loadScanHistory?(): ScanHistoryEntry[]
  saveScanHistory?(entries: ScanHistoryEntry[]): void
}

// GH-115 T13: JSON 后端 createSnapshotStore 已删除 — 生产装配 (main/index.ts) 自 GH-113 I3
// 起无条件使用 createSqliteSnapshotStore, JSON 实现仅被自身单测保活 ("备用后端"决策无任何装配代码)。
// 本文件保留 SnapshotStore 契约与 stripRaw (sqlite 后端生产消费)。

/** Drops heavy `raw` bodies before persistence — the snapshot is for the
 * list/counts, raw is re-read on demand. Shared by every {@link SnapshotStore}
 * backend so the lean contract never drifts between JSON and SQLite. */
export function stripRaw(asset: Asset): Asset {
  return asset.raw === undefined ? asset : { ...asset, raw: undefined }
}
