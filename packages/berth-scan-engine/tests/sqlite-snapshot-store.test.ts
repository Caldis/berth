import { afterAll, describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { Asset } from '@shared/types/asset'
import type { AssetSnapshot } from '@shared/types/ipc'
import {
  createSqliteSnapshotStore,
  type SqliteDatabase,
  type SqliteStatement
} from '../src/engine/assets/sqlite-snapshot-store'

// better-sqlite3 ships an Electron-ABI prebuilt the node test host can't require,
// so the store is dependency-injected (createSqliteSnapshotStore(dir, openDatabase)).
// This in-memory fake implements just the SQL the store issues — enough to prove
// save round-trips and clear() empties both tables (GH-135).
interface AssetRow {
  id: string
  source_key: string | null
  ord: number
  payload_json: string
}

function createFakeDb(): { db: SqliteDatabase; rows: () => AssetRow[]; meta: () => Map<string, string> } {
  let assets: AssetRow[] = []
  const metaMap = new Map<string, string>()
  let userVersion = 0

  const db: SqliteDatabase = {
    pragma(source: string): unknown {
      if (source === 'user_version') return [{ user_version: userVersion }]
      const m = /user_version\s*=\s*(\d+)/.exec(source)
      if (m) userVersion = Number(m[1])
      return undefined
    },
    exec(): unknown {
      return undefined
    },
    prepare(sql: string): SqliteStatement {
      return {
        run(...params: unknown[]): unknown {
          if (sql.startsWith('DELETE FROM asset')) assets = []
          else if (sql.startsWith('DELETE FROM snapshot_meta')) metaMap.clear()
          else if (sql.startsWith('INSERT INTO asset')) {
            const [id, source_key, ord, payload_json] = params as [string, string | null, number, string]
            assets.push({ id, source_key, ord, payload_json })
          } else if (sql.startsWith('INSERT OR REPLACE INTO snapshot_meta')) {
            const [key, value_json] = params as [string, string]
            metaMap.set(key, value_json)
          }
          return undefined
        },
        get(...params: unknown[]): unknown {
          if (sql.includes('FROM snapshot_meta WHERE key')) {
            const [key] = params as [string]
            const value_json = metaMap.get(key)
            return value_json ? { value_json } : undefined
          }
          return undefined
        },
        all(): unknown[] {
          if (sql.includes('FROM asset ORDER BY ord')) {
            return [...assets].sort((a, b) => a.ord - b.ord).map((r) => ({ payload_json: r.payload_json }))
          }
          return []
        }
      }
    },
    transaction<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void {
      return (...args: A) => fn(...args)
    },
    close(): void {}
  }
  return { db, rows: () => assets, meta: () => metaMap }
}

function makeAsset(id: string): Asset {
  return {
    id,
    type: 'skill',
    name: id,
    path: `/x/${id}`,
    scope: 'user',
    agentId: 'claude-code',
    meta: {}
  } as Asset
}

function makeSnapshot(assets: Asset[]): AssetSnapshot {
  return {
    id: 'snap-1',
    assets,
    stats: { skills: assets.length, mcpServers: 0, sessions: 0, plugins: 0, hooks: 0, commands: 0, subagents: 0 },
    errors: [],
    sources: [],
    projectCandidates: [],
    status: { state: 'ready', stale: false }
  }
}

const dirs: string[] = []
function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-sqlite-store-'))
  dirs.push(dir)
  return dir
}
afterAll(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true })
})

describe('sqlite snapshot store (GH-135 clear / rebuild)', () => {
  it('round-trips a saved snapshot through the row store', () => {
    const { db, rows } = createFakeDb()
    const store = createSqliteSnapshotStore(tempDir(), () => db)

    store.save(makeSnapshot([makeAsset('a'), makeAsset('b')]))
    expect(rows()).toHaveLength(2)

    const loaded = store.load()
    expect(loaded?.assets.map((a) => a.id)).toEqual(['a', 'b'])
  })

  it('clear() drops every asset row AND the envelope meta', () => {
    const { db, rows, meta } = createFakeDb()
    const store = createSqliteSnapshotStore(tempDir(), () => db)

    store.save(makeSnapshot([makeAsset('a'), makeAsset('b')]))
    expect(rows().length).toBeGreaterThan(0)
    expect(meta().size).toBeGreaterThan(0)

    store.clear()

    expect(rows()).toHaveLength(0)
    expect(meta().size).toBe(0)
    // No envelope → load returns null, so the next scan starts from an empty index.
    expect(store.load()).toBeNull()
  })

  it('clear() is best-effort: a transaction failure does not throw', () => {
    const { db } = createFakeDb()
    db.transaction = () => () => {
      throw new Error('disk full')
    }
    const store = createSqliteSnapshotStore(tempDir(), () => db)
    expect(() => store.clear()).not.toThrow()
  })
})
