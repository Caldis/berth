import { describe, expect, it } from 'vitest'
import { listAgentCapabilityPlugins } from '../../src/main/agent-plugins/registry'
import type { AgentScanSourceGroup } from '../../src/shared/types/ipc'

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
