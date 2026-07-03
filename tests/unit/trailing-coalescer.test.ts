import { afterEach, describe, expect, it, vi } from 'vitest'
import { TrailingCoalescer } from '@berth/scan-engine/engine/assets/trailing-coalescer'

// GH-151 S7: the assets:changed broadcast coalescer. Leading+trailing so a lone
// event (the common single-file edit) reaches the renderer instantly, while a
// burst (git checkout touching dozens of files, an active session transcript)
// collapses to at most one broadcast per window — each renderer subscriber
// re-queries on every event, so the event rate IS the IPC amplification factor.

describe('TrailingCoalescer', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits a lone event immediately (leading edge)', () => {
    vi.useFakeTimers()
    const emitted: string[] = []
    const coalescer = new TrailingCoalescer<string>((e) => emitted.push(e), 250)

    coalescer.push('a')

    expect(emitted).toEqual(['a'])
  })

  it('collapses a burst to leading + latest-at-trailing-edge', () => {
    vi.useFakeTimers()
    const emitted: string[] = []
    const coalescer = new TrailingCoalescer<string>((e) => emitted.push(e), 250)

    coalescer.push('a') // leading — out immediately
    coalescer.push('b') // buffered
    coalescer.push('c') // overwrites b (latest-wins)
    expect(emitted).toEqual(['a'])

    vi.advanceTimersByTime(250)
    expect(emitted).toEqual(['a', 'c']) // b never emitted
  })

  it('bounds a sustained storm to one emit per window', () => {
    vi.useFakeTimers()
    const emitted: string[] = []
    const coalescer = new TrailingCoalescer<string>((e) => emitted.push(e), 250)

    // 2 seconds of an event every 10ms — 200 events.
    for (let t = 0; t < 2000; t += 10) {
      coalescer.push(`e${t}`)
      vi.advanceTimersByTime(10)
    }

    // Leading + at most one per 250ms window: ≤ 1 + 2000/250 = 9.
    expect(emitted.length).toBeGreaterThan(1)
    expect(emitted.length).toBeLessThanOrEqual(9)
    expect(emitted[emitted.length - 1]).toBe('e1990') // the storm's latest event is never lost
  })

  it('dispose cancels the pending trailing emit', () => {
    vi.useFakeTimers()
    const emitted: string[] = []
    const coalescer = new TrailingCoalescer<string>((e) => emitted.push(e), 250)

    coalescer.push('a')
    coalescer.push('b')
    coalescer.dispose()
    vi.advanceTimersByTime(1000)

    expect(emitted).toEqual(['a'])
  })
})
