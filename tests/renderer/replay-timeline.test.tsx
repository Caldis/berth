import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import type { SessionReplayEvent } from '@shared/types/ipc'
import { ReplayTimeline } from '../../src/renderer/src/components/sessions/replay-timeline'

// GH-120 AC3/4/6/8: canvas 时间轴的 DOM 语义层 — slider aria 契约、键盘步进/缩放、
// 点击拾取、window 拖动接线。canvas 像素不在 jsdom 断言 (getContext 返回 null,
// 组件必须容错), 绘制正确性由 replay-model 纯函数测试 + 真机视觉验收覆盖。

const event = (over: Partial<SessionReplayEvent>): SessionReplayEvent => ({
  id: 'L0B0',
  kind: 'user',
  timestamp: null,
  summary: 'hello',
  ...over
})

const EVENTS = [
  event({ id: 'a', kind: 'user', timestamp: '2026-06-11T01:00:00.000Z' }),
  event({ id: 'b', kind: 'tool', timestamp: '2026-06-11T01:00:50.000Z' }),
  event({ id: 'c', kind: 'assistant', timestamp: '2026-06-11T01:01:40.000Z' })
]
const TIMES = EVENTS.map((e) => Date.parse(e.timestamp as string))
const BOUNDS = { minMs: TIMES[0], maxMs: TIMES[2] } // 100s span

function mockRect(element: HTMLElement, width = 200, height = 64): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({ left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
  })
}

function renderTimeline(over: Partial<React.ComponentProps<typeof ReplayTimeline>> = {}): {
  onSelect: ReturnType<typeof vi.fn>
  onWindowDrag: ReturnType<typeof vi.fn>
  host: HTMLElement
} {
  const onSelect = vi.fn()
  const onWindowDrag = vi.fn()
  render(
    <ReplayTimeline
      events={EVENTS}
      times={TIMES}
      bounds={BOUNDS}
      waitGaps={[]}
      selectedIndex={-1}
      visibleRange={null}
      onSelect={onSelect}
      onWindowDrag={onWindowDrag}
      ariaLabel="Replay timeline"
      {...over}
    />
  )
  const host = screen.getByTestId('replay-timeline')
  mockRect(host)
  return { onSelect, onWindowDrag, host }
}

const firePointer = (target: HTMLElement, type: string, clientX: number, clientY = 32): void => {
  target.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true }))
}

describe('ReplayTimeline', () => {
  it('tolerates the jsdom null 2d context and renders the slider host', () => {
    const { host } = renderTimeline()
    expect(host).toBeInTheDocument()
    expect(host.querySelector('canvas')).not.toBeNull()
  })

  it('exposes slider semantics and steps through events with arrow keys', () => {
    const { onSelect, host } = renderTimeline({ selectedIndex: 1, ariaValueText: '2 / 3 · 0:00:50' })
    expect(host).toHaveAttribute('role', 'slider')
    expect(host).toHaveAttribute('aria-valuemin', '0')
    expect(host).toHaveAttribute('aria-valuemax', '2')
    expect(host).toHaveAttribute('aria-valuenow', '1')
    expect(host).toHaveAttribute('aria-valuetext', '2 / 3 · 0:00:50')

    fireEvent.keyDown(host, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenLastCalledWith(2)
    fireEvent.keyDown(host, { key: 'ArrowLeft' })
    expect(onSelect).toHaveBeenLastCalledWith(0)
    fireEvent.keyDown(host, { key: 'End' })
    expect(onSelect).toHaveBeenLastCalledWith(2)
    fireEvent.keyDown(host, { key: 'Home' })
    expect(onSelect).toHaveBeenLastCalledWith(0)
  })

  it('accepts zoom keys without breaking selection semantics', () => {
    const { onSelect, host } = renderTimeline({ selectedIndex: 1 })
    fireEvent.keyDown(host, { key: '+' })
    fireEvent.keyDown(host, { key: '-' })
    fireEvent.keyDown(host, { key: '0' })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('selects the nearest event on a stationary click', () => {
    const { onSelect, host } = renderTimeline()
    // 100s 跨 200px → times[1] (50s) 在 x=100
    firePointer(host, 'pointerdown', 100)
    firePointer(host, 'pointerup', 100)
    expect(onSelect).toHaveBeenLastCalledWith(1)
  })

  it('treats a moved pointer as a pan, not a click', () => {
    const { onSelect, host } = renderTimeline()
    firePointer(host, 'pointerdown', 100)
    firePointer(host, 'pointermove', 140)
    firePointer(host, 'pointerup', 140)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('drags the viewport window to drive the list scroll', () => {
    const { onWindowDrag, host } = renderTimeline({ visibleRange: { startIndex: 0, endIndex: 1 } })
    // window 矩形覆盖 times[0..1] → x ∈ [0, 100]; 从中心拖到右侧
    firePointer(host, 'pointerdown', 50)
    firePointer(host, 'pointermove', 70)
    expect(onWindowDrag).toHaveBeenCalled()
    const draggedStart = onWindowDrag.mock.calls.at(-1)![0] as number
    // +20px = +10s: window 起点从 0s 移到 ≈10s
    expect(draggedStart).toBeGreaterThan(TIMES[0] + 8_000)
    expect(draggedStart).toBeLessThan(TIMES[0] + 12_000)
  })

  it('renders nothing interactive without bounds', () => {
    render(
      <ReplayTimeline
        events={[event({ id: 'x' })]}
        times={[null]}
        bounds={null}
        waitGaps={[]}
        selectedIndex={-1}
        visibleRange={null}
        onSelect={() => {}}
        ariaLabel="Replay timeline"
      />
    )
    expect(screen.getByTestId('replay-timeline')).toHaveAttribute('tabindex', '-1')
  })
})
