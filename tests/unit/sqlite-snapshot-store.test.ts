import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { Asset } from '@shared/types/asset'
import type { AssetSnapshot } from '@shared/types/ipc'
import {
  createSqliteSnapshotStore,
  type SqliteDatabase,
  type SqliteStatement
} from '@berth/scan-engine/engine/assets/sqlite-snapshot-store'

// GH-113 I3: row-level SQLite backend for the asset snapshot. better-sqlite3
// ships an Electron-ABI prebuilt .node that the test host (system Node) cannot
// require, so we never touch the real binding here — an in-memory fake stands in
// for the injected Database and exercises the store's full SQL choreography.
// The real ABI is verified end-to-end by tests/e2e (Electron main process).

const EMPTY_STATS = { skills: 0, mcpServers: 0, sessions: 0, plugins: 0, hooks: 0, commands: 0, subagents: 0 }

function snapshot(assets: Asset[]): AssetSnapshot {
  return {
    id: 'snap-1',
    projectDir: 'D:/Code/berth',
    assets,
    stats: EMPTY_STATS,
    errors: [],
    sources: [],
    projectCandidates: [],
    status: { state: 'ready', stale: false, lastCompletedAt: '2026-06-07T00:00:00.000Z' }
  }
}

function asset(id: string, opts: { raw?: string; sourceKey?: string } = {}): Asset {
  const meta: Record<string, unknown> = opts.sourceKey ? { sourceKey: opts.sourceKey } : {}
  return { id, agentId: 'claude-code', category: 'instruction', type: 'skill', scope: 'user', name: id, path: `/x/${id}`, meta, raw: opts.raw }
}

// ── in-memory fake of the better-sqlite3 surface the store depends on ──
interface AssetRow {
  id: string
  source_key: string | null
  ord: number
  payload_json: string
}
interface Backing {
  userVersion: number
  assets: AssetRow[]
  meta: Map<string, string>
  pragmaCalls?: string[]
  closeCalls?: number
}

const disk = new Map<string, Backing>() // keyed by db file path — models on-disk persistence across re-opens

function openFakeDatabase(file: string): SqliteDatabase {
  const backing = disk.get(file) ?? { userVersion: 0, assets: [], meta: new Map<string, string>() }
  disk.set(file, backing)
  const prepare = (sql: string): SqliteStatement => {
    const s = sql.trim()
    const unsupported = (): never => {
      throw new Error(`fake sqlite: unsupported statement: ${s}`)
    }
    return {
      run: (...p: unknown[]) => {
        if (s === 'DELETE FROM asset') return void (backing.assets = [])
        if (s === 'DELETE FROM asset WHERE source_key = ?')
          return void (backing.assets = backing.assets.filter((r) => r.source_key !== (p[0] as string)))
        if (s.startsWith('INSERT OR REPLACE INTO asset') || s.startsWith('INSERT INTO asset')) {
          backing.assets = backing.assets.filter((r) => r.id !== (p[0] as string)) // PK upsert semantics
          return void backing.assets.push({ id: p[0] as string, source_key: p[1] as string | null, ord: p[2] as number, payload_json: p[3] as string })
        }
        if (s.startsWith('INSERT OR REPLACE INTO snapshot_meta')) return void backing.meta.set(p[0] as string, p[1] as string)
        return unsupported()
      },
      get: (...p: unknown[]) => {
        if (s.startsWith('SELECT value_json FROM snapshot_meta')) {
          const value = backing.meta.get(p[0] as string)
          return value === undefined ? undefined : { value_json: value }
        }
        if (s.startsWith('SELECT MAX(ord)')) {
          const max = backing.assets.reduce<number | null>((acc, r) => (acc === null || r.ord > acc ? r.ord : acc), null)
          return { max_ord: max }
        }
        return unsupported()
      },
      all: () => {
        if (s.startsWith('SELECT payload_json FROM asset'))
          return [...backing.assets].sort((a, b) => a.ord - b.ord).map((r) => ({ payload_json: r.payload_json }))
        return unsupported()
      }
    }
  }
  return {
    pragma: (source: string) => {
      const src = source.trim()
      backing.pragmaCalls = [...(backing.pragmaCalls ?? []), src]
      if (src === 'user_version') return [{ user_version: backing.userVersion }]
      const assign = src.match(/^user_version\s*=\s*(\d+)$/)
      if (assign) {
        backing.userVersion = Number(assign[1])
        return []
      }
      return [] // journal_mode = WAL etc. — irrelevant to the fake
    },
    exec: (source: string) => {
      if (source.includes('DROP TABLE IF EXISTS asset')) backing.assets = []
      if (source.includes('DROP TABLE IF EXISTS snapshot_meta')) backing.meta.clear()
      return undefined
    },
    prepare,
    transaction: <A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => fn(...args),
    close: () => {
      backing.closeCalls = (backing.closeCalls ?? 0) + 1
    }
  }
}

