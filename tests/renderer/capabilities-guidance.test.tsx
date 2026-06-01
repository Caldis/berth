import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import '../../src/renderer/src/i18n'
import { Capabilities } from '../../src/renderer/src/pages/capabilities'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { Asset } from '../../src/shared/types/asset'
import type { AgentCapabilityPlugin } from '../../src/shared/types/agent-plugin'

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

function renderCapabilities(initialEntry = '/configuration/capabilities'): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Capabilities />
      <LocationProbe />
    </MemoryRouter>
  )
}

describe('Capabilities guidance surfaces', () => {
  beforeEach(() => {
    useAppStore.setState({ assets: [hookAsset()], agentView: 'all' })
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins: [] }))
  })

  it('keeps hook concept guidance in the page guide instead of the lifecycle tool', async () => {
    renderCapabilities()

    fireEvent.click(screen.getByRole('button', { name: /Hooks/ }))

    expect(await screen.findByText('Lifecycle automation')).toBeInTheDocument()
    expect(screen.queryByText('Trigger point')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Details/ }))
    expect(screen.getByText('Trigger point')).toBeInTheDocument()
    expect(screen.getByText('Agent differences')).toBeInTheDocument()
    expect(screen.queryByText('What are hooks?')).not.toBeInTheDocument()
    expect(screen.getByText('Hook checks')).toBeInTheDocument()
  })

  it('keeps status line model guidance in the page guide instead of the status tool', async () => {
    useAppStore.setState({ assets: [statusLineAsset()], agentView: 'all' })
    renderCapabilities()

    fireEvent.click(screen.getByRole('button', { name: /Status Line/ }))

    expect(await screen.findByText('Runtime status surface')).toBeInTheDocument()
    expect(screen.queryByText('Claude Code command')).not.toBeInTheDocument()
    expect(screen.queryByText(/Reads \[tui\]\.status_line from config\.toml/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Details/ }))
    expect(screen.getAllByText('Claude Code command')).toHaveLength(1)
    expect(screen.getAllByText(/Reads \[tui\]\.status_line from config\.toml/)).toHaveLength(1)
    expect(screen.queryByText('Status lines show live session state')).not.toBeInTheDocument()
    expect(screen.getByText('tui.status_line')).toBeInTheDocument()
  })

  it('selects the tab requested by the URL query', async () => {
    renderCapabilities('/configuration/capabilities?tab=hooks')

    expect(await screen.findByText('Lifecycle automation')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/configuration/capabilities?tab=hooks')
  })

  it('falls back to MCP when the URL query uses an unknown tab', async () => {
    renderCapabilities('/configuration/capabilities?tab=unknown')

    expect(await screen.findByText('External tools and data sources')).toBeInTheDocument()
  })

  it('updates the URL query when the user changes tabs', async () => {
    useAppStore.setState({ assets: [statusLineAsset()], agentView: 'all' })
    renderCapabilities('/configuration/capabilities?tab=hooks')

    fireEvent.click(screen.getByRole('button', { name: /Status Line/ }))

    expect(await screen.findByText('Runtime status surface')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/configuration/capabilities?tab=statusLine')
  })

  it('passes agent plugin hook schema into the Hooks tab', async () => {
    useAppStore.setState({ assets: [codexPromptHookAsset()], agentView: 'all' })
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins: [codexHookSchemaPlugin()] }))

    renderCapabilities('/configuration/capabilities?tab=hooks')

    expect(await screen.findByText('Summarize this turn before stopping.')).toBeInTheDocument()
    expect(await screen.findByText('Parsed only')).toBeInTheDocument()
  })
})
