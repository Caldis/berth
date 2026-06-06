import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroUIProvider } from '@heroui/react'
import '../../src/renderer/src/i18n'
import { SidebarScanStatus } from '../../src/renderer/src/components/layout/sidebar-scan-status'
import { useAppStore, IDLE_ASSET_RUNTIME_STATUS } from '../../src/renderer/src/stores/app'

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

  it('is hidden in the steady ready state with no scan issues', () => {
    useAppStore.setState({
      assetRuntimeStatus: { ...IDLE_ASSET_RUNTIME_STATUS, state: 'ready' },
      assetErrors: []
    })
    const { container } = renderStatus()
    expect(container.querySelector('[data-sidebar-scan-status]')).toBeNull()
  })

  it('shows a scanning indicator with progress', () => {
    useAppStore.setState({
      assetRuntimeStatus: {
        ...IDLE_ASSET_RUNTIME_STATUS,
        state: 'scanning',
        progress: { phase: 'parsing', current: 3, total: 10, label: 'skills' }
      },
      assetErrors: []
    })
    renderStatus()
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Scanning')
    expect(status).toHaveTextContent('3/10')
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
    expect(screen.getByRole('status')).toHaveTextContent('2 scan issues')
  })

  it('shows an error state', () => {
    useAppStore.setState({
      assetRuntimeStatus: { ...IDLE_ASSET_RUNTIME_STATUS, state: 'error', error: 'boom' },
      assetErrors: []
    })
    renderStatus()
    expect(screen.getByRole('status')).toHaveTextContent('Scan error')
  })
})
