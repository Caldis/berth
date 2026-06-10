import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Asset } from '../../src/shared/types/asset'
import {
  buildSessionReplay,
  readSessionReplayEventPayload
} from '../../src/main/engine/session-replay'

let tempDir: string | null = null

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

function writeTranscript(name: string, lines: string[]): string {
  tempDir ??= fs.mkdtempSync(path.join(os.tmpdir(), 'berth-replay-engine-'))
  const filePath = path.join(tempDir, name)
  fs.writeFileSync(filePath, lines.join('\n'))
  return filePath
}

const claudeAsset = (filePath: string, over: Partial<Asset> = {}): Asset => ({
  id: 'session-r1',
  agentId: 'claude-code',
  category: 'state',
  type: 'session',
  scope: 'session',
  name: 'Replay Session',
  path: filePath,
  meta: {},
  ...over
})

function userLine(text: string, ts: string): string {
  return JSON.stringify({
    type: 'user',
    timestamp: ts,
    message: { role: 'user', content: text }
  })
}

describe('buildSessionReplay', () => {
  it('parses events, derives start/end from event timestamps, and reports totals', () => {
    const filePath = writeTranscript('basic.jsonl', [
      userLine('one', '2026-06-11T05:00:00.000Z'),
      userLine('two', '2026-06-11T05:01:00.000Z'),
      userLine('three', '2026-06-11T05:02:00.000Z')
    ])

    const replay = buildSessionReplay(claudeAsset(filePath))

    expect(replay.sessionId).toBe('session-r1')
    expect(replay.agentId).toBe('claude-code')
    expect(replay.events).toHaveLength(3)
    expect(replay.totalEvents).toBe(3)
    expect(replay.truncated).toBe(false)
    expect(replay.startedAt).toBe('2026-06-11T05:00:00.000Z')
    expect(replay.endedAt).toBe('2026-06-11T05:02:00.000Z')
  })

  it('caps events to the most recent slice and flags truncation', () => {
    const filePath = writeTranscript(
      'capped.jsonl',
      ['a', 'b', 'c', 'd', 'e'].map((text, i) => userLine(text, `2026-06-11T05:0${i}:00.000Z`))
    )

    const replay = buildSessionReplay(claudeAsset(filePath), { cap: 2 })

    expect(replay.totalEvents).toBe(5)
    expect(replay.truncated).toBe(true)
    expect(replay.events.map((e) => e.summary)).toEqual(['d', 'e'])
    // startedAt still reflects the real first event, not the truncated slice
    expect(replay.startedAt).toBe('2026-06-11T05:00:00.000Z')
  })

  it('reuses the fingerprint cache until the transcript changes', () => {
    const first = userLine('first', '2026-06-11T05:00:00.000Z')
    const filePath = writeTranscript('cached.jsonl', [first])
    const asset = claudeAsset(filePath, { id: 'session-cache' })
    // Pin mtime to a whole millisecond — utimesSync only has Date (ms) precision,
    // so restoring a sub-ms statSync mtime would never reproduce the fingerprint.
    const fixed = new Date('2026-06-11T00:00:00.000Z')
    fs.utimesSync(filePath, fixed, fixed)

    expect(buildSessionReplay(asset).events[0].summary).toBe('first')

    // Same byte length + same mtime → same fingerprint → cached value is reused.
    fs.writeFileSync(filePath, userLine('xirst', '2026-06-11T05:00:00.000Z'))
    fs.utimesSync(filePath, fixed, fixed)
    expect(buildSessionReplay(asset).events[0].summary).toBe('first')

    // Appending changes the fingerprint → re-parse.
    fs.appendFileSync(filePath, `\n${userLine('second', '2026-06-11T05:01:00.000Z')}`)
    const updated = buildSessionReplay(asset)
    expect(updated.events.map((e) => e.summary)).toEqual(['xirst', 'second'])
  })

  it('returns an empty result for unknown agents and missing files', () => {
    const missing = buildSessionReplay(claudeAsset(path.join(os.tmpdir(), 'berth-none', 'x.jsonl')))
    expect(missing.events).toEqual([])
    expect(missing.totalEvents).toBe(0)

    const unknown = buildSessionReplay(
      claudeAsset(writeTranscript('unknown.jsonl', [userLine('hi', '2026-06-11T05:00:00.000Z')]), {
        agentId: 'mystery'
      })
    )
    expect(unknown.events).toEqual([])
  })
})

describe('readSessionReplayEventPayload', () => {
  it('returns the raw JSONL line behind an event id', () => {
    const lines = [
      userLine('one', '2026-06-11T05:00:00.000Z'),
      userLine('two', '2026-06-11T05:01:00.000Z')
    ]
    const filePath = writeTranscript('payload.jsonl', lines)
    const asset = claudeAsset(filePath)
    const replay = buildSessionReplay(asset)

    const payload = readSessionReplayEventPayload(asset, replay.events[1].id)

    expect(payload).not.toBeNull()
    expect(payload!.id).toBe(replay.events[1].id)
    expect(payload!.json).toBe(lines[1])
    expect(JSON.parse(payload!.json).message.content).toBe('two')
  })

  it('rejects malformed ids and out-of-range lines', () => {
    const filePath = writeTranscript('payload-bad.jsonl', [userLine('one', '2026-06-11T05:00:00.000Z')])
    const asset = claudeAsset(filePath)

    expect(readSessionReplayEventPayload(asset, 'garbage')).toBeNull()
    expect(readSessionReplayEventPayload(asset, 'L99B0')).toBeNull()
    expect(
      readSessionReplayEventPayload(claudeAsset(path.join(os.tmpdir(), 'berth-none', 'x.jsonl')), 'L0B0')
    ).toBeNull()
  })
})
