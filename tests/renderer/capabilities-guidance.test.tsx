import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import '../../src/renderer/src/i18n'
import { Capabilities } from '../../src/renderer/src/pages/capabilities'
import { TopNavigation } from '../../src/renderer/src/components/layout/top-navigation'
import { PageChromeProvider } from '../../src/renderer/src/components/layout/page-chrome'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { Asset } from '@shared/types/asset'
import type { AgentCapabilityPlugin } from '@shared/types/agent-plugin'

function hookAsset(): Asset {
  return {
    id: 'codex-stop',
    agentId: 'codex',
    category: 'capability',
    type: 'hook',
    scope: 'user',
    name: 'Stop hook',
    path: 'C:\\Users\\test\\.codex\\config.toml',
    meta: {
      eventType: 'Stop',
      command: 'pwsh hooks\\stop.ps1'
    }
  }
}

function scopedHookAsset(
  id: string,
  scope: Asset['scope'],
  path: string,
  command: string,
  projectPath?: string
): Asset {
  return {
    id,
    agentId: 'codex',
    category: 'capability',
    type: 'hook',
    scope,
    name: id,
    path,
    meta: {
      eventType: 'Stop',
      command,
      // Cross-project assets carry an explicit owner under the GH-113 T3 model.
      ...(projectPath ? { projectPath } : {})
    }
  }
}

function statusLineAsset(): Asset {
  return {
    id: 'codex-status',
    agentId: 'codex',
    category: 'capability',
    type: 'statusline',
    scope: 'user',
    name: 'TUI Status Line',
    path: 'C:\\Users\\test\\.codex\\config.toml',
    meta: {
      provider: 'codex',
      settingKey: 'tui.status_line',
      statusLineKind: 'footer-items',
      items: ['model-with-reasoning', 'current-dir']
    }
  }
}

function codexPromptHookAsset(): Asset {
  return {
    id: 'codex-prompt',
    agentId: 'codex',
    category: 'capability',
    type: 'hook',
    scope: 'user',
    name: 'Prompt hook',
    path: 'C:\\Users\\test\\.codex\\hooks.json',
    meta: {
      eventType: 'Stop',
      hookType: 'prompt',
      prompt: 'Summarize this turn before stopping.'
    }
  }
}

function codexHookSchemaPlugin(): AgentCapabilityPlugin {
  return {
    id: 'codex',
    displayName: 'Codex',
    version: '0.1.0',
    schemaVersion: 1,
    builtin: true,
    enabled: true,
    detected: true,
    agentCompatibility: {
      agentId: 'codex',
      name: 'Codex'
    },
    capabilities: [],
    permissions: [],
    sourceDescriptors: [],
    assetDescriptors: [],
    hookSchema: {
      agentId: 'codex',
      events: [],
      handlers: [
        {
          type: 'prompt',
          runMode: 'parsed-only',
          primaryFieldNames: ['prompt'],
          labelKey: 'settings.agentPluginHookHandlers.codex.prompt.label',
          descriptionKey: 'settings.agentPluginHookHandlers.codex.prompt.description',
          fields: [
            {
              name: 'prompt',
              kind: 'string',
              primary: true,
              labelKey: 'settings.agentPluginHookHandlers.codex.prompt.fields.prompt.label',
              descriptionKey: 'settings.agentPluginHookHandlers.codex.prompt.fields.prompt.description'
            }
          ]
        }
      ]
    },
    healthCheckDescriptors: [],
    sourceCoverage: {
      total: 0,
      counts: { scanned: 0, missing: 0, 'not-scanned': 0 },
      sources: []
    },
    references: []
  }
}

function LocationProbe(): React.ReactElement {
  const location = useLocation()
  return <span data-testid="location">{location.pathname}{location.search}</span>
}

function renderCapabilities(activeSection = 'mcp', initialEntry = `/capabilities/${activeSection}`): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PageChromeProvider>
        <TopNavigation isWindows={false} />
        <Capabilities activeSection={activeSection} />
        <LocationProbe />
      </PageChromeProvider>
    </MemoryRouter>
  )
}

