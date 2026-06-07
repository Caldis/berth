import { fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import '../../src/renderer/src/i18n'
import { Capabilities } from '../../src/renderer/src/pages/capabilities'
import { PageChromeProvider } from '../../src/renderer/src/components/layout/page-chrome'
import { useAppStore } from '../../src/renderer/src/stores/app'
import { FOCUS_HIGHLIGHT_CLASS } from '../../src/renderer/src/hooks/use-focus-target'
import type { Asset } from '../../src/shared/types/asset'

const PLUGIN_ID = 'plugin:acme/demo-plugin@1.0.0'

function pluginAsset(): Asset {
  return {
    id: PLUGIN_ID, agentId: 'claude-code', category: 'capability', type: 'plugin', scope: 'user',
    name: 'demo-plugin', path: 'C:/x/demo', meta: { marketplace: 'acme', version: '1.0.0', enabled: true }
  }
}
function skillComponent(): Asset {
  return {
    id: 'c-skill', agentId: 'claude-code', category: 'instruction', type: 'skill', scope: 'user',
    name: 'plugin-skill', path: 'C:/x/demo/skills/plugin-skill', meta: { pluginId: PLUGIN_ID, pluginName: 'demo-plugin', origin: 'plugin' }
  }
}
function mcpComponent(): Asset {
  return {
    id: 'c-mcp', agentId: 'claude-code', category: 'capability', type: 'mcp-server', scope: 'user',
    name: 'plugin-mcp', path: 'C:/x/demo/mcp', meta: { pluginId: PLUGIN_ID, pluginName: 'demo-plugin', origin: 'plugin', status: 'connected' }
  }
}

function LocationProbe(): React.ReactElement {
  const loc = useLocation()
  return <div data-testid="loc">{`${loc.pathname}|${JSON.stringify(loc.state)}`}</div>
}

function renderCaps(section: string, focusAssetId?: string): void {
  render(
    <MemoryRouter initialEntries={[{ pathname: `/capabilities/${section}`, state: focusAssetId ? { focusAssetId } : undefined }]}>
      <PageChromeProvider>
        <Capabilities activeSection={section} />
        <LocationProbe />
      </PageChromeProvider>
    </MemoryRouter>
  )
}

describe('Capabilities plugin↔component cross-navigation (GH-112)', () => {
  beforeEach(() => {
    useAppStore.setState({
      assets: [pluginAsset(), skillComponent(), mcpComponent()],
      agentView: 'all',
      scopeSelection: { mode: 'global' }
    })
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins: [] }))
  })

  it('jumps from a plugin bundled component to that component’s page with focus state', async () => {
    // The target route renders a bare probe (no useFocusTarget), so the focus
    // state survives for assertion instead of being consumed on arrival.
    render(
      <MemoryRouter initialEntries={['/capabilities/plugins']}>
        <PageChromeProvider>
          <Routes>
            <Route path="/capabilities/plugins" element={<Capabilities activeSection="plugins" />} />
            <Route path="/instructions/skills" element={<LocationProbe />} />
          </Routes>
        </PageChromeProvider>
      </MemoryRouter>
    )
    await screen.findByText('demo-plugin')
    fireEvent.click(screen.getByRole('button', { name: /Skills/ }))
    const row = await screen.findByTestId('plugin-component-c-skill')
    fireEvent.click(row)
    const loc = await screen.findByTestId('loc')
    expect(loc.textContent).toContain('/instructions/skills')
    expect(loc.textContent).toContain('c-skill')
  })

  it('highlights and expands the owning plugin when focused from a component', async () => {
    renderCaps('plugins', PLUGIN_ID)
    const card = document.getElementById(`plugin-card-${PLUGIN_ID}`)
    expect(card).not.toBeNull()
    expect(card?.className).toContain(FOCUS_HIGHLIGHT_CLASS.split(' ')[0])
    // Focus auto-expands the accordion → bundled component visible without manual click.
    expect(await screen.findByText('plugin-skill')).toBeInTheDocument()
  })

  it('shows a clickable plugin-origin badge on a plugin-provided MCP server', async () => {
    renderCaps('mcp')
    const badge = await screen.findByTestId(`plugin-origin-badge-${PLUGIN_ID}`)
    expect(within(badge).getByText('From demo-plugin')).toBeInTheDocument()
  })
})
