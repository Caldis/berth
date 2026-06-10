import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ReplayScrubber } from '../../src/renderer/src/components/sessions/replay-scrubber'

function mockTrackRect(track: HTMLElement, width = 200): void {
  Object.defineProperty(track, 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({ left: 0, top: 0, right: width, bottom: 32, width, height: 32, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
  })
}

describe('ReplayScrubber', () => {
  it('exposes slider semantics and steps with arrow keys', () => {
    const onSelect = vi.fn()
    render(
      <ReplayScrubber
        positions={[0, 0.5, 1]}
        selectedIndex={1}
        onSelect={onSelect}
        ariaLabel="Replay position"
        ariaValueText="2 / 3 · 0:00:30"
      />
    )

    const slider = screen.getByRole('slider', { name: 'Replay position' })
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', '2')
    expect(slider).toHaveAttribute('aria-valuenow', '1')
    expect(slider).toHaveAttribute('aria-valuetext', '2 / 3 · 0:00:30')

    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenLastCalledWith(2)

    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(onSelect).toHaveBeenLastCalledWith(0)

    fireEvent.keyDown(slider, { key: 'End' })
    expect(onSelect).toHaveBeenLastCalledWith(2)

    fireEvent.keyDown(slider, { key: 'Home' })
    expect(onSelect).toHaveBeenLastCalledWith(0)
  })

  it('snaps pointer presses on the track to the nearest event', () => {
    const onSelect = vi.fn()
    render(
      <ReplayScrubber positions={[0, 0.5, 1]} selectedIndex={-1} onSelect={onSelect} ariaLabel="Replay position" />
    )

    const slider = screen.getByTestId('replay-scrubber')
    mockTrackRect(slider, 200)
    // jsdom 的 fireEvent.pointerDown 不携带 clientX — 用原生 MouseEvent 以 pointer 事件名派发
    const firePointer = (type: string, clientX: number): void => {
      slider.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }))
    }

    firePointer('pointerdown', 180)
    expect(onSelect).toHaveBeenLastCalledWith(2)

    firePointer('pointerdown', 80)
    expect(onSelect).toHaveBeenLastCalledWith(1)

    // 拖拽: pointerDown 后 move 持续吸附
    firePointer('pointermove', 10)
    expect(onSelect).toHaveBeenLastCalledWith(0)

    // pointerUp 结束拖拽, 后续 move 不再触发
    firePointer('pointerup', 10)
    onSelect.mockClear()
    firePointer('pointermove', 190)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('moves the handle to the selected position', () => {
    const { rerender } = render(
      <ReplayScrubber positions={[0, 0.25, 1]} selectedIndex={-1} onSelect={() => {}} ariaLabel="Replay position" />
    )
    expect(screen.getByTestId('replay-scrubber-handle').style.left).toBe('0%')

    rerender(
      <ReplayScrubber positions={[0, 0.25, 1]} selectedIndex={1} onSelect={() => {}} ariaLabel="Replay position" />
    )
    expect(screen.getByTestId('replay-scrubber-handle').style.left).toBe('25%')
  })
})
