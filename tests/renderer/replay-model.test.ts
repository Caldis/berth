import { describe, expect, it } from 'vitest'
import type { SessionReplayEvent } from '@shared/types/ipc'
import {
  REPLAY_LANES,
  REPLAY_WAIT_THRESHOLD_MS,
  bucketReplayEvents,
  buildReplayTimePoints,
  computeWaitGaps,
  filterReplayEvents,
  formatReplayOffset,
  nearestTimeIndex,
  panViewportBy,
  replayOffsetMs,
  selectTickStep,
  timeToX,
  xToTime,
  zoomViewportAt
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

describe('timeline time points', () => {
  const t = (iso: string): number => Date.parse(iso)

  it('builds absolute times with padded bounds from session window', () => {
    const events = [
      event({ timestamp: '2026-06-11T01:00:00.000Z' }),
      event({ timestamp: null }),
      event({ timestamp: '2026-06-11T01:10:00.000Z' })
    ]
    const { bounds, times } = buildReplayTimePoints(events, '2026-06-11T01:00:00.000Z', '2026-06-11T01:10:00.000Z')
    expect(times).toEqual([t('2026-06-11T01:00:00.000Z'), null, t('2026-06-11T01:10:00.000Z')])
    expect(bounds).not.toBeNull()
    // 1% padding on both sides of the 10-minute span
    expect(bounds!.minMs).toBeLessThan(t('2026-06-11T01:00:00.000Z'))
    expect(bounds!.maxMs).toBeGreaterThan(t('2026-06-11T01:10:00.000Z'))
  })

  it('extends bounds to cover events outside the declared window', () => {
    const events = [event({ timestamp: '2026-06-11T00:50:00.000Z' })]
    const { bounds } = buildReplayTimePoints(events, '2026-06-11T01:00:00.000Z', '2026-06-11T01:10:00.000Z')
    expect(bounds!.minMs).toBeLessThanOrEqual(t('2026-06-11T00:50:00.000Z'))
  })

  it('returns null bounds without any usable timestamp and pads single-instant sessions', () => {
    expect(buildReplayTimePoints([event({}), event({})], null, null).bounds).toBeNull()
    const single = buildReplayTimePoints([event({ timestamp: '2026-06-11T01:00:00.000Z' })], null, null)
    expect(single.bounds!.maxMs - single.bounds!.minMs).toBeGreaterThan(0)
  })
})

describe('timeline viewport math', () => {
  const bounds = { minMs: 0, maxMs: 100_000 }

  it('converts time to x and back across the viewport', () => {
    const vp = { startMs: 0, endMs: 50_000 }
    expect(timeToX(0, vp, 1000)).toBe(0)
    expect(timeToX(25_000, vp, 1000)).toBe(500)
    expect(timeToX(50_000, vp, 1000)).toBe(1000)
    expect(xToTime(500, vp, 1000)).toBe(25_000)
    expect(xToTime(timeToX(31_337, vp, 1000), vp, 1000)).toBeCloseTo(31_337, 6)
  })

  it('zooms around an anchor keeping its time at the same fraction', () => {
    const vp = { startMs: 0, endMs: 100_000 }
    const zoomed = zoomViewportAt(vp, 25_000, 0.5, bounds)
    expect(zoomed.endMs - zoomed.startMs).toBe(50_000)
    // anchor was at fraction 0.25 → stays there: start = 25_000 - 0.25*50_000
    expect(zoomed.startMs).toBe(12_500)
    expect(zoomed.endMs).toBe(62_500)
  })

  it('clamps zoom-out to bounds and zoom-in to the minimum span', () => {
    const out = zoomViewportAt({ startMs: 10_000, endMs: 20_000 }, 15_000, 100, bounds)
    expect(out).toEqual({ startMs: 0, endMs: 100_000 })
    const tiny = zoomViewportAt({ startMs: 0, endMs: 10_000 }, 5_000, 0.000001, bounds, 1_000)
    expect(tiny.endMs - tiny.startMs).toBe(1_000)
  })

  it('pans within bounds and clamps at the edges', () => {
    const vp = { startMs: 10_000, endMs: 30_000 }
    expect(panViewportBy(vp, 5_000, bounds)).toEqual({ startMs: 15_000, endMs: 35_000 })
    expect(panViewportBy(vp, -50_000, bounds)).toEqual({ startMs: 0, endMs: 20_000 })
    expect(panViewportBy(vp, 500_000, bounds)).toEqual({ startMs: 80_000, endMs: 100_000 })
  })

  it('finds the nearest event index within a tolerance', () => {
    const times = [0, null, 10_000, 20_000]
    expect(nearestTimeIndex(times, 9_000, 2_000)).toBe(2)
    expect(nearestTimeIndex(times, 4_000, 2_000)).toBe(-1)
    expect(nearestTimeIndex(times, 0, 2_000)).toBe(0)
    expect(nearestTimeIndex([null, null], 0, 2_000)).toBe(-1)
  })
})

describe('timeline ticks, gaps and buckets', () => {
  it('selects a readable tick step for the visible span', () => {
    expect(selectTickStep(10_000)).toBe(2_000) // 10s span → 2s ticks
    expect(selectTickStep(60_000)).toBe(15_000)
    expect(selectTickStep(3_600_000)).toBe(900_000) // 1h → 15m
    expect(selectTickStep(1_000)).toBeLessThanOrEqual(250)
  })

  it('detects waits above the threshold between consecutive timed events', () => {
    const times = [0, 30_000, null, 30_000 + REPLAY_WAIT_THRESHOLD_MS + 5_000, 999_999_999]
    const gaps = computeWaitGaps(times, REPLAY_WAIT_THRESHOLD_MS)
    expect(gaps[0]).toEqual({
      startMs: 30_000,
      endMs: 30_000 + REPLAY_WAIT_THRESHOLD_MS + 5_000,
      afterIndex: 1
    })
    expect(computeWaitGaps([0, 10_000], REPLAY_WAIT_THRESHOLD_MS)).toEqual([])
    expect(computeWaitGaps([], REPLAY_WAIT_THRESHOLD_MS)).toEqual([])
  })

  it('assigns kinds to the three semantic lanes', () => {
    expect(REPLAY_LANES.user).toBe(0)
    expect(REPLAY_LANES.assistant).toBe(0)
    expect(REPLAY_LANES.thinking).toBe(0)
    expect(REPLAY_LANES.tool).toBe(1)
    expect(REPLAY_LANES.result).toBe(1)
    expect(REPLAY_LANES.model).toBe(2)
    expect(REPLAY_LANES.system).toBe(2)
  })

  it('buckets visible events per lane and pixel, escalating errors', () => {
    const events = [
      event({ kind: 'user', timestamp: '2026-06-11T01:00:00.000Z' }),
      event({ kind: 'tool', timestamp: '2026-06-11T01:00:00.010Z' }),
      event({ kind: 'tool', status: 'error', timestamp: '2026-06-11T01:00:00.020Z' }),
      event({ kind: 'model', timestamp: '2026-06-11T01:00:50.000Z' }),
      event({ kind: 'user', timestamp: null }), // no timestamp → not drawn
      event({ kind: 'user', timestamp: '2026-06-11T02:00:00.000Z' }) // outside viewport → skipped
    ]
    const times = events.map((e) => (e.timestamp ? Date.parse(e.timestamp) : null))
    const vp = { startMs: Date.parse('2026-06-11T01:00:00.000Z'), endMs: Date.parse('2026-06-11T01:01:40.000Z') }
    const buckets = bucketReplayEvents(events, times, vp, 100)

    // user@x0 lane0; tools@x0 lane1 merged (count 2, error escalates); model@x50 lane2
    const lane0 = buckets.filter((b) => b.lane === 0)
    const lane1 = buckets.filter((b) => b.lane === 1)
    const lane2 = buckets.filter((b) => b.lane === 2)
    expect(lane0).toHaveLength(1)
    expect(lane0[0]).toMatchObject({ x: 0, count: 1, kind: 'user', error: false, firstIndex: 0 })
    expect(lane1).toHaveLength(1)
    expect(lane1[0]).toMatchObject({ x: 0, count: 2, error: true, firstIndex: 1 })
    expect(lane2).toHaveLength(1)
    expect(lane2[0]).toMatchObject({ x: 50, kind: 'model' })
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
