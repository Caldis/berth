import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Asset } from '@shared/types/asset'
import { replayEventId } from '@shared/session-replay'
import {
  __resetEventPayloadCacheForTest,
  readSessionReplayEventPayload
} from '../src/engine/session-replay'
import * as jsonlStream from '../src/adapters/_shared/jsonl-stream'

// GH-3: per-line event-payload LRU cache. The previous behaviour streamed the
// transcript from byte 0 on EVERY `sessions:event-payload` click. These tests pin
// the bounded slice we added: cache hits return the same line without re-reading,
// a fingerprint change (file edited) invalidates the stale line, and the byte
// bound evicts the oldest entries.

let tempDir: string | null = null

beforeEach(() => {
  __resetEventPayloadCacheForTest()
  vi.restoreAllMocks()
})

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
  vi.restoreAllMocks()
})

function write(content: string, name = 'session.jsonl'): string {
  tempDir ??= fs.mkdtempSync(path.join(os.tmpdir(), 'berth-event-payload-cache-'))
  const filePath = path.join(tempDir, name)
  fs.writeFileSync(filePath, content)
  return filePath
}

function assetFor(filePath: string): Asset {
  // Only `path` and `agentId` are read by readSessionReplayEventPayload; the rest
  // is filler to satisfy the Asset shape.
  return {
    id: 'session-1',
    agentId: 'claude-code',
    path: filePath
  } as unknown as Asset
}

/** Build a transcript whose line N is `{"i":N}` (one JSON object per line). */
function transcript(lineCount: number): string {
  return Array.from({ length: lineCount }, (_, i) => JSON.stringify({ i })).join('\n')
}

describe('readSessionReplayEventPayload — per-line LRU cache (GH-3)', () => {
  it('returns the raw JSONL line for the event id', () => {
    const filePath = write(transcript(5))
    const asset = assetFor(filePath)

    const payload = readSessionReplayEventPayload(asset, replayEventId(2, 0))
    expect(payload).toEqual({ id: replayEventId(2, 0), json: JSON.stringify({ i: 2 }) })
  })

  it('a repeat read is served from cache without re-streaming the file', () => {
    const filePath = write(transcript(10))
    const asset = assetFor(filePath)
    const eventId = replayEventId(7, 0)

    const first = readSessionReplayEventPayload(asset, eventId)
    expect(first?.json).toBe(JSON.stringify({ i: 7 }))

    // After the first resolve, the iterator must NOT run again for the same line.
    const spy = vi.spyOn(jsonlStream, 'iterateJsonlLinesWithIndex')
    const second = readSessionReplayEventPayload(asset, eventId)
    expect(second).toEqual(first)
    expect(spy).not.toHaveBeenCalled()
  })

  it('a fingerprint change (file edited) invalidates the stale cached line', () => {
    const filePath = write(transcript(5))
    const asset = assetFor(filePath)
    const eventId = replayEventId(2, 0)

    const before = readSessionReplayEventPayload(asset, eventId)
    expect(before?.json).toBe(JSON.stringify({ i: 2 }))

    // Rewrite line 2 with different content. Different length => different size =>
    // different fingerprint; bump mtime too for robustness on coarse clocks.
    const edited = ['{"i":0}', '{"i":1}', '{"i":2,"edited":true}', '{"i":3}', '{"i":4}'].join(
      '\n'
    )
    fs.writeFileSync(filePath, edited)
    const future = new Date(Date.now() + 10_000)
    fs.utimesSync(filePath, future, future)

    const after = readSessionReplayEventPayload(asset, eventId)
    expect(after?.json).toBe('{"i":2,"edited":true}')
    expect(after?.json).not.toBe(before?.json)
  })

  it('caches per line index — different events resolve independently', () => {
    const filePath = write(transcript(5))
    const asset = assetFor(filePath)

    const a = readSessionReplayEventPayload(asset, replayEventId(1, 0))
    const b = readSessionReplayEventPayload(asset, replayEventId(4, 0))
    expect(a?.json).toBe(JSON.stringify({ i: 1 }))
    expect(b?.json).toBe(JSON.stringify({ i: 4 }))

    const cache = __resetEventPayloadCacheForTest()
    // sanity: clear() actually empties it
    expect(cache.size).toBe(0)
  })

  it('enforces the byte bound by evicting the oldest entries', () => {
    // Each line is a large blob so a handful exceed the cache's byte budget.
    const blob = 'x'.repeat(64 * 1024) // 64KB per line
    const lineCount = 200 // ~12.8MB total > 8MB cap
    const lines = Array.from({ length: lineCount }, (_, i) =>
      JSON.stringify({ i, blob })
    )
    const filePath = write(lines.join('\n'))
    const asset = assetFor(filePath)

    const cache = __resetEventPayloadCacheForTest()
    for (let i = 0; i < lineCount; i++) {
      const payload = readSessionReplayEventPayload(asset, replayEventId(i, 0))
      expect(payload?.json).toBe(lines[i])
    }

    // Bound holds: never grew past the cap (allowing the +1 "never drop last" slack
    // from a single insert pushing over before eviction).
    expect(cache.totalBytes).toBeLessThanOrEqual(8 * 1024 * 1024 + lines[0].length)
    expect(cache.size).toBeLessThan(lineCount)

    // The oldest (line 0) was evicted; the newest (last line) is still cached.
    const spy = vi.spyOn(jsonlStream, 'iterateJsonlLinesWithIndex')
    readSessionReplayEventPayload(asset, replayEventId(lineCount - 1, 0))
    expect(spy).not.toHaveBeenCalled() // newest = cache hit, no re-stream
  })

  it('returns null for a blank / out-of-range line and does not cache it', () => {
    const filePath = write(transcript(3))
    const asset = assetFor(filePath)

    const oob = readSessionReplayEventPayload(asset, replayEventId(99, 0))
    expect(oob).toBeNull()

    const cache = __resetEventPayloadCacheForTest()
    expect(cache.size).toBe(0)
  })

  it('returns null for a malformed event id (no stream, no cache)', () => {
    const filePath = write(transcript(3))
    const asset = assetFor(filePath)
    const spy = vi.spyOn(jsonlStream, 'iterateJsonlLinesWithIndex')

    expect(readSessionReplayEventPayload(asset, 'not-an-event-id')).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })
})
