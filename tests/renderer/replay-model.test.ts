import { describe, expect, it } from 'vitest'
import type { SessionReplayEvent } from '@shared/types/ipc'
import {
  buildReplayPositions,
  filterReplayEvents,
  formatReplayOffset,
  nearestReplayIndex,
  replayOffsetMs
} from '@/lib/replay-model'
import { formatReplayPayload, tokenizeJson } from '@/lib/json-highlight'

const event = (over: Partial<SessionReplayEvent>): SessionReplayEvent => ({
  id: 'L0B0',
  kind: 'user',
  timestamp: null,
  summary: 'hello',
  ...over
})

describe('filterReplayEvents', () => {
  const events = [
    event({ id: 'a', kind: 'user', summary: 'fix the bug' }),
    event({ id: 'b', kind: 'tool', summary: '{"command":"pnpm test"}', toolName: 'Bash' }),
    event({ id: 'c', kind: 'thinking', summary: 'planning' }),
    event({ id: 'd', kind: 'model', summary: '10 in → 20 out' })
  ]

  it('returns all events when no kind filter and no query', () => {
    expect(filterReplayEvents(events, null, '')).toHaveLength(4)
    expect(filterReplayEvents(events, new Set(), '')).toHaveLength(4)
  })

  it('filters by kind set and query together', () => {
    expect(filterReplayEvents(events, new Set(['tool']), '').map((e) => e.id)).toEqual(['b'])
    expect(filterReplayEvents(events, null, 'plan').map((e) => e.id)).toEqual(['c'])
    expect(filterReplayEvents(events, new Set(['tool', 'user']), 'bash').map((e) => e.id)).toEqual(['b'])
    expect(filterReplayEvents(events, new Set(['user']), 'bash')).toEqual([])
  })
})

describe('replay offsets', () => {
  it('computes ms offsets relative to session start', () => {
    const start = Date.parse('2026-06-11T01:00:00.000Z')
    expect(replayOffsetMs('2026-06-11T01:04:16.000Z', start)).toBe(256_000)
    expect(replayOffsetMs(null, start)).toBeNull()
    expect(replayOffsetMs('2026-06-11T01:00:00.000Z', null)).toBeNull()
    expect(replayOffsetMs('not a date', start)).toBeNull()
  })

  it('formats offsets as h:mm:ss like the reference debug view', () => {
    expect(formatReplayOffset(0)).toBe('0:00:00')
    expect(formatReplayOffset(256_000)).toBe('0:04:16')
    expect(formatReplayOffset(71 * 3600_000 + 49 * 60_000 + 57_000)).toBe('71:49:57')
    expect(formatReplayOffset(null)).toBe('—')
    expect(formatReplayOffset(-5)).toBe('0:00:00')
  })
})

describe('scrubber positions', () => {
  it('positions events proportionally between start and end timestamps', () => {
    const events = [
      event({ timestamp: '2026-06-11T01:00:00.000Z' }),
      event({ timestamp: '2026-06-11T01:00:30.000Z' }),
      event({ timestamp: '2026-06-11T01:01:00.000Z' })
    ]
    const positions = buildReplayPositions(events, '2026-06-11T01:00:00.000Z', '2026-06-11T01:01:00.000Z')
    expect(positions).toEqual([0, 0.5, 1])
  })

  it('falls back to index-proportional spacing without usable timestamps', () => {
    const events = [event({}), event({}), event({}), event({})]
    expect(buildReplayPositions(events, null, null)).toEqual([0, 1 / 3, 2 / 3, 1])
    expect(buildReplayPositions([event({})], null, null)).toEqual([0])
    expect(buildReplayPositions([], null, null)).toEqual([])
  })

  it('clamps events outside the window and interpolates missing timestamps', () => {
    const events = [
      event({ timestamp: '2026-06-10T23:00:00.000Z' }), // before start → 0
      event({ timestamp: null }), // no ts → index-proportional
      event({ timestamp: '2026-06-11T02:00:00.000Z' }) // after end → 1
    ]
    const positions = buildReplayPositions(events, '2026-06-11T01:00:00.000Z', '2026-06-11T01:30:00.000Z')
    expect(positions[0]).toBe(0)
    expect(positions[1]).toBe(0.5)
    expect(positions[2]).toBe(1)
  })

  it('finds the nearest event index for a track fraction', () => {
    const positions = [0, 0.5, 1]
    expect(nearestReplayIndex(positions, 0)).toBe(0)
    expect(nearestReplayIndex(positions, 0.2)).toBe(0)
    expect(nearestReplayIndex(positions, 0.3)).toBe(1)
    expect(nearestReplayIndex(positions, 0.9)).toBe(2)
    expect(nearestReplayIndex([], 0.5)).toBe(-1)
  })
})

describe('json highlight', () => {
  it('tokenizes keys, strings, numbers, literals and punctuation', () => {
    const tokens = tokenizeJson('{"a": "b", "n": 12.5, "ok": true, "x": null}')
    const byType = (type: string): string[] =>
      tokens.filter((t) => t.type === type).map((t) => t.text)

    expect(byType('key')).toEqual(['"a"', '"n"', '"ok"', '"x"'])
    expect(byType('string')).toEqual(['"b"'])
    expect(byType('number')).toEqual(['12.5'])
    expect(byType('literal')).toEqual(['true', 'null'])
    // round-trip: concatenated tokens reproduce the input exactly
    expect(tokens.map((t) => t.text).join('')).toBe('{"a": "b", "n": 12.5, "ok": true, "x": null}')
  })

  it('handles escaped quotes inside strings', () => {
    const tokens = tokenizeJson('{"k": "say \\"hi\\""}')
    expect(tokens.map((t) => t.text).join('')).toBe('{"k": "say \\"hi\\""}')
    expect(tokens.filter((t) => t.type === 'string').map((t) => t.text)).toEqual(['"say \\"hi\\""'])
  })

  it('pretty-prints valid json and truncates oversized payloads', () => {
    const pretty = formatReplayPayload('{"a":1}')
    expect(pretty.text).toBe('{\n  "a": 1\n}')
    expect(pretty.truncated).toBe(false)

    const raw = formatReplayPayload('not json at all')
    expect(raw.text).toBe('not json at all')

    const huge = formatReplayPayload(JSON.stringify({ data: 'y'.repeat(200_000) }))
    expect(huge.truncated).toBe(true)
    expect(huge.text.length).toBeLessThanOrEqual(100_100)
  })
})