let dir: string
let dbFile: string

beforeEach(() => {
  disk.clear()
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-sqlite-snap-'))
  dbFile = path.join(dir, 'berth-index.db')
})
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('createSqliteSnapshotStore', () => {
  it('returns null before anything is saved', () => {
    expect(createSqliteSnapshotStore(dir, openFakeDatabase).load()).toBeNull()
  })

  it('cleans up the legacy pre-GH-113 JSON snapshot once SQLite opens', () => {
    const legacy = path.join(dir, 'berth-snapshot.json')
    fs.writeFileSync(legacy, '{"assets":[]}')
    const store = createSqliteSnapshotStore(dir, openFakeDatabase)
    expect(fs.existsSync(legacy)).toBe(true) // open is lazy — untouched until first use
    store.load()
    expect(fs.existsSync(legacy)).toBe(false) // removed after a successful open
  })

  it('round-trips a snapshot, preserves order + envelope, and strips heavy raw bodies', () => {
    const store = createSqliteSnapshotStore(dir, openFakeDatabase)
    store.save(snapshot([asset('a', { raw: 'A HUGE RAW BODY' }), asset('b')]))
    const loaded = store.load()
    expect(loaded?.assets.map((x) => x.id)).toEqual(['a', 'b']) // row order preserved via `ord`
    expect(loaded?.assets[0]?.raw).toBeUndefined() // raw not persisted (lean, re-read on demand)
    expect(loaded?.projectDir).toBe('D:/Code/berth') // envelope round-trips
    expect(loaded?.status.lastCompletedAt).toBe('2026-06-07T00:00:00.000Z')
  })

  it('persists meta.sourceKey into its own column for incremental replacement', () => {
    createSqliteSnapshotStore(dir, openFakeDatabase).save(snapshot([asset('a', { sourceKey: '/x/file' }), asset('b')]))
    const rows = disk.get(dbFile)?.assets ?? []
    expect(rows.find((r) => r.id === 'a')?.source_key).toBe('/x/file')
    expect(rows.find((r) => r.id === 'b')?.source_key).toBeNull() // no meta.sourceKey → NULL, not undefined
  })

  it('replaces all rows on re-save (no stale assets linger)', () => {
    const store = createSqliteSnapshotStore(dir, openFakeDatabase)
    store.save(snapshot([asset('a'), asset('b')]))
    store.save(snapshot([asset('c')]))
    expect(store.load()?.assets.map((x) => x.id)).toEqual(['c'])
  })

  it('rebuilds when an existing DB carries a newer/unknown schema version', () => {
    // Simulate a DB written by a future build: bumped user_version + junk rows.
    disk.set(dbFile, { userVersion: 999, assets: [{ id: 'stale', source_key: null, ord: 0, payload_json: '{"id":"stale"}' }], meta: new Map([['envelope', '{}']]) })
    const store = createSqliteSnapshotStore(dir, openFakeDatabase)
    expect(store.load()).toBeNull() // purged on open, nothing restored
    store.save(snapshot([asset('fresh')]))
    expect(store.load()?.assets.map((x) => x.id)).toEqual(['fresh'])
    expect(disk.get(dbFile)?.userVersion).toBe(1)
  })

  it('replaceBySourceKey swaps one file’s rows, keeps the rest, and updates the envelope (GH-151 S5)', () => {
    // The incremental hot path: an active session transcript flushes every 250ms
    // and must NOT rewrite the whole table (save() = DELETE all + reinsert).
    const store = createSqliteSnapshotStore(dir, openFakeDatabase)
    store.save(snapshot([asset('a', { sourceKey: '/x/file-a' }), asset('b', { sourceKey: '/x/file-b' })]))

    store.replaceBySourceKey!(
      '/x/file-a',
      [asset('a2', { sourceKey: '/x/file-a', raw: 'A HUGE RAW BODY' })],
      { ...snapshot([]), id: 'snap-2' }
    )

    const loaded = store.load()
    expect(loaded?.id).toBe('snap-2') // envelope refreshed
    expect(loaded?.assets.map((x) => x.id)).toEqual(['b', 'a2']) // b untouched, a2 appended after max ord
    expect(loaded?.assets.find((x) => x.id === 'a2')?.raw).toBeUndefined() // lean like save()
    const rows = disk.get(dbFile)?.assets ?? []
    expect(rows.find((r) => r.id === 'b')?.ord).toBe(1) // untouched row keeps its ord — no full rewrite
  })

  it('replaceBySourceKey with an empty set deletes the file’s rows (file removed)', () => {
    const store = createSqliteSnapshotStore(dir, openFakeDatabase)
    store.save(snapshot([asset('a', { sourceKey: '/x/file-a' }), asset('b', { sourceKey: '/x/file-b' })]))

    store.replaceBySourceKey!('/x/file-a', [], { ...snapshot([]), id: 'snap-2' })

    expect(store.load()?.assets.map((x) => x.id)).toEqual(['b'])
  })

  it('close() checkpoints the WAL, closes the handle, and later calls no-op (GH-152 T5)', () => {
    const store = createSqliteSnapshotStore(dir, openFakeDatabase)
    store.save(snapshot([asset('a')]))

    store.close!()

    const backing = disk.get(dbFile)
    expect(backing?.pragmaCalls).toContain('wal_checkpoint(TRUNCATE)')
    expect(backing?.closeCalls).toBe(1)
    // Closed store: everything degrades to a silent no-op — never a throw, never a reopen.
    expect(store.load()).toBeNull()
    expect(() => store.save(snapshot([asset('b')]))).not.toThrow()
    expect(backing?.assets.map((r) => r.id)).toEqual(['a']) // save after close did not write
  })

  it('close() before any use is a no-op (nothing was opened)', () => {
    const open = vi.fn(openFakeDatabase)
    const store = createSqliteSnapshotStore(dir, open)
    expect(() => store.close!()).not.toThrow()
    expect(open).not.toHaveBeenCalled()
    expect(store.load()).toBeNull() // closed: no lazy reopen either
  })

  it('retries after a transient lock error once the backoff window passes (GH-152 T6)', () => {
    // Windows AV/backup tools hold berth-index.db briefly at login — a one-shot
    // "give up permanently" turned that blip into a whole session without SWR.
    let nowMs = 0
    let failuresLeft = 1
    const open = vi.fn((file: string) => {
      if (failuresLeft > 0) {
        failuresLeft--
        throw Object.assign(new Error('database is locked'), { code: 'SQLITE_BUSY' })
      }
      return openFakeDatabase(file)
    })
    const store = createSqliteSnapshotStore(dir, open, { transientRetryDelayMs: 5000, now: () => nowMs })

    expect(store.load()).toBeNull() // first call hits the lock
    nowMs = 1000
    expect(store.load()).toBeNull() // inside the backoff window: no second open attempt
    expect(open).toHaveBeenCalledTimes(1)

    nowMs = 6000
    store.save(snapshot([asset('a')])) // window passed: reopen succeeds
    expect(open).toHaveBeenCalledTimes(2)
    expect(store.load()?.assets.map((x) => x.id)).toEqual(['a'])
  })

  it('gives up permanently on a non-transient open error (GH-152 T6)', () => {
    let nowMs = 0
    const open = vi.fn(() => {
      throw Object.assign(new Error('file is not a database'), { code: 'SQLITE_NOTADB' })
    })
    const store = createSqliteSnapshotStore(dir, open, { transientRetryDelayMs: 5000, now: () => nowMs })

    expect(store.load()).toBeNull()
    nowMs = 60_000
    expect(store.load()).toBeNull()
    expect(open).toHaveBeenCalledTimes(1) // corruption class: never retried
  })

  it('opens the database lazily and only once across many calls', () => {
    const open = vi.fn(openFakeDatabase)
    const store = createSqliteSnapshotStore(dir, open)
    expect(open).not.toHaveBeenCalled() // construction does not touch the DB
    store.load()
    store.save(snapshot([asset('a')]))
    store.load()
    expect(open).toHaveBeenCalledTimes(1) // single cached handle
  })
})
