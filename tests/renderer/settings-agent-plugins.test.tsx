import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import { SettingsContent } from '../../src/renderer/src/pages/settings'
import type { AgentCapabilityPlugin } from '../../src/shared/types/agent-plugin'

const plugins: AgentCapabilityPlugin[] = [
  {
    id: 'claude-code',
    displayName: 'Claude Code',
    version: '0.1.0',
    schemaVersion: 1,
    builtin: true,
    enabled: true,
    detected: true,
    agentCompatibility: {
      agentId: 'claude-code',
      name: 'Claude Code'
    },
    capabilities: [
      {
        id: 'sourceDiscovery',
        status: 'available',
        labelKey: 'settings.agentPluginCapabilities.sourceDiscovery.label',
        descriptionKey: 'settings.agentPluginCapabilities.sourceDiscovery.description'
      },
      {
        id: 'hookActions',
        status: 'partial',
        labelKey: 'settings.agentPluginCapabilities.hookActions.label',
        descriptionKey: 'settings.agentPluginCapabilities.hookActions.description',
        statusDetailKey: 'settings.agentPluginCapabilityDetails.claudeHookActions'
      }
    ],
    permissions: [
      {
        kind: 'read',
        scopes: ['user', 'project'],
        pathPatterns: ['~/.claude', '<project>/.claude'],
        reasonKey: 'settings.agentPluginPermissionReasons.claudeRead'
      },
      {
        kind: 'write',
        scopes: ['user'],
        pathPatterns: ['~/.claude/settings.json', '~/.claude/.berth/hooks-state.json'],
        reasonKey: 'settings.agentPluginPermissionReasons.claudeWrite'
      }
    ],
    sourceDescriptors: [],
    assetDescriptors: [],
    sourceCoverage: {
      total: 2,
      counts: {
        scanned: 1,
        missing: 1,
        'not-scanned': 0
      },
      sources: []
    },
    references: [
      {
        label: 'Claude Code hooks',
        url: 'https://code.claude.com/docs/en/hooks'
      }
    ]
  },
  {
    id: 'codex',
    displayName: 'Codex',
    version: '0.1.0',
    schemaVersion: 1,
    builtin: true,
    enabled: true,
    detected: false,
    agentCompatibility: {
      agentId: 'codex',
      name: 'Codex'
    },
    capabilities: [
      {
        id: 'hookSchema',
        status: 'partial',
        labelKey: 'settings.agentPluginCapabilities.hookSchema.label',
        descriptionKey: 'settings.agentPluginCapabilities.hookSchema.description',
        statusDetailKey: 'settings.agentPluginCapabilityDetails.codexHookSchema'
      }
    ],
    permissions: [
      {
        kind: 'read',
        scopes: ['user', 'project', 'session'],
        pathPatterns: ['~/.codex/config.toml', '~/.codex/hooks.json'],
        reasonKey: 'settings.agentPluginPermissionReasons.codexRead'
      },
      {
        kind: 'write',
        scopes: ['user'],
        pathPatterns: ['~/.codex/config.toml'],
        reasonKey: 'settings.agentPluginPermissionReasons.codexWrite'
      }
    ],
    sourceDescriptors: [],
    assetDescriptors: [],
    sourceCoverage: {
      total: 1,
      counts: {
        scanned: 0,
        missing: 0,
        'not-scanned': 1
      },
      sources: []
    },
    references: []
  }
]

describe('SettingsContent agent capability plugins', () => {
  beforeEach(() => {
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins }))
    window.api.assets.scanSources = vi.fn(async () => [])
    window.api.shell.openExternal = vi.fn(async () => {})
  })

  it('renders built-in plugin summaries without default detail noise', async () => {
    render(<SettingsContent showTitle={false} />)

    expect(await screen.findByText('Agent Capability Plugins')).toBeInTheDocument()
    expect(screen.getByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('Codex')).toBeInTheDocument()
    expect(screen.getAllByText('Built-in')).toHaveLength(2)
    expect(screen.getAllByText('Enabled')).toHaveLength(2)
    expect(screen.getByText('Detected')).toBeInTheDocument()
    expect(screen.getByText('No local data')).toBeInTheDocument()
    expect(screen.getAllByText('v0.1.0')).toHaveLength(2)
    expect(screen.getByText('Target: Claude Code')).toBeInTheDocument()
    expect(screen.getByText('2 capabilities')).toBeInTheDocument()
    expect(screen.queryByText('Permissions')).not.toBeInTheDocument()
    expect(screen.queryByText('~/.claude/settings.json')).not.toBeInTheDocument()
  })

  it('expands plugin details for permissions, capabilities, and sources', async () => {
    render(<SettingsContent showTitle={false} />)

    fireEvent.click(await screen.findByRole('button', { name: /Claude Code/ }))

    expect(screen.getByText('Permissions')).toBeInTheDocument()
    expect(screen.getByText('Sources')).toBeInTheDocument()
    expect(screen.getByText('Capabilities')).toBeInTheDocument()
    expect(screen.getByText('Read')).toBeInTheDocument()
    expect(screen.getByText('Write')).toBeInTheDocument()
    expect(screen.getByText('~/.claude/settings.json')).toBeInTheDocument()
    expect(screen.getByText('~/.claude/.berth/hooks-state.json')).toBeInTheDocument()
    expect(screen.getByText('Source discovery')).toBeInTheDocument()
    expect(screen.getByText('Hook actions')).toBeInTheDocument()
    expect(screen.getByText('Partial')).toBeInTheDocument()
    expect(screen.getAllByText('1 scanned · 1 missing · 0 not scanned').length).toBeGreaterThan(0)
  })

  it('opens plugin references from the expanded detail area', async () => {
    render(<SettingsContent showTitle={false} />)

    fireEvent.click(await screen.findByRole('button', { name: /Claude Code/ }))
    fireEvent.click(screen.getByRole('button', { name: /Claude Code hooks/ }))

    expect(window.api.shell.openExternal).toHaveBeenCalledWith('https://code.claude.com/docs/en/hooks')
  })
})
