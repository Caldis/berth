import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import '../../src/renderer/src/i18n'
import { Capabilities } from '../../src/renderer/src/pages/capabilities'
import { PageChromeProvider } from '../../src/renderer/src/components/layout/page-chrome'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { Asset } from '../../src/shared/types/asset'

const PLUGIN_ID = 'plugin:acme/demo-plugin@1.0.0'

function pluginAsset(): Asset {
  return {
    id: PLUGIN_ID,
    agentId: 'claude-code',
    category: 'capability',
    type: 'plugin',
    scope: 'user',
    name: 'demo-plugin',
    path: 'C:/Users/test/.claude/plugins/cache/acme/demo-plugin/1.0.0',
    meta: { marketplace: 'acme', version: '1.0.0', enabled: true }
  }
}

function componentAsset(id: string, type: Asset['type'], name: string): Asset {
  return {
    id,
    agentId: 'claude-code',
    category: type === 'skill' ? 'instruction' : 'capability',
    type,
    scope: 'user',
    name,
    path: `C:/Users/test/.claude/plugins/cache/acme/demo-plugin/1.0.0/${type}/${name}`,
    meta: { pluginId: PLUGIN_ID, origin: 'plugin' }
  }
}

function renderCapabilities(activeSection = 'plugins'): void {
  render(
    <MemoryRouter initialEntries={[`/capabilities/${activeSection}`]}>
      <PageChromeProvider>
        <Capabilities activeSection={activeSection} />
      </PageChromeProvider>
    </MemoryRouter>
  )
}

describe('Capabilities plugins tab — plugin↔component relations', () => {
  beforeEach(() => {
    useAppStore.setState({
      assets: [
        pluginAsset(),
        componentAsset('c-skill', 'skill', 'plugin-skill'),
        componentAsset('c-mcp', 'mcp-server', 'plugin-mcp')
      ],
      agentView: 'all',
      scopeSelection: { mode: 'global' }
    })
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins: [] }))
  })

  it('shows the plugin with marketplace, enabled state and component count', async () => {
    renderCapabilities('plugins')
    expect(await screen.findByText('demo-plugin')).toBeInTheDocument()
    expect(screen.getByText('acme')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('2 components')).toBeInTheDocument()
  })

  it('groups bundled components by type and reveals them on expand', async () => {
    renderCapabilities('plugins')
    await screen.findByText('demo-plugin')

    // Skills group is present; expanding it reveals the bundled skill.
    const skillsGroup = screen.getByRole('button', { name: /Skills/ })
    fireEvent.click(skillsGroup)
    expect(await screen.findByText('plugin-skill')).toBeInTheDocument()

    // MCP group present too.
    expect(screen.getByRole('button', { name: /MCP/ })).toBeInTheDocument()
  })
})
