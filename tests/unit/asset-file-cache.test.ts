import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssetFileCache, fingerprintFile } from '@berth/scan-engine/engine/assets/file-cache'

let tempDir: string | null = null

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

function tempFile(name = 'session.jsonl'): string {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-file-cache-'))
  const filePath = path.join(tempDir, name)
  fs.writeFileSync(filePath, '{"type":"session_meta"}\n')
  return filePath
}

describe('AssetFileCache', () => {
  it('returns a hit when the file fingerprint is unchanged', () => {
    const filePath = tempFile()
    const cache = new AssetFileCache<{ id: string }>()
    const parse = vi.fn(() => ({ id: 'session-1' }))

    expect(cache.read(filePath, parse)).toMatchObject({ status: 'miss', value: { id: 'session-1' } })
    expect(cache.read(filePath, parse)).toMatchObject({ status: 'hit', value: { id: 'session-1' } })
    expect(parse).toHaveBeenCalledTimes(1)
  })

  it('invalidates the cached value when size or mtime changes', () => {
    const filePath = tempFile()
    const cache = new AssetFileCache<{ id: string }>()
    const parse = vi.fn()
      .mockReturnValueOnce({ id: 'session-1' })
      .mockReturnValueOnce({ id: 'session-2' })

    cache.getOrParse(filePath, parse)
    fs.appendFileSync(filePath, '{"type":"event_msg"}\n')
    fs.utimesSync(filePath, new Date('2026-06-03T00:00:00.000Z'), new Date('2026-06-03T00:00:00.000Z'))

    expect(cache.read(filePath, parse)).toMatchObject({ status: 'miss', value: { id: 'session-2' } })
    expect(parse).toHaveBeenCalledTimes(2)
  })

  it('removes entries when files are deleted or pruned', () => {
    const filePath = tempFile()
    const cache = new AssetFileCache<{ id: string }>()
    cache.getOrParse(filePath, () => ({ id: 'session-1' }))

    fs.rmSync(filePath)

    expect(cache.read(filePath, () => ({ id: 'session-2' }))).toEqual({ status: 'deleted', path: filePath })

    const nextFile = tempFile('next.jsonl')
    cache.getOrParse(nextFile, () => ({ id: 'session-next' }))
    expect(cache.pruneTo([])).toEqual([nextFile])
    expect(cache.toSnapshot().entries).toEqual([])
  })

  it('does not keep stale cache entries after parser errors', () => {
    const filePath = tempFile()
    const cache = new AssetFileCache<{ id: string }>()
    cache.getOrParse(filePath, () => ({ id: 'session-1' }))
    fs.appendFileSync(filePath, '{"type":"broken"}\n')

    const result = cache.read(filePath, () => {
      throw new Error('parse failed')
    })

    expect(result).toMatchObject({ status: 'error', path: filePath })
    expect(() => cache.getOrParse(filePath, () => {
      throw new Error('parse failed again')
    })).toThrow('parse failed again')
  })

  it('restores entries from a snapshot without touching disk state', () => {
    const filePath = tempFile()
    const cache = new AssetFileCache<{ id: string }>()
    const fingerprint = fingerprintFile(filePath)
    expect(fingerprint).not.toBeNull()
    cache.getOrParse(filePath, () => ({ id: 'session-1' }))

    const restored = AssetFileCache.fromSnapshot(cache.toSnapshot())

    expect(restored.read(filePath, () => ({ id: 'session-2' }))).toMatchObject({
      status: 'hit',
      fingerprint,
      value: { id: 'session-1' }
    })
  })
})

// GH-148: optional LRU bounds. Default stays unbounded (back-compat — sessionCache
// must keep growing + round-trip its snapshot). Only replayCache /
// executionDetailCache pass bounds.
describe('AssetFileCache LRU bounds (GH-148)', () => {
  function makeFiles(n: number): string[] {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-file-cache-lru-'))
    const paths: string[] = []
    for (let i = 0; i < n; i++) {
      const p = path.join(tempDir, `s${i}.jsonl`)
      fs.writeFileSync(p, `{"i":${i}}\n`)
      paths.push(p)
    }
    return paths
  }

  function cachedPaths<T>(cache: AssetFileCache<T>): string[] {
    return cache.toSnapshot().entries.map((e) => e.fingerprint.path)
  }

  it('maxEntries evicts the oldest past the cap, keeps the newest', () => {
    const files = makeFiles(4)
    const cache = new AssetFileCache<number>({ maxEntries: 2 })
    files.forEach((p, i) => cache.getOrParse(p, () => i))

    // Only the two most-recently-inserted survive; the first two are evicted.
    expect(cachedPaths(cache)).toEqual([files[2], files[3]])
  })

  it('move-to-tail on hit makes a re-read entry survive a later insert', () => {
    const files = makeFiles(3)
    const cache = new AssetFileCache<number>({ maxEntries: 2 })
    cache.getOrParse(files[0], () => 0)
    cache.getOrParse(files[1], () => 1)
    // Re-read files[0] → it becomes most-recent; files[1] is now the oldest.
    expect(cache.read(files[0], () => 0)).toMatchObject({ status: 'hit', value: 0 })
    // Insert files[2] → must evict files[1] (oldest), NOT the just-touched files[0].
    cache.getOrParse(files[2], () => 2)
    expect(cachedPaths(cache).sort()).toEqual([files[0], files[2]].sort())
    expect(cachedPaths(cache)).not.toContain(files[1])
  })

  it('maxBytes evicts oldest until within budget (sizeOf-weighted)', () => {
    const files = makeFiles(4)
    // Each value weighs 100 bytes; cap 250 → at most 2 entries fit.
    const cache = new AssetFileCache<string>({ maxBytes: 250, sizeOf: () => 100 })
    files.forEach((p, i) => cache.getOrParse(p, () => `v${i}`))
    expect(cachedPaths(cache)).toEqual([files[2], files[3]])
  })

  it('maxBytes keeps a single oversized value rather than dropping everything', () => {
    const files = makeFiles(1)
    const cache = new AssetFileCache<string>({ maxBytes: 10, sizeOf: () => 1_000_000 })
    cache.getOrParse(files[0], () => 'huge')
    // The lone entry survives even though it exceeds the cap.
    expect(cachedPaths(cache)).toEqual([files[0]])
    expect(cache.read(files[0], () => { throw new Error('should be cached') })).toMatchObject({
      status: 'hit'
    })
  })

  it('default (no options) stays unbounded — never evicts, snapshot round-trips', () => {
    const files = makeFiles(50)
    const cache = new AssetFileCache<number>() // sessionCache-style: no bounds
    files.forEach((p, i) => cache.getOrParse(p, () => i))

    // All 50 retained (no eviction) — the pre-GH-148 behaviour.
    expect(cache.toSnapshot().entries).toHaveLength(50)
    // pruneTo + snapshot round-trip still work exactly as before.
    const restored = AssetFileCache.fromSnapshot(cache.toSnapshot())
    expect(restored.toSnapshot().entries).toHaveLength(50)
    expect(restored.read(files[0], () => { throw new Error('cached') })).toMatchObject({
      status: 'hit',
      value: 0
    })
  })
})
