import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { SettingsContent } from '../../src/renderer/src/pages/settings'
import type {
  AgentCapabilityPlugin,
  AgentCapabilityPluginManifestEntry
} from '../../src/shared/types/agent-plugin'

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
    hookSchema: {
      agentId: 'claude-code',
      events: [],
      handlers: []
    },
    healthCheckDescriptors: [],
    sourceCoverage: {
      total: 3,
      counts: {
        scanned: 1,
        missing: 1,
        'not-scanned': 1
      },
      sources: [
        {
          path: 'C:\\Users\\test\\.claude',
          scope: 'user',
          status: 'scanned',
          code: 'claude.user.data-directory',
          kind: 'directory',
          categories: ['instruction', 'capability'],
          declared: true,
          labelKey: 'settings.agentPluginSources.claude.user.data-directory.label',
          descriptionKey: 'settings.agentPluginSources.claude.user.data-directory.description',
          pathPattern: '~/.claude'
        },
        {
          path: 'D:\\workspace\\.claude',
          scope: 'project',
          status: 'missing',
          code: 'claude.project.directory',
          kind: 'directory',
          categories: ['instruction', 'capability'],
          declared: true,
          labelKey: 'settings.agentPluginSources.claude.project.directory.label',
          descriptionKey: 'settings.agentPluginSources.claude.project.directory.description',
          pathPattern: '<project>/.claude'
        },
        {
          path: 'D:\\workspace',
          scope: 'project',
          status: 'not-scanned',
          code: 'project.session-derived-candidate',
          kind: 'directory',
          categories: ['instruction'],
          declared: false
        }
      ]
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
    hookSchema: {
      agentId: 'codex',
      events: [],
      handlers: []
    },
    healthCheckDescriptors: [],
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

const manifests: AgentCapabilityPluginManifestEntry[] = [
  {
    path: 'C:\\Users\\test\\.berth\\agent-plugins\\claude-helper.json',
    status: 'valid',
    readonly: true,
    id: 'claude-helper',
    displayName: 'Claude Helper',
    version: '0.2.0',
    schemaVersion: 1,
    activationReadiness: {
      status: 'metadata-only',
      reasonCode: 'metadataOnly',
      message: 'This manifest only provides metadata and descriptors.'
    },
    agentCompatibility: {
      agentId: 'claude-code',
      name: 'Claude Code',
      versionRange: '>=1.0.0 <2.0.0',
      detectedVersion: '1.2.3'
    },
    errors: []
  },
  {
    path: 'C:\\Users\\test\\.berth\\agent-plugins\\ready-helper.json',
    status: 'valid',
    readonly: true,
    id: 'ready-helper',
    displayName: 'Ready Helper',
    version: '0.3.0',
    schemaVersion: 1,
    implementation: {
      kind: 'adapter',
      entrypoint: './adapter.js'
    },
    activationReadiness: {
      status: 'activation-ready',
      reasonCode: 'implementationDeclared',
      message: 'This manifest declares adapter implementation metadata.',
      implementationKind: 'adapter'
    },
    agentCompatibility: {
      agentId: 'claude-code',
      name: 'Claude Code',
      versionRange: '>=1.0.0 <2.0.0',
      detectedVersion: '1.2.3'
    },
    errors: []
  },
  {
    path: 'C:\\Users\\test\\.berth\\agent-plugins\\blocked-helper.json',
    status: 'valid',
    readonly: true,
    id: 'blocked-helper',
    displayName: 'Blocked Helper',
    version: '0.4.0',
    schemaVersion: 1,
    permissions: [
      {
        kind: 'read',
        scopes: ['user'],
        pathPatterns: ['~/.codex/config.toml'],
        reason: 'Read local Codex configuration.'
      },
      {
        kind: 'write',
        scopes: ['user'],
        pathPatterns: ['~/.codex/config.toml'],
        reason: 'Store reviewed hook registration changes.',
        backupStrategy: 'Create a .berth backup before editing.',
        conflictStrategy: 'Abort if the file changed after the latest scan.'
      },
      {
        kind: 'execute',
        scopes: ['session'],
        pathPatterns: ['codex hook command'],
        reason: 'Run configured hook commands.'
      }
    ],
    activationReadiness: {
      status: 'blocked',
      reasonCode: 'permissionApprovalRequired',
      message: 'This manifest declares write or execute permissions.',
      blockedPermissionKinds: ['write', 'execute']
    },
    agentCompatibility: {
      agentId: 'codex',
      name: 'Codex',
      detectedVersion: '0.9.0'
    },
    errors: []
  },
  {
    path: 'C:\\Users\\test\\.berth\\agent-plugins\\future-helper.json',
    status: 'incompatible',
    readonly: true,
    id: 'future-helper',
    displayName: 'Future Helper',
    version: '1.0.0',
    schemaVersion: 1,
    activationReadiness: {
      status: 'incompatible',
      reasonCode: 'agentVersionIncompatible',
      message: 'Detected agent version does not match this manifest.'
    },
    agentCompatibility: {
      agentId: 'claude-code',
      name: 'Claude Code',
      versionRange: '>=2.0.0',
      detectedVersion: '1.2.3'
    },
    errors: [
      {
        code: 'manifest-agent-version-incompatible',
        field: 'agentCompatibility.versionRange',
        message: 'Detected Claude Code 1.2.3 does not match >=2.0.0.'
      }
    ]
  },
  {
    path: 'C:\\Users\\test\\.berth\\agent-plugins\\broken.json',
    status: 'invalid',
    readonly: true,
    id: 'broken-helper',
    displayName: 'Broken Helper',
    version: '0.1.0',
    schemaVersion: 1,
    activationReadiness: {
      status: 'invalid',
      reasonCode: 'manifestInvalid',
      message: 'Manifest has validation errors and cannot be activated.'
    },
    agentCompatibility: {
      agentId: 'codex',
      name: 'Codex'
    },
    errors: [
      {
        code: 'manifest-field-invalid',
        field: 'permissions.0.kind',
        message: 'permissions.0.kind must be one of: read, write, execute.'
      }
    ]
  }
]

describe('SettingsContent agent capability plugins', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins, manifests: [] }))
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

  it('uses localized Chinese plugin heading', async () => {
    await i18n.changeLanguage('zh')

    render(<SettingsContent showTitle={false} />)

    expect(await screen.findByText('Agent 能力插件')).toBeInTheDocument()
    expect(screen.queryByText('Agent Capability Plugins')).not.toBeInTheDocument()
  })

  it('expands plugin details for permissions, capabilities, and sources', async () => {
    render(<SettingsContent showTitle={false} />)

    expect(screen.queryByText('C:\\Users\\test\\.claude')).not.toBeInTheDocument()

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
    expect(screen.getAllByText('1 scanned · 1 missing · 1 not scanned').length).toBeGreaterThan(0)
    expect(screen.getByText('User data directory')).toBeInTheDocument()
    expect(screen.getByText('Project .claude directory')).toBeInTheDocument()
    expect(screen.getByText('Session-derived project candidate')).toBeInTheDocument()
    expect(screen.queryByText('project.session-derived-candidate')).not.toBeInTheDocument()
    expect(screen.getByText('C:\\Users\\test\\.claude')).toBeInTheDocument()
    expect(screen.getByText('D:\\workspace\\.claude')).toBeInTheDocument()
    expect(screen.getByText('D:\\workspace')).toBeInTheDocument()
    expect(screen.getAllByText('Directory').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Declared').length).toBeGreaterThan(0)
    expect(screen.getByText('Detected only')).toBeInTheDocument()
    expect(screen.getByText('Pattern: ~/.claude')).toBeInTheDocument()
    expect(screen.getByText('Pattern: <project>/.claude')).toBeInTheDocument()
  })

  it('shows a compact empty source state when a plugin has no concrete source rows', async () => {
    render(<SettingsContent showTitle={false} />)

    fireEvent.click(await screen.findByRole('button', { name: /Codex/ }))

    expect(screen.getByText('No concrete source rows.')).toBeInTheDocument()
  })

  it('opens plugin references from the expanded detail area', async () => {
    render(<SettingsContent showTitle={false} />)

    fireEvent.click(await screen.findByRole('button', { name: /Claude Code/ }))
    fireEvent.click(screen.getByRole('button', { name: /Claude Code hooks/ }))

    expect(window.api.shell.openExternal).toHaveBeenCalledWith('https://code.claude.com/docs/en/hooks')
  })

  it('renders manifest summaries without default detail noise', async () => {
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins, manifests }))

    render(<SettingsContent showTitle={false} />)

    expect(await screen.findByText('Claude Helper')).toBeInTheDocument()
    expect(screen.getByText('Ready Helper')).toBeInTheDocument()
    expect(screen.getByText('Blocked Helper')).toBeInTheDocument()
    expect(screen.getByText('Future Helper')).toBeInTheDocument()
    expect(screen.getByText('Broken Helper')).toBeInTheDocument()
    expect(screen.getAllByText('Manifest')).toHaveLength(5)
    expect(screen.getAllByText('Read-only')).toHaveLength(5)
    expect(screen.getByText('Metadata')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('Blocked')).toBeInTheDocument()
    expect(screen.getByText('Incompatible')).toBeInTheDocument()
    expect(screen.getByText('Invalid')).toBeInTheDocument()
    expect(screen.getAllByText('Target: Claude Code').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Range: >=2.0.0').length).toBeGreaterThan(0)
    expect(screen.queryByText('Activation readiness')).not.toBeInTheDocument()
    expect(screen.queryByText('Validation errors')).not.toBeInTheDocument()
    expect(screen.queryByText('./adapter.js')).not.toBeInTheDocument()
    expect(screen.queryByText('~/.codex/config.toml')).not.toBeInTheDocument()
    expect(screen.queryByText('Store reviewed hook registration changes.')).not.toBeInTheDocument()
    expect(screen.queryByText('permissions.0.kind')).not.toBeInTheDocument()
  })

  it('expands activation-ready manifest details without enabling third-party code', async () => {
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins, manifests }))

    render(<SettingsContent showTitle={false} />)

    fireEvent.click(await screen.findByRole('button', { name: /Ready Helper/ }))

    expect(screen.getByText('Activation readiness')).toBeInTheDocument()
    expect(screen.getByText('Implementation declared')).toBeInTheDocument()
    expect(screen.getByText('This manifest declares adapter metadata. Berth still keeps third-party code non-executable.')).toBeInTheDocument()
    expect(screen.getByText('Implementation')).toBeInTheDocument()
    expect(screen.getByText('Adapter')).toBeInTheDocument()
    expect(screen.getByText('Entrypoint')).toBeInTheDocument()
    expect(screen.getByText('./adapter.js')).toBeInTheDocument()
  })

  it('expands blocked manifest details for permission review state', async () => {
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins, manifests }))

    render(<SettingsContent showTitle={false} />)

    fireEvent.click(await screen.findByRole('button', { name: /Blocked Helper/ }))

    expect(screen.getByText('Activation readiness')).toBeInTheDocument()
    expect(screen.getByText('Permission approval required')).toBeInTheDocument()
    expect(screen.getByText('This manifest requests write or execute permissions. Berth cannot activate it until permission review exists.')).toBeInTheDocument()
    expect(screen.getByText('Blocked permissions')).toBeInTheDocument()
    expect(screen.getByText('Permission review')).toBeInTheDocument()
    expect(screen.getByText('Read local Codex configuration.')).toBeInTheDocument()
    expect(screen.getByText('Store reviewed hook registration changes.')).toBeInTheDocument()
    expect(screen.getByText('Run configured hook commands.')).toBeInTheDocument()
    expect(screen.getAllByText('~/.codex/config.toml').length).toBeGreaterThan(0)
    expect(screen.getByText('codex hook command')).toBeInTheDocument()
    expect(screen.getAllByText('Backup strategy').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Conflict strategy').length).toBeGreaterThan(0)
    expect(screen.getByText('Create a .berth backup before editing.')).toBeInTheDocument()
    expect(screen.getByText('Abort if the file changed after the latest scan.')).toBeInTheDocument()
    expect(screen.getAllByText('Not declared').length).toBeGreaterThan(0)
    expect(screen.getByText('Session')).toBeInTheDocument()
    expect(screen.getAllByText('Write').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Execute').length).toBeGreaterThan(0)
    expect(screen.getByText('No validation errors.')).toBeInTheDocument()
  })

  it('expands manifest details for path, version range, and validation errors', async () => {
    window.api.agentPlugins.list = vi.fn(async () => ({ plugins, manifests }))

    render(<SettingsContent showTitle={false} />)

    fireEvent.click(await screen.findByRole('button', { name: /Broken Helper/ }))

    expect(screen.getByText('Manifest details')).toBeInTheDocument()
    expect(screen.getByText('Path')).toBeInTheDocument()
    expect(screen.getAllByText('C:\\Users\\test\\.berth\\agent-plugins\\broken.json').length)
      .toBeGreaterThan(0)
    expect(screen.getByText('Validation errors')).toBeInTheDocument()
    expect(screen.getByText('manifest-field-invalid')).toBeInTheDocument()
    expect(screen.getByText('permissions.0.kind')).toBeInTheDocument()
    expect(screen.getByText('permissions.0.kind must be one of: read, write, execute.')).toBeInTheDocument()
    expect(screen.queryByText('Permission review')).not.toBeInTheDocument()
  })

  it('keeps built-in plugins visible when manifests are invalid', async () => {
    const invalidManifest = manifests.find((manifest) => manifest.id === 'broken-helper')
    window.api.agentPlugins.list = vi.fn(async () => ({
      plugins,
      manifests: invalidManifest ? [invalidManifest] : []
    }))

    render(<SettingsContent showTitle={false} />)

    expect(await screen.findByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('Codex')).toBeInTheDocument()
    expect(screen.getByText('Broken Helper')).toBeInTheDocument()
    expect(screen.getByText('Invalid')).toBeInTheDocument()
  })
})
