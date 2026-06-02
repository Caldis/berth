import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { listAgentCapabilityPlugins } from '../../src/main/agent-plugins/registry'
import type { AgentScanSourceGroup } from '../../src/shared/types/ipc'
import type { HealthCheckCategory, HealthCheckSeverity } from '../../src/shared/types/ipc'
import type { AssetType, ScanSourceCode } from '../../src/shared/types/asset'

const tempDirs: string[] = []

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

const claudeHealthCheckDescriptorIds = [
  'claude-code:source:user-claude-md-missing',
  'claude-code:syntax:json-config-invalid',
  'claude-code:configuration:settings-schema-missing',
  'claude-code:structure:hook-command-missing-command',
  'claude-code:structure:hook-http-missing-url',
  'claude-code:structure:hook-mcp-tool-missing-field',
  'claude-code:structure:hook-prompt-missing-prompt',
  'claude-code:structure:hook-agent-missing-prompt',
  'claude-code:structure:hook-unknown-type',
  'claude-code:configuration:hook-shell-ignored-with-args',
  'claude-code:configuration:hook-windows-shell',
  'claude-code:configuration:permission-bypass',
  'claude-code:configuration:permission-broad-bash',
  'claude-code:structure:mcp-invalid',
  'claude-code:structure:mcp-missing-transport',
  'claude-code:source:instruction-file-unreadable',
  'claude-code:reference:instruction-import-missing',
  'claude-code:reference:project-agents-md-not-imported',
  'claude-code:structure:skill-missing-entrypoint',
  'claude-code:syntax:skill-frontmatter-invalid',
  'claude-code:syntax:subagent-frontmatter-invalid',
  'claude-code:structure:subagent-metadata-incomplete',
  'claude-code:session:empty-project-dirs',
  'claude-code:session:metadata-missing'
]

const codexHealthCheckDescriptorIds = [
  'codex:syntax:config-invalid',
  'codex:configuration:config-schema-comment-missing',
  'codex:syntax:hooks-json-invalid',
  'codex:configuration:hooks-duplicated',
  'codex:configuration:hook-async-skipped',
  'codex:configuration:hook-skipped-type',
  'codex:structure:hook-command-missing-command',
  'codex:configuration:hook-windows-command',
  'codex:configuration:hook-windows-command-override',
  'codex:configuration:project-config-ignored-local-keys',
  'codex:structure:mcp-invalid',
  'codex:structure:mcp-missing-transport',
  'codex:source:instruction-file-unreadable',
  'codex:reference:instruction-import-missing',
  'codex:structure:skill-missing-entrypoint',
  'codex:syntax:skill-frontmatter-invalid',
  'codex:structure:skill-frontmatter-missing-required',
  'codex:syntax:custom-agent-toml-invalid',
  'codex:structure:custom-agent-metadata-incomplete',
  'codex:session:user-sessions-empty',
  'codex:session:empty-transcript',
  'codex:session:unreadable-transcript',
  'codex:session:metadata-missing'
]

const claudeHookEventTypes = [
  'ConfigChange',
  'CwdChanged',
  'Elicitation',
  'ElicitationResult',
  'FileChanged',
  'InstructionsLoaded',
  'Notification',
  'PermissionDenied',
  'PermissionRequest',
  'PostCompact',
  'PostToolBatch',
  'PostToolUse',
  'PostToolUseFailure',
  'PreCompact',
  'PreToolUse',
  'SessionEnd',
  'SessionStart',
  'Setup',
  'Stop',
  'StopFailure',
  'SubagentStart',
  'SubagentStop',
  'TaskCompleted',
  'TaskCreated',
  'TeammateIdle',
  'UserPromptExpansion',
  'UserPromptSubmit',
  'WorktreeCreate',
  'WorktreeRemove'
]

const codexHookEventTypes = [
  'PermissionRequest',
  'PostCompact',
  'PostToolUse',
  'PreCompact',
  'PreToolUse',
  'SessionStart',
  'Stop',
  'SubagentStart',
  'SubagentStop',
  'UserPromptSubmit'
]

const healthCheckCategories: HealthCheckCategory[] = [
  'source',
  'syntax',
  'structure',
  'reference',
  'configuration',
  'session'
]

const healthCheckSeverities: HealthCheckSeverity[] = ['info', 'warning', 'error']

