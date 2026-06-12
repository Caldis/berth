import type { AssetSnapshot } from '@shared/types/ipc'

/**
 * GH-122: snapshot-keyed derivation cache, physically extracted from runtime.ts
 * (it was already a self-contained class). Values are reused while
 * `snapshot.id` is unchanged; `clear()` is called by the runtime on scope
 * switches and incremental folds where the id deliberately stays stable.
 */
export interface AssetSelectorCache {
  select<T>(key: string, snapshot: AssetSnapshot, derive: (snapshot: AssetSnapshot) => T): T
  clear(): void
}

export class SnapshotSelectorCache implements AssetSelectorCache {
  private readonly values = new Map<string, { snapshotId: string; value: unknown }>()

  select<T>(key: string, snapshot: AssetSnapshot, derive: (snapshot: AssetSnapshot) => T): T {
    const cached = this.values.get(key)
    if (cached?.snapshotId === snapshot.id) return cached.value as T

    const value = derive(snapshot)
    this.values.set(key, { snapshotId: snapshot.id, value })
    return value
  }

  clear(): void {
    this.values.clear()
  }
}
