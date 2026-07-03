import * as fs from 'fs'
import { getMainLog } from '../../log'
import * as path from 'path'
import type { Asset } from '@shared/types/asset'
import type { AssetSnapshot, ScanHistoryEntry } from '@shared/types/ipc'
import { stripRaw, type SnapshotStore } from './snapshot-store'

/**
 * Row-level SQLite backend for the asset snapshot (GH-113 I3). A drop-in
 * {@link SnapshotStore} replacement for the JSON store: same synchronous
 * `load`/`save` contract, but assets live one-per-row so the upcoming
 * incremental indexer can replace a single file's assets by `source_key`
 * instead of rewriting the whole blob.
 *
 * ABI note: `better-sqlite3` ships an Electron-ABI prebuilt `.node`, which the
 * unit-test host (system Node) cannot `require`. So this module never imports
 * `better-sqlite3` — the host injects an already-opened `Database` factory
 * ({@link OpenSqliteDatabase}), exactly as the JSON store injects its directory.
 * The real binding is loaded only in the Electron main process; tests inject a
 * fake. Writes stay best-effort: a failed open/read/write must never break
 * scanning, so everything is swallowed.
 */

/** Minimal structural subset of `better-sqlite3`'s `Statement` we depend on. */
export interface SqliteStatement {
  run(...params: unknown[]): unknown
  get(...params: unknown[]): unknown
  all(...params: unknown[]): unknown[]
}

/** Minimal structural subset of `better-sqlite3`'s `Database` we depend on, so
 * this module stays free of the native import while real `better-sqlite3`
 * remains assignable to it. */
export interface SqliteDatabase {
  pragma(source: string): unknown
  exec(source: string): unknown
  prepare(source: string): SqliteStatement
  transaction<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void
  close(): void
}

export type OpenSqliteDatabase = (file: string) => SqliteDatabase

const SCHEMA_VERSION = 1
const FILE_NAME = 'berth-index.db'
// Pre-GH-113 JSON backend file: the reader was removed (GH-115 T13), so the
// leftover can never be consumed again — clean it up once SQLite is live.
const LEGACY_JSON_FILE = 'berth-snapshot.json'
const ENVELOPE_KEY = 'envelope'
const SCAN_HISTORY_KEY = 'scan-history'

