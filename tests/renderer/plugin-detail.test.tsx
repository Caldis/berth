import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../src/renderer/src/i18n'
import { PluginDetail } from '../../src/renderer/src/pages/plugin-detail'
import { PageChromeProvider } from '../../src/renderer/src/components/layout/page-chrome'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { AgentCapabilityPlugin } from '@shared/types/agent-plugin'

function geminiPlugin(): AgentCapabilityPlugin {
  return {
    id: 'gemini-cli',
    displayName: 'Gemini CLI',
    version: '0.1.0',
    schemaVersion: 1,
    builtin: true,
    enabled: false,
    detected: true,
    agentCompatibility: {
      agentId: 'gemini-cli',
      name: 'Gemini CLI'
    },
    capabilities: [],
    permissions: [
      {
        kind: 'read',
        scopes: ['user', 'project', 'session'],
        pathPatterns: ['~/.gemini', '<project>/.gemini'],
        reasonKey: 'settings.agentPluginPermissionReasons.plannedRead'
      }
    ],
    sourceDescriptors: [
      {
        code: 'gemini.user.settings',
        scope: 'user',
        kind: 'file',
        categories: ['capability'],
        pathPattern: '~/.gemini/settings.json',
        labelKey: 'settings.agentPluginSources.gemini.user.settings.label',
        descriptionKey: 'settings.agentPluginSources.gemini.user.settings.description',
        stability: 'official-docs',
        evidenceUrls: ['https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md'],
        sensitivity: 'normal'
      },
      {
        code: 'gemini.user.sessions',
        scope: 'session',
        kind: 'directory',
        categories: ['state'],
        pathPattern: '~/.gemini/tmp',
        labelKey: 'settings.agentPluginSources.gemini.user.sessions.label',
        descriptionKey: 'settings.agentPluginSources.gemini.user.sessions.description',
        stability: 'primary-source',
        evidenceUrls: ['https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/session-management.md'],
        sensitivity: 'sensitive-metadata-only',
        maxRows: 200,
        defaultHidden: true
      }
    ],
    assetDescriptors: [
      {
        type: 'session',
        category: 'state',
        scopes: ['session'],
        sensitive: true,
        labelKey: 'settings.agentPluginAssets.session.label',
        descriptionKey: 'settings.agentPluginAssets.session.description'
      }
    ],
    hookSchema: { agentId: 'gemini-cli', events: [], handlers: [] },
    healthCheckDescriptors: [],
    sourceCoverage: {
      total: 2,
      counts: { scanned: 1, missing: 1, 'not-scanned': 0 },
      sources: []
    },
    references: [
      { label: 'Homepage', url: 'https://github.com/google-gemini/gemini-cli' },
      { label: 'Download', url: 'https://github.com/google-gemini/gemini-cli#installation' }
    ]
  }
}

function renderPluginDetail(pluginId = 'gemini-cli'): void {
  render(
    <MemoryRouter initialEntries={[`/capabilities/plugins/${encodeURIComponent(pluginId)}`]}>
      <PageChromeProvider>
        <Routes>
          <Route path="/capabilities/plugins/:pluginId" element={<PluginDetail />} />
        </Routes>
      </PageChromeProvider>
    </MemoryRouter>
  )
}

describe('PluginDetail', () => {
  beforeEach(() => {
    useAppStore.setState({ assetSnapshotId: `snapshot-${Math.random()}` })
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins: [geminiPlugin()], manifests: [] }))
    window.api.shell.openExternal = vi.fn(async () => {})
  })

  it('renders a standalone plugin page with download, scan sources, and sensitivity policy', async () => {
    renderPluginDetail()

    expect(await screen.findByRole('heading', { name: 'Gemini CLI' })).toBeInTheDocument()
    expect(screen.getByText('Adapter metadata and scan contract for Gemini CLI.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
    expect(screen.getByText('~/.gemini/settings.json')).toBeInTheDocument()
    expect(screen.getByText('~/.gemini/tmp')).toBeInTheDocument()
    expect(screen.getByText('Metadata only')).toBeInTheDocument()
    expect(screen.getByText('Primary source')).toBeInTheDocument()
    expect(screen.getByText('Limit: 200 rows')).toBeInTheDocument()
    expect(screen.getByText('Hidden by default')).toBeInTheDocument()
    expect(screen.getByText('session')).toBeInTheDocument()
    expect(screen.getByText('Sensitive')).toBeInTheDocument()
  })

  it('opens official reference URLs without running plugin code', async () => {
    renderPluginDetail()

    fireEvent.click(await screen.findByRole('button', { name: 'Download' }))

    expect(window.api.shell.openExternal).toHaveBeenCalledWith(
      'https://github.com/google-gemini/gemini-cli#installation'
    )
  })

  it('shows an empty state when the plugin id is unknown', async () => {
    renderPluginDetail('missing-plugin')

    expect(await screen.findByText('Plugin details were not found.')).toBeInTheDocument()
  })
})
