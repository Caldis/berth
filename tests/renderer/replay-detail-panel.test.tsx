import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import type { SessionReplayEvent } from '@shared/types/ipc'
import {
  ReplayDetailPanel,
  type ReplayPayloadState
} from '../../src/renderer/src/components/sessions/replay-detail-panel'

// GH-120 AC7: 右侧面板 — 拖宽手柄 (separator + 键盘)、全屏 toggle + Esc、导出两档。

const EVENT: SessionReplayEvent = {
  id: 'L1B0',
  kind: 'tool',
  timestamp: '2026-06-11T01:00:05.000Z',
  summary: '{"command":"pnpm test"}',
  toolName: 'Bash'
}

function renderPanel(over: Partial<React.ComponentProps<typeof ReplayDetailPanel>> = {}): {
  onResize: ReturnType<typeof vi.fn>
  onToggleExpanded: ReturnType<typeof vi.fn>
  onExportEvent: ReturnType<typeof vi.fn>
  onExportStream: ReturnType<typeof vi.fn>
} {
  const onResize = vi.fn()
  const onToggleExpanded = vi.fn()
  const onExportEvent = vi.fn()
  const onExportStream = vi.fn()
  render(
    <ReplayDetailPanel
      event={EVENT}
      offsetMs={5000}
      payload={{ status: 'ready', json: '{"type":"tool_use"}' } as ReplayPayloadState}
      onClose={() => {}}
      expanded={false}
      onToggleExpanded={onToggleExpanded}
      width={400}
      onResize={onResize}
      onExportEvent={onExportEvent}
      onExportStream={onExportStream}
      {...over}
    />
  )
  return { onResize, onToggleExpanded, onExportEvent, onExportStream }
}

describe('ReplayDetailPanel resize handle', () => {
  it('exposes separator semantics and resizes with arrow keys (left = wider)', () => {
    const { onResize } = renderPanel()
    const handle = screen.getByRole('separator', { name: 'Resize detail panel' })
    expect(handle).toHaveAttribute('aria-valuenow', '400')
    expect(handle).toHaveAttribute('aria-orientation', 'vertical')

    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(onResize).toHaveBeenLastCalledWith(416)
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(onResize).toHaveBeenLastCalledWith(384)
  })

  it('resizes by pointer drag from the left edge', () => {
    const { onResize } = renderPanel()
    const handle = screen.getByRole('separator', { name: 'Resize detail panel' })
    handle.dispatchEvent(new MouseEvent('pointerdown', { clientX: 500, bubbles: true }))
    handle.dispatchEvent(new MouseEvent('pointermove', { clientX: 460, bubbles: true }))
    expect(onResize).toHaveBeenLastCalledWith(440)
    handle.dispatchEvent(new MouseEvent('pointerup', { clientX: 460, bubbles: true }))
    onResize.mockClear()
    handle.dispatchEvent(new MouseEvent('pointermove', { clientX: 400, bubbles: true }))
    expect(onResize).not.toHaveBeenCalled()
  })
})

describe('ReplayDetailPanel expand', () => {
  it('toggles expansion from the header button and exits with Escape', () => {
    const { onToggleExpanded } = renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Expand to full view' }))
    expect(onToggleExpanded).toHaveBeenCalledTimes(1)
  })

  it('shows the collapse affordance and handles Escape when expanded', () => {
    const { onToggleExpanded } = renderPanel({ expanded: true })
    const panel = screen.getByTestId('replay-detail-panel')
    expect(screen.getByRole('button', { name: 'Exit full view' })).toBeInTheDocument()
    fireEvent.keyDown(panel, { key: 'Escape' })
    expect(onToggleExpanded).toHaveBeenCalledTimes(1)
  })
})

describe('ReplayDetailPanel export', () => {
  it('offers both export scopes and fires the callbacks', async () => {
    const { onExportEvent, onExportStream } = renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    const menu = await screen.findByRole('menu')
    fireEvent.click(screen.getByRole('menuitem', { name: /Export this event/ }))
    expect(onExportEvent).toHaveBeenCalledTimes(1)
    expect(menu).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    await screen.findByRole('menu')
    fireEvent.click(screen.getByRole('menuitem', { name: /Export filtered events/ }))
    expect(onExportStream).toHaveBeenCalledTimes(1)
  })

  it('disables the single-event export while the payload is not ready', async () => {
    renderPanel({ payload: { status: 'loading' } })
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    const item = await screen.findByRole('menuitem', { name: /Export this event/ })
    expect(item).toHaveAttribute('aria-disabled', 'true')
  })
})
