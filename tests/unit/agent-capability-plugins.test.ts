import { describe, expect, it } from 'vitest'
import { listAgentCapabilityPlugins } from '../../src/main/agent-plugins/registry'
import type { AgentScanSourceGroup } from '../../src/shared/types/ipc'
import type { AssetType, ScanSourceCode } from '../../src/shared/types/asset'

const claudeDescriptorCodes: ScanSourceCode[] = [
  'claude.user.data-directory',
  'claude.user.global-config',
  'claude.project.directory',
  'claude.project.mcp-config',
  'claude.enterprise.managed-settings',
  'claude.enterprise.managed-mcp'
]

const codexDescriptorCodes: ScanSourceCode[] = [
  'codex.user.config',
  'codex.user.hooks',
  'codex.user.agents-md',
  'codex.user.agents-directory',
  'codex.user.codex-home-skills',
  'codex.user.sessions',
  'codex.session.archived-sessions',
  'codex.user.shared-skills',
  'codex.project.agents-md',
  'codex.project.config',
  'codex.project.hooks',
  'codex.project.agents-directory',
  'codex.project.skills'
]

const claudeAssetTypes: AssetType[] = [
  'claude-md',
  'agents-md',
  'skill',
  'agent',
  'command',
  'output-mode',
  'team',
  'mcp-server',
  'hook',
  'permission',
  'env',
  'statusline',
  'plugin',
  'session',
  'plan',
  'todo',
  'history',
  'stats-cache',
  'usage-data',
  'ide-lock',
  'credential'
]

const codexAssetTypes: AssetType[] = [
  'agents-md',
  'agent',
  'skill',
  'mcp-server',
  'hook',
  'statusline',
  'session'
]

const scanGroups: AgentScanSourceGroup[] = [
  {
    agentId: 'claude-code',
    agentName: 'Claude Code',
    installed: true,
    roots: [
      {
        path: 'C:\\Users\\test\\.claude',
        scope: 'user',
        code: 'claude.user.data-directory',
        categories: ['instruction', 'capability', 'state'],
        kind: 'directory',
        status: 'scanned'
      }
    ],
    sources: [
      {
        path: 'C:\\Users\\test\\.claude',
        scope: 'user',
        code: 'claude.user.data-directory',
        categories: ['instruction', 'capability', 'state'],
        kind: 'directory',
        status: 'scanned'
      },
      {
        path: 'D:\\repo\\.claude',
        scope: 'project',
        code: 'project.current-candidate',
        categories: ['instruction', 'capability'],
        kind: 'directory',
        status: 'missing'
      }
    ]
  },
  {
    agentId: 'codex',
    agentName: 'Codex',
    installed: false,
    roots: [],
    sources: [
      {
        path: 'D:\\repo\\.codex',
        scope: 'project',
        code: 'project.session-derived-candidate',
        categories: ['instruction', 'capability'],
        kind: 'directory',
        status: 'not-scanned'
      }
    ]
  }
]