const scanGroups: AgentScanSourceGroup[] = [
  {
    agentId: 'claude-code',
    agentName: 'Claude Code',
    installed: true,
    version: '1.2.3',
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
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('lists built-in Claude Code and Codex plugins', () => {
    const result = listAgentCapabilityPlugins(scanGroups)

    expect(result.plugins.map((plugin) => plugin.id)).toEqual(['claude-code', 'codex'])
    expect(result.plugins.every((plugin) => plugin.builtin)).toBe(true)
    expect(result.plugins.every((plugin) => plugin.enabled)).toBe(true)
  })

  it('returns third-party manifest statuses without changing built-in plugins', () => {
    const dir = makeTempDir()
    const validPath = path.join(dir, 'valid.json')
    const invalidPath = path.join(dir, 'invalid.json')
    const incompatiblePath = path.join(dir, 'incompatible.json')
    writeJson(validPath, pluginManifest({
      id: 'claude-helper',
      displayName: 'Claude Helper',
      agentCompatibility: {
        agentId: 'claude-code',
        name: 'Claude Code',
        versionRange: '>=1.0.0 <2.0.0'
      }
    }))
    writeJson(invalidPath, pluginManifest({
      id: 'codex',
      displayName: 'Codex Shadow'
    }))
    writeJson(incompatiblePath, pluginManifest({
      id: 'future-claude-helper',
      displayName: 'Future Claude Helper',
      agentCompatibility: {
        agentId: 'claude-code',
        name: 'Claude Code',
        versionRange: '>=2.0.0'
      }
    }))

    const result = listAgentCapabilityPlugins(scanGroups, {
      manifestPaths: [validPath, invalidPath, incompatiblePath],
      homeDir: makeTempDir(),
      env: {}
    })

    expect(result.plugins.map((plugin) => plugin.id)).toEqual(['claude-code', 'codex'])
    expect(result.manifests).toEqual([
      expect.objectContaining({
        path: validPath,
        status: 'valid',
        id: 'claude-helper',
        agentCompatibility: expect.objectContaining({
          agentId: 'claude-code',
          detectedVersion: '1.2.3'
        })
      }),
      expect.objectContaining({
        path: invalidPath,
        status: 'invalid',
        id: 'codex',
        errors: [expect.objectContaining({ code: 'manifest-id-reserved' })]
      }),
      expect.objectContaining({
        path: incompatiblePath,
        status: 'incompatible',
        id: 'future-claude-helper',
        errors: [expect.objectContaining({ code: 'manifest-agent-version-incompatible' })]
      })
    ])
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

  it('exposes health check descriptors for built-in plugins', () => {
    const result = listAgentCapabilityPlugins(scanGroups)
    const claude = result.plugins.find((plugin) => plugin.id === 'claude-code')
    const codex = result.plugins.find((plugin) => plugin.id === 'codex')

    expect(claude?.healthCheckDescriptors.map((descriptor) => descriptor.id)).toEqual(
      claudeHealthCheckDescriptorIds
    )
    expect(codex?.healthCheckDescriptors.map((descriptor) => descriptor.id)).toEqual(
      codexHealthCheckDescriptorIds
    )
    expect(claude?.healthCheckDescriptors.find((descriptor) => descriptor.id === 'claude-code:configuration:permission-broad-bash'))
      .toMatchObject({
        agentId: 'claude-code',
        severity: 'warning',
        category: 'configuration',
        assetTypes: ['permission'],
        scopes: ['user', 'project'],
        sourceCodes: [
          'claude.user.data-directory',
          'claude.project.directory'
        ],
        targetRoute: '/configuration/capabilities?tab=permissions'
      })
    expect(codex?.healthCheckDescriptors.find((descriptor) => descriptor.id === 'codex:configuration:hook-skipped-type'))
      .toMatchObject({
        agentId: 'codex',
        severity: 'info',
        category: 'configuration',
        assetTypes: ['hook'],
        scopes: ['user', 'project'],
        sourceCodes: [
          'codex.user.config',
          'codex.user.hooks',
          'codex.project.config',
          'codex.project.hooks'
        ],
        targetRoute: '/configuration/capabilities?tab=hooks'
      })
  })

  it('exposes hook schema descriptors for built-in plugins', () => {
    const result = listAgentCapabilityPlugins(scanGroups)
    const claude = result.plugins.find((plugin) => plugin.id === 'claude-code')
    const codex = result.plugins.find((plugin) => plugin.id === 'codex')

    expect(claude?.hookSchema.agentId).toBe('claude-code')
    expect(codex?.hookSchema.agentId).toBe('codex')
    expect(claude?.hookSchema.events.map((event) => event.eventType).sort()).toEqual(
      claudeHookEventTypes
    )
    expect(codex?.hookSchema.events.map((event) => event.eventType).sort()).toEqual(
      codexHookEventTypes
    )
    expect(claude?.hookSchema.events.find((event) => event.eventType === 'PreToolUse'))
      .toMatchObject({
        stageId: 'tool-before',
        support: 'supported',
        matcherSupported: true,
        matcherField: 'tool_name'
      })
    expect(claude?.hookSchema.events.find((event) => event.eventType === 'CwdChanged'))
      .toMatchObject({
        stageId: 'context-maintenance',
        support: 'supported',
        matcherSupported: false
      })
    expect(codex?.hookSchema.events.find((event) => event.eventType === 'PostToolUse'))
      .toMatchObject({
        stageId: 'tool-after',
        support: 'partial',
        matcherSupported: true,
        matcherField: 'tool_name'
      })
  })

  it('describes hook handler fields and runnable support', () => {
    const result = listAgentCapabilityPlugins(scanGroups)
    const claude = result.plugins.find((plugin) => plugin.id === 'claude-code')
    const codex = result.plugins.find((plugin) => plugin.id === 'codex')
    const claudeHandlers = new Map(claude?.hookSchema.handlers.map((handler) => [handler.type, handler]))
    const codexHandlers = new Map(codex?.hookSchema.handlers.map((handler) => [handler.type, handler]))

    expect(Array.from(claudeHandlers.keys())).toEqual([
      'command',
      'http',
      'mcp_tool',
      'prompt',
      'agent'
    ])
    expect(claudeHandlers.get('http')).toMatchObject({
      runMode: 'runnable',
      primaryFieldNames: ['url']
    })
    expect(claudeHandlers.get('http')?.fields.find((field) => field.name === 'url'))
      .toMatchObject({
        required: true,
        primary: true,
        kind: 'string'
      })
    expect(claudeHandlers.get('mcp_tool')?.fields.filter((field) => field.required).map((field) => field.name))
      .toEqual(['type', 'server', 'tool'])
    expect(codexHandlers.get('command')).toMatchObject({
      runMode: 'runnable',
      primaryFieldNames: ['command', 'commandWindows']
    })
    expect(codexHandlers.get('prompt')).toMatchObject({
      runMode: 'parsed-only',
      primaryFieldNames: ['prompt']
    })
    expect(codexHandlers.get('agent')).toMatchObject({
      runMode: 'parsed-only',
      primaryFieldNames: ['prompt']
    })
  })

  it('keeps hook schema translation keys safe for i18next', () => {
    const result = listAgentCapabilityPlugins(scanGroups)
    const schemas = result.plugins.map((plugin) => plugin.hookSchema)
    const safeKey = /^[A-Za-z0-9_.-]+$/

    for (const schema of schemas) {
      for (const event of schema.events) {
        expect(event.labelKey).toMatch(safeKey)
        expect(event.descriptionKey).toMatch(safeKey)
        expect(event.labelKey).not.toContain(':')
      }
      for (const handler of schema.handlers) {
        expect(handler.labelKey).toMatch(safeKey)
        expect(handler.descriptionKey).toMatch(safeKey)
        expect(handler.labelKey).not.toContain(':')
        for (const field of handler.fields) {
          expect(field.labelKey).toMatch(safeKey)
          expect(field.descriptionKey).toMatch(safeKey)
        }
      }
    }
  })

  it('keeps health check descriptor metadata inside the runtime health contract', () => {
    const result = listAgentCapabilityPlugins(scanGroups)
    const descriptors = result.plugins.flatMap((plugin) => plugin.healthCheckDescriptors)

    expect(descriptors.length).toBeGreaterThan(0)
    for (const descriptor of descriptors) {
      const translationKeyId = descriptor.id.replace(/:/g, '.')

      expect(healthCheckCategories).toContain(descriptor.category)
      expect(healthCheckSeverities).toContain(descriptor.severity)
      expect(descriptor.agentId).not.toBe('all')
      expect(descriptor.labelKey).toBe(`settings.agentPluginHealthChecks.${translationKeyId}.label`)
      expect(descriptor.descriptionKey).toBe(
        `settings.agentPluginHealthChecks.${translationKeyId}.description`
      )
      expect(descriptor.suggestionKey).toBe(
        `settings.agentPluginHealthChecks.${translationKeyId}.suggestion`
      )
      expect(descriptor.labelKey).not.toContain(':')
      expect(descriptor.assetTypes ?? []).not.toEqual(expect.arrayContaining(['backup', 'debug']))
    }
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

function pluginManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: 'example-agent',
    displayName: 'Example Agent',
    version: '0.1.0',
    agentCompatibility: {
      agentId: 'example-agent',
      name: 'Example Agent',
      versionRange: '*'
    },
    permissions: [
      {
        kind: 'read',
        scopes: ['user'],
        pathPatterns: ['~/.example'],
        reason: 'Read local Example Agent configuration.'
      }
    ],
    ...overrides
  }
}

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-agent-plugin-registry-'))
  tempDirs.push(dir)
  return dir
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8')
}
