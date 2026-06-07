import * as fs from 'fs'
import * as path from 'path'
import type { Asset } from '@shared/types/asset'
import type { AssetSnapshot } from '@shared/types/ipc'

const SNAPSHOT_VERSION = 1
const FILE_NAME = 'berth-snapshot.json'

export interface SnapshotStore {
  load(): AssetSnapshot | null
  save(snapshot: AssetSnapshot): void
}

/**
 * Best-effort on-disk persistence of the asset snapshot (GH-113 T1). A cold start
 * loads the last result and shows it instantly (SWR), then the runtime revalidates
 * in the background and overwrites. Electron-free: the host injects the directory
 * (`app.getPath('userData')`) so the engine stays testable. Heavy `raw` bodies are
 * stripped — the snapshot is for the list/counts; raw is re-read on demand. A
 * failed read/write must never break scanning, so everything is swallowed.
 */
export function createSnapshotStore(dir: string): SnapshotStore {
  const file = path.join(dir, FILE_NAME)
  return {
    load(): AssetSnapshot | null {
      try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as { version?: number; snapshot?: AssetSnapshot }
        if (parsed?.version !== SNAPSHOT_VERSION) return null
        const snapshot = parsed.snapshot
        if (!snapshot || !Array.isArray(snapshot.assets)) return null
        return snapshot
      } catch {
        return null
      }
    },
    save(snapshot: AssetSnapshot): void {
      try {
        fs.mkdirSync(dir, { recursive: true })
        const lean: AssetSnapshot = { ...snapshot, assets: snapshot.assets.map(stripRaw) }
        const tmp = `${file}.tmp`
        fs.writeFileSync(tmp, JSON.stringify({ version: SNAPSHOT_VERSION, snapshot: lean }))
        fs.renameSync(tmp, file) // atomic replace so a crashed write never corrupts the cache
      } catch {
        // persistence is best-effort
      }
    }
  }
}

function stripRaw(asset: Asset): Asset {
  return asset.raw === undefined ? asset : { ...asset, raw: undefined }
}
