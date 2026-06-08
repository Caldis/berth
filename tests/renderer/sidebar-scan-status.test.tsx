import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { HeroUIProvider } from '@heroui/react'
import '../../src/renderer/src/i18n'
import { SidebarScanStatus } from '../../src/renderer/src/components/layout/sidebar-scan-status'
import { useAppStore, IDLE_ASSET_RUNTIME_STATUS } from '../../src/renderer/src/stores/app'
import type { Asset, AssetType } from '../../src/shared/types/asset'

function asset(id: string, type: AssetType): Asset {
  return { id, agentId: 'claude-code', category: 'capability', type, scope: 'user', name: id, path: `/x/${id}`, meta: {} }
}

function renderStatus(collapsed = false): ReturnType<typeof render> {
  return render(
    <HeroUIProvider>
      <SidebarScanStatus collapsed={collapsed} />
    </HeroUIProvider>
  )
}

describe('SidebarScanStatus (unified sidebar loading)', () => {
  beforeEach(() => {
    useAppStore.setState({ assetRuntimeStatus: IDLE_ASSET_RUNTIME_STATUS, assetErrors: [] })
  })

  it('renders a layout-neutral reserved slot when idle (no scan, no issues)', () => {
    useAppStore.setState({
      assetRuntimeStatus: { ...IDLE_ASSET_RUNTIME_STATUS, state: 'ready' },
      assetErrors: []
    })
    const { container } = renderStatus()
    // No active status element, but a fixed-size slot stays mounted so toggling
    // scan state never reflows the footer or the nav above it. (GH-113)
    expect(container.querySelector('[data-sidebar-scan-status]')).toBeNull()
    expect(container.querySelector('[data-sidebar-scan-slot]')).not.toBeNull()
  })

  it('shows a scanning indicator with progress in its accessible label', () => {
    useAppStore.setState({
      assetRuntimeStatus: {
        ...IDLE_ASSET_RUNTIME_STATUS,
        state: 'scanning',
        progress: { phase: 'parsing', current: 3, total: 10, label: 'skills' }
      },
      assetErrors: []
    })
    renderStatus()
    // Icon-only footer presence: label + progress live in the accessible name and
    // the hover panel, not as an inline text row that would shift layout.
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('Scanning'))
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('3/10'))
  })

  it('surfaces dropped scan errors when otherwise ready', () => {
    useAppStore.setState({
      assetRuntimeStatus: { ...IDLE_ASSET_RUNTIME_STATUS, state: 'ready' },
      assetErrors: [
        { path: 'x', type: 'skill', message: 'boom' },
        { path: 'y', type: 'mcp-server', message: 'bad' }
      ]
    })
    renderStatus()
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('2 scan issues'))
  })

  it('shows an error state', () => {
    useAppStore.setState({
      assetRuntimeStatus: { ...IDLE_ASSET_RUNTIME_STATUS, state: 'error', error: 'boom' },
      assetErrors: []
    })
    renderStatus()
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('Scan error'))
  })

  it('opens a progress popover visualizing per-category live counts (P4.6)', async () => {
    useAppStore.setState({
      assetRuntimeStatus: {
        ...IDLE_ASSET_RUNTIME_STATUS,
        state: 'scanning',
        progress: { phase: 'parsing', current: 1, total: 2, label: 'Claude Code' }
      },
      assetErrors: [],
      assets: [asset('s1', 'skill'), asset('p1', 'plugin'), asset('m1', 'mcp-server')]
    })
    renderStatus()

    fireEvent.click(screen.getByTestId('sidebar-scan-status-trigger'))

    const panel = await screen.findByTestId('sidebar-scan-progress')
    // Cumulative scanned total reflects the live asset list.
    expect(panel).toHaveTextContent('3 assets scanned')
    // Category taxonomy is visualized (full coverage, incl. conventions).
    expect(panel).toHaveTextContent('Skills')
    expect(panel).toHaveTextContent('Plugins')
    expect(panel).toHaveTextContent('Conventions')
    // Current scan phase is surfaced.
    expect(panel).toHaveTextContent('Reading assets')
    // A progress bar is rendered (HeroUI Progress).
    expect(panel.querySelector('[role="progressbar"]')).not.toBeNull()
  })
})
