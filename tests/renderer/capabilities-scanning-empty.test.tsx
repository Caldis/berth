import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../src/renderer/src/i18n'
import { Capabilities } from '../../src/renderer/src/pages/capabilities'
import { PageChromeProvider } from '../../src/renderer/src/components/layout/page-chrome'
import { useAppStore, IDLE_ASSET_RUNTIME_STATUS } from '../../src/renderer/src/stores/app'
import type { Asset } from '../../src/shared/types/asset'

// GH-113 (per-root 完成度 / 空态不误导, SPEC A4): while a full scan is still in
// flight, a tab whose category hasn't been reached yet must show a skeleton — not a
// misleading "nothing here". The snapshot is partial, not complete-and-empty. The
// old guard keyed on `assets.length === 0` (whole-snapshot empty), so a partial scan
// that had reached *some* assets but not this tab fell through to EmptyState.
function hookAsset(): Asset {
  return {
    id: 'h1',
    agentId: 'codex',
    category: 'capability',
    type: 'hook',
    scope: 'user',
    name: 'Stop hook',
    path: 'C:\\Users\\test\\.codex\\config.toml',
    meta: { eventType: 'Stop' }
  }
}

function renderMcpTab(): void {
  render(
    <MemoryRouter initialEntries={['/capabilities/mcp']}>
      <PageChromeProvider>
        <Capabilities activeSection="mcp" />
      </PageChromeProvider>
    </MemoryRouter>
  )
}

describe('Capabilities tab empty-vs-loading during a partial scan (GH-113 A4)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins: [] }))
    useAppStore.setState({ agentView: 'all', scopeSelection: { mode: 'global' } })
  })

  it('shows a skeleton (not empty) when the mcp tab is empty but a full scan is still running', () => {
    // Partial scan: a hook has already arrived, but the mcp category hasn't been
    // reached yet — must not claim "nothing here".
    useAppStore.setState({
      assets: [hookAsset()],
      scanning: true,
      assetRuntimeStatus: { ...IDLE_ASSET_RUNTIME_STATUS, state: 'scanning' }
    })
    renderMcpTab()
    expect(screen.getByText(/Scanning/)).toBeTruthy()
    expect(document.querySelector('.border-dashed')).toBeNull()
  })

  it('shows the empty state once the scan is ready and the tab is genuinely empty', () => {
    useAppStore.setState({
      assets: [hookAsset()],
      scanning: false,
      assetRuntimeStatus: { ...IDLE_ASSET_RUNTIME_STATUS, state: 'ready' }
    })
    renderMcpTab()
    expect(document.querySelector('.border-dashed')).not.toBeNull()
  })
})
