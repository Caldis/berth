import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { Asset } from '../../src/shared/types/asset'
import type { AssetSnapshot } from '../../src/shared/types/ipc'
import { createSnapshotStore } from '../../src/main/engine/assets/snapshot-store'

// GH-113 T1: persist the asset snapshot so a cold start shows the last result
// instantly (SWR), then revalidates in the background.

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

function asset(id: string, raw?: string): Asset {
  return { id, agentId: 'claude-code', category: 'instruction', type: 'skill', scope: 'user', name: id, path: `/x/${id}`, meta: {}, raw }
}

let dir: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-snap-'))
})
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('createSnapshotStore', () => {
  it('returns null before anything is saved', () => {
    expect(createSnapshotStore(dir).load()).toBeNull()
  })

  it('round-trips a snapshot and strips heavy raw bodies', () => {
    const store = createSnapshotStore(dir)
    store.save(snapshot([asset('a', 'A HUGE RAW BODY'), asset('b')]))
    const loaded = store.load()
    expect(loaded?.assets.map((x) => x.id)).toEqual(['a', 'b'])
    expect(loaded?.assets[0]?.raw).toBeUndefined() // raw not persisted (lean + non-sensitive)
    expect(loaded?.status.lastCompletedAt).toBe('2026-06-07T00:00:00.000Z')
  })

  it('creates the directory if missing and writes atomically (no leftover tmp)', () => {
    const nested = path.join(dir, 'deep', 'userData')
    const store = createSnapshotStore(nested)
    store.save(snapshot([asset('a')]))
    expect(store.load()?.assets).toHaveLength(1)
    expect(fs.existsSync(path.join(nested, 'berth-snapshot.json.tmp'))).toBe(false)
  })

  it('ignores a version-mismatched or corrupt file', () => {
    const file = path.join(dir, 'berth-snapshot.json')
    fs.writeFileSync(file, JSON.stringify({ version: 999, snapshot: snapshot([asset('a')]) }))
    expect(createSnapshotStore(dir).load()).toBeNull()
    fs.writeFileSync(file, 'not json{')
    expect(createSnapshotStore(dir).load()).toBeNull()
  })
})
