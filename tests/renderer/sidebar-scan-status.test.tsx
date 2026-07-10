import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HeroUIProvider } from '@heroui/react'
import '../../src/renderer/src/i18n'
import { SidebarScanStatus, ScanProgressPanel } from '../../src/renderer/src/components/layout/sidebar-scan-status'
import { useAppStore, IDLE_ASSET_RUNTIME_STATUS } from '../../src/renderer/src/stores/app'
import type { Asset, AssetType } from '@shared/types/asset'
import type { ScanEngineInfo } from '@shared/types/ipc'

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
    useAppStore.setState({
      assetRuntimeStatus: IDLE_ASSET_RUNTIME_STATUS,
      assetErrors: [],
      scopeSelection: { mode: 'global' }
    })
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

  // GH-155 决策⑤ 收敛: 后台 deep-index 首轮进度并入侧栏指示器 (原每页 GlobalIndexingBanner 已移除)。
  it('surfaces background deep-index progress while otherwise idle in global scope', () => {
    useAppStore.setState({
      scopeSelection: { mode: 'global' },
      assetRuntimeStatus: {
        ...IDLE_ASSET_RUNTIME_STATUS,
        state: 'ready',
        backgroundIndex: { state: 'indexing', indexedProjects: 2, totalProjects: 5 }
      },
      assetErrors: []
    })
    renderStatus()
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Indexed 2/5 projects')
  })

  it.each([
    ['done', { state: 'done', indexedProjects: 5, totalProjects: 5 }],
    ['revalidating', { state: 'revalidating', indexedProjects: 5, totalProjects: 5 }],
    ['M=0', { state: 'indexing', indexedProjects: 0, totalProjects: 0 }]
  ] as const)('keeps the idle slot when background index is %s', (_label, backgroundIndex) => {
    useAppStore.setState({
      scopeSelection: { mode: 'global' },
      assetRuntimeStatus: { ...IDLE_ASSET_RUNTIME_STATUS, state: 'ready', backgroundIndex },
      assetErrors: []
    })
    const { container } = renderStatus()
    expect(container.querySelector('[data-sidebar-scan-status]')).toBeNull()
    expect(container.querySelector('[data-sidebar-scan-slot]')).not.toBeNull()
  })

  it('keeps the idle slot for background indexing outside global scope', () => {
    useAppStore.setState({
      scopeSelection: { mode: 'user' },
      assetRuntimeStatus: {
        ...IDLE_ASSET_RUNTIME_STATUS,
        state: 'ready',
        backgroundIndex: { state: 'indexing', indexedProjects: 1, totalProjects: 3 }
      },
      assetErrors: []
    })
    const { container } = renderStatus()
    expect(container.querySelector('[data-sidebar-scan-status]')).toBeNull()
  })

  it('renders the scan failure message inside the progress panel (GH-115 T6: status.error 不再零渲染)', () => {
    useAppStore.setState({
      assetRuntimeStatus: { ...IDLE_ASSET_RUNTIME_STATUS, state: 'error', error: 'ENOENT: scan worker missing' },
      assetErrors: []
    })
    renderStatus()

    fireEvent.click(screen.getByTestId('sidebar-scan-status-trigger'))
    expect(screen.getByTestId('scan-status-error-message')).toHaveTextContent('ENOENT: scan worker missing')
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

  // GH-135 E2: ScanProgressPanel surfaces engine-computed ETA + rate, the next
  // scheduled scan, paused state, and dispatches index control commands. Rendered
  // directly (not via the hover popover, which detaches too fast in jsdom for
  // live-tree button queries).
  // Capture the setup baseline before overriding so the new mock can't recurse.
  function mockEngineInfo(scheduler: Partial<ScanEngineInfo['scheduler']>): void {
    const baseline = window.api.assets.engineInfo
    window.api.assets.engineInfo = vi.fn(async (): Promise<ScanEngineInfo> => {
      const base = (await baseline()) as ScanEngineInfo
      return { ...base, scheduler: { ...base.scheduler, ...scheduler } }
    })
  }

  function renderPanel(): ReturnType<typeof render> {
    return render(
      <HeroUIProvider>
        <ScanProgressPanel />
      </HeroUIProvider>
    )
  }

  it('surfaces engine ETA and rate while scanning (GH-135 E2)', () => {
    useAppStore.setState({
      assetRuntimeStatus: {
        ...IDLE_ASSET_RUNTIME_STATUS,
        state: 'scanning',
        progress: { phase: 'parsing', current: 4, total: 10, label: 'skills', etaMs: 5000, ratePerSec: 12 }
      },
      assetErrors: []
    })
    renderPanel()
    expect(screen.getByText('~5s left', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('12/s', { exact: false })).toBeInTheDocument()
  })

  it('shows the next scheduled scan time when idle (GH-135 E2)', async () => {
    mockEngineInfo({
      paused: false,
      periodicScan: { enabled: true, intervalMs: 86_400_000, nextScanAt: '2026-06-15T14:30:00.000Z' }
    })
    useAppStore.setState({ assetRuntimeStatus: { ...IDLE_ASSET_RUNTIME_STATUS, state: 'ready' }, assetErrors: [] })
    renderPanel()
    expect(await screen.findByText('Next scan', { exact: false })).toBeInTheDocument()
  })

  it('dispatches pause and cancel commands while scanning (GH-135 E2)', async () => {
    const pause = vi.fn(async () => (await window.api.assets.engineInfo()) as ScanEngineInfo)
    const cancel = vi.fn(async () => IDLE_ASSET_RUNTIME_STATUS)
    window.api.assets.pause = pause
    window.api.assets.cancel = cancel
    useAppStore.setState({
      assetRuntimeStatus: {
        ...IDLE_ASSET_RUNTIME_STATUS,
        state: 'scanning',
        progress: { phase: 'parsing', current: 1, total: 4, label: 'skills' }
      },
      assetErrors: []
    })
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(pause).toHaveBeenCalled())
    expect(cancel).toHaveBeenCalled()
  })

  it('dispatches resume when paused (GH-135 E2)', async () => {
    const resume = vi.fn(async () => (await window.api.assets.engineInfo()) as ScanEngineInfo)
    mockEngineInfo({ paused: true })
    window.api.assets.resume = resume
    useAppStore.setState({ assetRuntimeStatus: { ...IDLE_ASSET_RUNTIME_STATUS, state: 'ready' }, assetErrors: [] })
    renderPanel()
    const resumeButton = await screen.findByRole('button', { name: 'Resume' })
    fireEvent.click(resumeButton)
    await waitFor(() => expect(resume).toHaveBeenCalled())
  })
})