export function createSqliteSnapshotStore(dir: string, openDatabase: OpenSqliteDatabase): SnapshotStore {
  const file = path.join(dir, FILE_NAME)
  let db: SqliteDatabase | null | undefined // undefined = untried, null = open failed

  function getDb(): SqliteDatabase | null {
    if (db !== undefined) return db
    try {
      fs.mkdirSync(dir, { recursive: true })
      const opened = openDatabase(file)
      ensureSchema(opened)
      db = opened
      try {
        // Isolated: a cleanup failure must not be mistaken for an open failure
        // (the outer catch would permanently disable persistence).
        fs.rmSync(path.join(dir, LEGACY_JSON_FILE), { force: true })
      } catch (err) {
        getMainLog().log('sqlite-snapshot-store', err)
      }
    } catch (err) {
      getMainLog().log('sqlite-snapshot-store', err)
      db = null // give up permanently for this store; persistence is best-effort
    }
    return db
  }

  return {
    load(): AssetSnapshot | null {
      try {
        const handle = getDb()
        if (!handle) return null
        const metaRow = handle.prepare('SELECT value_json FROM snapshot_meta WHERE key = ?').get(ENVELOPE_KEY) as
          | { value_json?: string }
          | undefined
        if (!metaRow?.value_json) return null
        const envelope = JSON.parse(metaRow.value_json) as AssetSnapshot
        const rows = handle.prepare('SELECT payload_json FROM asset ORDER BY ord').all() as { payload_json: string }[]
        const assets = rows.map((r) => JSON.parse(r.payload_json) as Asset)
        return { ...envelope, assets } // row-level assets override the envelope's emptied list
      } catch (err) {
        getMainLog().log('sqlite-snapshot-store', err)
        return null
      }
    },
    save(snapshot: AssetSnapshot): void {
      try {
        const handle = getDb()
        if (!handle) return
        const lean = snapshot.assets.map(stripRaw)
        const deleteAssets = handle.prepare('DELETE FROM asset')
        const insertAsset = handle.prepare('INSERT INTO asset (id, source_key, ord, payload_json) VALUES (?, ?, ?, ?)')
        const upsertMeta = handle.prepare('INSERT OR REPLACE INTO snapshot_meta (key, value_json) VALUES (?, ?)')
        const writeAll = handle.transaction((assets: Asset[], envelope: AssetSnapshot) => {
          deleteAssets.run()
          assets.forEach((asset, ord) => insertAsset.run(asset.id, sourceKeyOf(asset), ord, JSON.stringify(asset)))
          upsertMeta.run(ENVELOPE_KEY, JSON.stringify(envelope))
        })
        writeAll(lean, envelopeOf(snapshot))
      } catch (err) {
        // persistence is best-effort
        getMainLog().log('sqlite-snapshot-store', err)
      }
    },
    replaceBySourceKey(sourceKey: string, assets: Asset[], envelope: AssetSnapshot): void {
      // The single-file write the `source_key` column was built for (GH-151 S5):
      // swap one file's rows in place instead of the DELETE-all + reinsert of
      // save(). New rows append after the current max ord — load() only needs a
      // stable relative order, not dense ordinals.
      try {
        const handle = getDb()
        if (!handle) return
        const lean = assets.map(stripRaw)
        const deleteByKey = handle.prepare('DELETE FROM asset WHERE source_key = ?')
        const maxOrd = handle.prepare('SELECT MAX(ord) AS max_ord FROM asset')
        const insertAsset = handle.prepare('INSERT OR REPLACE INTO asset (id, source_key, ord, payload_json) VALUES (?, ?, ?, ?)')
        const upsertMeta = handle.prepare('INSERT OR REPLACE INTO snapshot_meta (key, value_json) VALUES (?, ?)')
        const replace = handle.transaction((key: string, rows: Asset[], env: AssetSnapshot) => {
          deleteByKey.run(key)
          const row = maxOrd.get() as { max_ord?: number | null } | undefined
          const base = (row?.max_ord ?? -1) + 1
          rows.forEach((asset, offset) => insertAsset.run(asset.id, sourceKeyOf(asset), base + offset, JSON.stringify(asset)))
          upsertMeta.run(ENVELOPE_KEY, JSON.stringify(env))
        })
        replace(sourceKey, lean, envelopeOf(envelope))
      } catch (err) {
        // persistence is best-effort
        getMainLog().log('sqlite-snapshot-store', err)
      }
    },
    clear(): void {
      // Rebuild (GH-135): drop every indexed asset + the snapshot envelope so the
      // next scan starts from an empty index. Scan history is deliberately KEPT —
      // it is an audit trail, not index data (G7). Best-effort like load/save.
      try {
        const handle = getDb()
        if (!handle) return
        const run = handle.transaction(() => {
          handle.prepare('DELETE FROM asset').run()
          handle.prepare('DELETE FROM snapshot_meta WHERE key = ?').run(ENVELOPE_KEY)
        })
        run()
      } catch (err) {
        getMainLog().log('sqlite-snapshot-store', err)
      }
    },
    loadScanHistory(): ScanHistoryEntry[] {
      try {
        const handle = getDb()
        if (!handle) return []
        const row = handle.prepare('SELECT value_json FROM snapshot_meta WHERE key = ?').get(SCAN_HISTORY_KEY) as
          | { value_json?: string }
          | undefined
        if (!row?.value_json) return []
        const parsed = JSON.parse(row.value_json) as ScanHistoryEntry[]
        return Array.isArray(parsed) ? parsed : []
      } catch (err) {
        getMainLog().log('sqlite-snapshot-store', err)
        return []
      }
    },
    saveScanHistory(entries: ScanHistoryEntry[]): void {
      try {
        const handle = getDb()
        if (!handle) return
        handle
          .prepare('INSERT OR REPLACE INTO snapshot_meta (key, value_json) VALUES (?, ?)')
          .run(SCAN_HISTORY_KEY, JSON.stringify(entries))
      } catch (err) {
        getMainLog().log('sqlite-snapshot-store', err)
      }
    }
  }
}

function ensureSchema(db: SqliteDatabase): void {
  db.pragma('journal_mode = WAL')
  if (currentUserVersion(db) === SCHEMA_VERSION) return
  // Unknown/stale schema → rebuild from scratch. A snapshot is a disposable
  // cache (revalidated on every launch), so we purge rather than migrate —
  // mirroring the indexer's parser_version "purge-on-change" policy.
  db.exec('DROP TABLE IF EXISTS asset')
  db.exec('DROP TABLE IF EXISTS snapshot_meta')
  db.exec('CREATE TABLE asset (id TEXT PRIMARY KEY, source_key TEXT, ord INTEGER NOT NULL, payload_json TEXT NOT NULL)')
  db.exec('CREATE TABLE snapshot_meta (key TEXT PRIMARY KEY, value_json TEXT NOT NULL)')
  db.pragma(`user_version = ${SCHEMA_VERSION}`)
}

function currentUserVersion(db: SqliteDatabase): number {
  const rows = db.pragma('user_version') as { user_version?: number }[] | undefined
  return Number(rows?.[0]?.user_version ?? 0)
}

/** The snapshot with its assets emptied — those live one-per-row in `asset`, so
 * persisting them again in the meta row would double-store the whole list. */
function envelopeOf(snapshot: AssetSnapshot): AssetSnapshot {
  return { ...snapshot, assets: [] }
}

/** The normalized per-file key the incremental indexer replaces against
 * (GH-113 SPEC身份契约). Stored as its own column now so a future single-file
 * change can `DELETE ... WHERE source_key = ?` without reparsing the payload. */
function sourceKeyOf(asset: Asset): string | null {
  const key = asset.meta?.sourceKey
  return typeof key === 'string' ? key : null
}
