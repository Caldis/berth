import { describe, it, expect } from 'vitest'
import { ProgressCoalescer } from '../src/engine/assets/progress-coalescer'
import type { AssetScanProgress } from '@shared/types/ipc'

/** Parsing tick factory — only the bits the coalescer routes on (phase) plus a
 * currentPath so we can assert latest-wins. */
function tick(currentPath: string, phase: AssetScanProgress['phase'] = 'parsing'): AssetScanProgress {
  return { phase, current: 0, total: 1, currentPath }
}

describe('ProgressCoalescer (GH-10 IPC throttle)', () => {
  it('emits the first event immediately', () => {
    const out: AssetScanProgress[] = []
    const c = new ProgressCoalescer((p) => out.push(p), 50, () => 0)
    c.push(tick('a'))
    expect(out.map((p) => p.currentPath)).toEqual(['a'])
  })

  it('coalesces within the window (latest-wins, bounded emission rate)', () => {
    const out: AssetScanProgress[] = []
    let now = 0
    const c = new ProgressCoalescer((p) => out.push(p), 50, () => now)
    // First emits at t=0; the rest fall inside the 50ms window → buffered, latest-wins.
    c.push(tick('a')) // t=0  → emit
    now = 10
    c.push(tick('b')) // buffered
    now = 20
    c.push(tick('c')) // buffered (overwrites b)
    now = 40
    c.push(tick('d')) // buffered (overwrites c)
    expect(out.map((p) => p.currentPath)).toEqual(['a'])
    // Window elapses → next push emits the newest, not the stale buffer.
    now = 60
    c.push(tick('e')) // 60 - 0 >= 50 → emit
    expect(out.map((p) => p.currentPath)).toEqual(['a', 'e'])
  })

  it('bounds emission rate: 1000 ticks across 1s @50ms window emit at most ~21', () => {
    const out: AssetScanProgress[] = []
    let now = 0
    const c = new ProgressCoalescer((p) => out.push(p), 50, () => now)
    for (let i = 0; i < 1000; i++) {
      now = i // 1ms apart → 1000ms total
      c.push(tick(`f${i}`))
    }
    c.flush()
    // 1000ms / 50ms window = 20 windows + the initial immediate emit + a flushed
    // tail. Far below 1000 — the whole point: per-file emission can't saturate IPC.
    expect(out.length).toBeLessThanOrEqual(22)
    expect(out.length).toBeGreaterThan(0)
  })

  it('flush() always delivers the buffered terminal event', () => {
    const out: AssetScanProgress[] = []
    let now = 0
    const c = new ProgressCoalescer((p) => out.push(p), 50, () => now)
    c.push(tick('a')) // emit
    now = 10
    c.push(tick('terminal')) // buffered (within window)
    expect(out.map((p) => p.currentPath)).toEqual(['a'])
    c.flush()
    expect(out.map((p) => p.currentPath)).toEqual(['a', 'terminal'])
  })

  it('flush() is a no-op when nothing is buffered (terminal not double-sent)', () => {
    const out: AssetScanProgress[] = []
    const c = new ProgressCoalescer((p) => out.push(p), 50, () => 0)
    c.push(tick('a')) // emitted immediately, nothing buffered
    c.flush()
    c.flush()
    expect(out.map((p) => p.currentPath)).toEqual(['a'])
  })

  it('emits immediately on a phase change even inside the window', () => {
    const out: AssetScanProgress[] = []
    let now = 0
    const c = new ProgressCoalescer((p) => out.push(p), 50, () => now)
    c.push(tick('a', 'parsing')) // emit
    now = 5
    c.push(tick('b', 'indexing')) // phase changed → emit immediately, not buffered
    expect(out.map((p) => p.phase)).toEqual(['parsing', 'indexing'])
  })

  it('does not drop a terminal phase-change tick after buffered parsing ticks', () => {
    const out: AssetScanProgress[] = []
    let now = 0
    const c = new ProgressCoalescer((p) => out.push(p), 50, () => now)
    c.push(tick('a', 'parsing')) // emit
    now = 10
    c.push(tick('b', 'parsing')) // buffered
    now = 20
    c.push(tick('done', 'indexing')) // phase change → emit immediately (the buffered
    // 'b' is discarded — only the latest matters; the terminal phase is delivered)
    expect(out.map((p) => p.phase)).toEqual(['parsing', 'indexing'])
    expect(out[out.length - 1].currentPath).toBe('done')
  })
})