describe('Capabilities guidance surfaces', () => {
  beforeEach(() => {
    useAppStore.setState({ assets: [hookAsset()], agentView: 'all', scopeSelection: { mode: 'global' } })
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins: [] }))
  })

  it('keeps hook concept guidance in the page guide instead of the lifecycle tool', async () => {
    renderCapabilities('hooks', '/capabilities/hooks')

    expect(await screen.findByRole('heading', { name: 'Hooks' })).toBeInTheDocument()
    expect(screen.queryByText('Trigger point')).not.toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByTestId('page-guide-hover-region'))
    expect(screen.getByTestId('top-navigation')).not.toContainElement(screen.getByTestId('page-guide-panel'))
    expect(screen.getByText('Lifecycle automation')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Details/ }))
    expect(screen.getByText('Trigger point')).toBeInTheDocument()
    expect(screen.getByText('Agent differences')).toBeInTheDocument()
    expect(screen.queryByText('What are hooks?')).not.toBeInTheDocument()
    expect(screen.getByText('Hook checks')).toBeInTheDocument()
  })

  it('keeps status line model guidance in the page guide instead of the status tool', async () => {
    useAppStore.setState({ assets: [statusLineAsset()], agentView: 'all' })
    renderCapabilities('statusLine', '/capabilities/status-line')

    expect(await screen.findByRole('heading', { name: 'Status Line' })).toBeInTheDocument()
    expect(screen.queryByText('Claude Code command')).not.toBeInTheDocument()
    expect(screen.queryByText(/Reads \[tui\]\.status_line from config\.toml/)).not.toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByTestId('page-guide-hover-region'))
    expect(screen.getByText('Runtime status surface')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Details/ }))
    expect(screen.getAllByText('Claude Code command')).toHaveLength(1)
    expect(screen.getAllByText(/Reads \[tui\]\.status_line from config\.toml/)).toHaveLength(1)
    expect(screen.queryByText('Status lines show live session state')).not.toBeInTheDocument()
    expect(screen.getByText('tui.status_line')).toBeInTheDocument()
  })

  it('renders the section requested by the route', async () => {
    renderCapabilities('hooks', '/capabilities/hooks')

    expect(await screen.findByRole('heading', { name: 'Hooks' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/capabilities/hooks')
  })

  it('falls back to MCP when the section is unknown', async () => {
    renderCapabilities('unknown', '/capabilities/unknown')

    expect(await screen.findByRole('heading', { name: 'MCP' })).toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByTestId('page-guide-hover-region'))
    expect(screen.getByText('External tools and data sources')).toBeInTheDocument()
  })

  it('does not render the old capability tab switcher', async () => {
    useAppStore.setState({ assets: [statusLineAsset()], agentView: 'all' })
    renderCapabilities('statusLine', '/capabilities/status-line')

    expect(await screen.findByRole('heading', { name: 'Status Line' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Hooks/ })).not.toBeInTheDocument()
  })

  it('omits page search on the Permissions tab', async () => {
    renderCapabilities('permissions', '/capabilities/permissions')

    expect(await screen.findByRole('heading', { name: 'Permissions' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Filter Permissions/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page guide' })).toBeInTheDocument()
  })

  it('passes agent plugin hook schema into the Hooks tab', async () => {
    useAppStore.setState({ assets: [codexPromptHookAsset()], agentView: 'all' })
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins: [codexHookSchemaPlugin()] }))

    renderCapabilities('hooks', '/capabilities/hooks')

    expect(await screen.findByText('Summarize this turn before stopping.')).toBeInTheDocument()
    expect(await screen.findByText('Parsed only')).toBeInTheDocument()
  })

  it('filters capability assets by selected project scope', async () => {
    useAppStore.setState({
      scopeSelection: {
        mode: 'project',
        projectPath: 'D:/Code/berth',
        projectPathKey: 'd:/code/berth'
      },
      assets: [
        scopedHookAsset('user-hook', 'user', 'C:/Users/mail/.codex/hooks.json', 'pwsh user-hook.ps1'),
        scopedHookAsset('project-hook', 'project', 'D:/Code/berth/.codex/hooks.json', 'pwsh project-hook.ps1'),
        scopedHookAsset('other-project-hook', 'project', 'D:/Code/other/.codex/hooks.json', 'pwsh other-hook.ps1', 'D:/Code/other')
      ],
      agentView: 'all'
    })

    renderCapabilities('hooks', '/capabilities/hooks')

    expect(await screen.findByText('pwsh project-hook.ps1')).toBeInTheDocument()
    expect(screen.getByText('pwsh user-hook.ps1')).toBeInTheDocument()
    expect(screen.queryByText('pwsh other-hook.ps1')).not.toBeInTheDocument()
  })
})