describe('agent capability plugin registry', () => {
  it('lists built-in Claude Code and Codex plugins', () => {
    const result = listAgentCapabilityPlugins(scanGroups)

    expect(result.plugins.map((plugin) => plugin.id)).toEqual(['claude-code', 'codex'])
    expect(result.plugins.every((plugin) => plugin.builtin)).toBe(true)
    expect(result.plugins.every((plugin) => plugin.enabled)).toBe(true)
  })

  it('derives detected state and source coverage from scan source groups', () => {
    const result = listAgentCapabilityPlugins(scanGroups)
    const claude = result.plugins.find((plugin) => plugin.id === 'claude-code')
    const codex = result.plugins.find((plugin) => plugin.id === 'codex')

    expect(claude?.detected).toBe(true)
    expect(claude?.sourceCoverage.total).toBe(2)
    expect(claude?.sourceCoverage.counts.scanned).toBe(1)
    expect(claude?.sourceCoverage.counts.missing).toBe(1)
    expect(codex?.detected).toBe(false)
    expect(codex?.sourceCoverage.counts['not-scanned']).toBe(1)
  })

  it('exposes source descriptors for built-in plugins', () => {
    const result = listAgentCapabilityPlugins(scanGroups)
    const claude = result.plugins.find((plugin) => plugin.id === 'claude-code')
    const codex = result.plugins.find((plugin) => plugin.id === 'codex')

    expect(claude?.sourceDescriptors.map((descriptor) => descriptor.code)).toEqual(
      claudeDescriptorCodes
    )
    expect(codex?.sourceDescriptors.map((descriptor) => descriptor.code)).toEqual(
      codexDescriptorCodes
    )
    expect(claude?.sourceDescriptors[0]).toMatchObject({
      scope: 'user',
      kind: 'directory',
      pathPattern: '~/.claude'
    })
    expect(claude?.sourceDescriptors[0]?.categories).toEqual([
      'instruction',
      'capability',
      'state',
      'observability',
      'integration'
    ])
    expect(codex?.sourceDescriptors.find((descriptor) => descriptor.code === 'codex.project.hooks'))
      .toMatchObject({
        scope: 'project',
        kind: 'file',
        categories: ['capability'],
        pathPattern: '<project>/.codex/hooks.json'
      })
  })

  it('joins runtime source coverage with descriptors by source code', () => {
    const result = listAgentCapabilityPlugins(scanGroups)
    const claude = result.plugins.find((plugin) => plugin.id === 'claude-code')
    const codex = result.plugins.find((plugin) => plugin.id === 'codex')

    expect(claude?.sourceCoverage.sources[0]).toMatchObject({
      code: 'claude.user.data-directory',
      declared: true,
      labelKey: 'settings.agentPluginSources.claude.user.data-directory.label',
      pathPattern: '~/.claude'
    })
    expect(claude?.sourceCoverage.sources[1]).toMatchObject({
      code: 'project.current-candidate',
      declared: false
    })
    expect(codex?.sourceCoverage.sources[0]).toMatchObject({
      code: 'project.session-derived-candidate',
      declared: false
    })
  })

  it('exposes asset descriptors for built-in plugins', () => {
    const result = listAgentCapabilityPlugins(scanGroups)
    const claude = result.plugins.find((plugin) => plugin.id === 'claude-code')
    const codex = result.plugins.find((plugin) => plugin.id === 'codex')

    expect(claude?.assetDescriptors.map((descriptor) => descriptor.type)).toEqual(
      claudeAssetTypes
    )
    expect(codex?.assetDescriptors.map((descriptor) => descriptor.type)).toEqual(
      codexAssetTypes
    )
    expect(claude?.assetDescriptors.find((descriptor) => descriptor.type === 'credential'))
      .toMatchObject({
        category: 'integration',
        scopes: ['user'],
        sensitive: true,
        sourceCodes: ['claude.user.data-directory']
      })
    expect(claude?.assetDescriptors.find((descriptor) => descriptor.type === 'session'))
      .toMatchObject({
        category: 'state',
        scopes: ['session']
      })
    expect(codex?.assetDescriptors.find((descriptor) => descriptor.type === 'session'))
      .toMatchObject({
        category: 'state',
        scopes: ['session'],
        sourceCodes: ['codex.user.sessions', 'codex.session.archived-sessions']
      })
  })

  it('does not declare reserved or unsupported asset types', () => {
    const result = listAgentCapabilityPlugins(scanGroups)
    const claude = result.plugins.find((plugin) => plugin.id === 'claude-code')
    const codex = result.plugins.find((plugin) => plugin.id === 'codex')
    const reservedTypes: AssetType[] = [
      'marketplace',
      'file-history',
      'shell-snapshot',
      'statsig',
      'debug',
      'worktree',
      'backup'
    ]

    expect(claude?.assetDescriptors.map((descriptor) => descriptor.type)).not.toEqual(
      expect.arrayContaining(reservedTypes)
    )
    expect(codex?.assetDescriptors.map((descriptor) => descriptor.type)).not.toEqual(
      expect.arrayContaining([...reservedTypes, 'permission', 'env', 'plugin'])
    )
  })

  it('keeps permissions accurate to Berth actions', () => {
    const result = listAgentCapabilityPlugins(scanGroups)

    for (const plugin of result.plugins) {
      expect(plugin.permissions.some((permission) => permission.kind === 'read')).toBe(true)
      expect(plugin.permissions.some((permission) => permission.kind === 'write')).toBe(true)
      expect(plugin.permissions.some((permission) => permission.kind === 'execute')).toBe(false)
    }

    const claude = result.plugins.find((plugin) => plugin.id === 'claude-code')
    const codex = result.plugins.find((plugin) => plugin.id === 'codex')
    expect(claude?.permissions.find((permission) => permission.kind === 'write')?.pathPatterns)
      .toContain('~/.claude/.berth/hooks-state.json')
    expect(codex?.permissions.find((permission) => permission.kind === 'write')?.pathPatterns)
      .toEqual(['~/.codex/config.toml'])
  })

  it('marks runtime-sensitive capabilities as partial until they are plugin-owned', () => {
    const result = listAgentCapabilityPlugins(scanGroups)
    const codex = result.plugins.find((plugin) => plugin.id === 'codex')
    const claude = result.plugins.find((plugin) => plugin.id === 'claude-code')

    expect(codex?.capabilities.find((capability) => capability.id === 'hookSchema')).toMatchObject({
      status: 'partial',
      statusDetailKey: 'settings.agentPluginCapabilityDetails.codexHookSchema'
    })
    expect(claude?.capabilities.find((capability) => capability.id === 'healthChecks')).toMatchObject({
      status: 'partial',
      statusDetailKey: 'settings.agentPluginCapabilityDetails.healthChecksNotPluginOwned'
    })
  })
})
