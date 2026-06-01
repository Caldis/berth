import type { AgentScanSourceGroup } from '@shared/types/ipc'
import type {
  AgentCapabilityPlugin,
  AgentCapabilityPluginAssetDescriptor,
  AgentCapabilityPluginCapability,
  AgentCapabilityPluginHealthCheckDescriptor,
  AgentCapabilityPluginListResult,
  AgentCapabilityPluginPermission,
  AgentCapabilityPluginSource,
  AgentCapabilityPluginSourceCoverage,
  AgentCapabilityPluginSourceDescriptor
} from '@shared/types/agent-plugin'
import type {
  AssetCategory,
  AssetScope,
  AssetType,
  ScanRoot,
  ScanSourceCode,
  ScanSourceKind,
  ScanSourceStatus
} from '@shared/types/asset'

const PLUGIN_SCHEMA_VERSION = 1
const BUILTIN_PLUGIN_VERSION = '0.1.0'

const SOURCE_STATUSES: ScanSourceStatus[] = ['scanned', 'missing', 'not-scanned']

const HEALTH_TARGET_ROUTES = {
  hooks: '/configuration/capabilities?tab=hooks',
  mcp: '/configuration/capabilities?tab=mcp',
  permissions: '/configuration/capabilities?tab=permissions',
  instructions: '/configuration/instructions',
  sessions: '/sessions'
} as const

const HEALTH_EVIDENCE_URLS = {
  claudeHooks: 'https://code.claude.com/docs/en/hooks',
  claudeSettings: 'https://code.claude.com/docs/en/settings',
  claudeMcp: 'https://code.claude.com/docs/en/mcp',
  claudeMemory: 'https://code.claude.com/docs/en/memory',
  claudeSkills: 'https://code.claude.com/docs/en/skills',
  claudeSubagents: 'https://code.claude.com/docs/en/sub-agents',
  claudeSessions: 'https://code.claude.com/docs/en/sessions',
  codexConfig: 'https://developers.openai.com/codex/config-reference',
  codexHooks: 'https://developers.openai.com/codex/hooks',
  codexSkills: 'https://developers.openai.com/codex/skills',
  codexSubagents: 'https://developers.openai.com/codex/subagents',
  codexAgentsMd: 'https://developers.openai.com/codex/guides/agents-md',
  codexWindows:
    'https://developers.openai.com/codex/app/windows#share-config-auth-and-sessions-with-wsl'
} as const

const CLAUDE_SETTINGS_SOURCE_CODES: ScanSourceCode[] = [
  'claude.user.data-directory',
  'claude.project.directory'
]

const CLAUDE_INSTRUCTION_SOURCE_CODES: ScanSourceCode[] = [
  'claude.user.data-directory',
  'claude.project.directory'
]

const CLAUDE_MCP_SOURCE_CODES: ScanSourceCode[] = [
  'claude.user.global-config',
  'claude.user.data-directory',
  'claude.project.mcp-config'
]

const CODEX_CONFIG_SOURCE_CODES: ScanSourceCode[] = [
  'codex.user.config',
  'codex.project.config'
]

const CODEX_HOOK_SOURCE_CODES: ScanSourceCode[] = [
  'codex.user.config',
  'codex.user.hooks',
  'codex.project.config',
  'codex.project.hooks'
]

const CODEX_INSTRUCTION_SOURCE_CODES: ScanSourceCode[] = [
  'codex.user.agents-md',
  'codex.project.agents-md'
]

const CODEX_SKILL_SOURCE_CODES: ScanSourceCode[] = [
  'codex.user.codex-home-skills',
  'codex.user.shared-skills',
  'codex.project.skills'
]

const CODEX_AGENT_SOURCE_CODES: ScanSourceCode[] = [
  'codex.user.agents-directory',
  'codex.project.agents-directory'
]

const CODEX_SESSION_SOURCE_CODES: ScanSourceCode[] = [
  'codex.user.sessions',
  'codex.session.archived-sessions'
]

const CLAUDE_SOURCE_DESCRIPTORS: AgentCapabilityPluginSourceDescriptor[] = [
  sourceDescriptor(
    'claude.user.data-directory',
    'user',
    'directory',
    ['instruction', 'capability', 'state', 'observability', 'integration'],
    '~/.claude'
  ),
  sourceDescriptor(
    'claude.user.global-config',
    'user',
    'file',
    ['capability'],
    '~/.claude.json'
  ),
  sourceDescriptor(
    'claude.project.directory',
    'project',
    'directory',
    ['instruction', 'capability'],
    '<project>/.claude'
  ),
  sourceDescriptor(
    'claude.project.mcp-config',
    'project',
    'file',
    ['capability'],
    '<project>/.mcp.json'
  ),
  sourceDescriptor(
    'claude.enterprise.managed-settings',
    'enterprise',
    'file',
    ['capability'],
    '<managed>/managed-settings.json'
  ),
  sourceDescriptor(
    'claude.enterprise.managed-mcp',
    'enterprise',
    'file',
    ['capability'],
    '<managed>/managed-mcp.json'
  )
]

const CODEX_SOURCE_DESCRIPTORS: AgentCapabilityPluginSourceDescriptor[] = [
  sourceDescriptor('codex.user.config', 'user', 'file', ['capability'], '~/.codex/config.toml'),
  sourceDescriptor('codex.user.hooks', 'user', 'file', ['capability'], '~/.codex/hooks.json'),
  sourceDescriptor('codex.user.agents-md', 'user', 'file', ['instruction'], '~/.codex/AGENTS.md'),
  sourceDescriptor(
    'codex.user.agents-directory',
    'user',
    'directory',
    ['instruction'],
    '~/.codex/agents'
  ),
  sourceDescriptor(
    'codex.user.codex-home-skills',
    'user',
    'directory',
    ['instruction'],
    '~/.codex/skills'
  ),
  sourceDescriptor('codex.user.sessions', 'user', 'directory', ['state'], '~/.codex/sessions'),
  sourceDescriptor(
    'codex.session.archived-sessions',
    'session',
    'directory',
    ['state'],
    '~/.codex/archived_sessions'
  ),
  sourceDescriptor(
    'codex.user.shared-skills',
    'user',
    'directory',
    ['instruction'],
    '~/.agents/skills'
  ),
  sourceDescriptor(
    'codex.project.agents-md',
    'project',
    'file',
    ['instruction'],
    '<project>/AGENTS.md'
  ),
  sourceDescriptor(
    'codex.project.config',
    'project',
    'file',
    ['capability'],
    '<project>/.codex/config.toml'
  ),
  sourceDescriptor(
    'codex.project.hooks',
    'project',
    'file',
    ['capability'],
    '<project>/.codex/hooks.json'
  ),
  sourceDescriptor(
    'codex.project.agents-directory',
    'project',
    'directory',
    ['instruction'],
    '<project>/.codex/agents'
  ),
  sourceDescriptor(
    'codex.project.skills',
    'project',
    'directory',
    ['instruction'],
    '<project>/.agents/skills'
  )
]

const CLAUDE_ASSET_DESCRIPTORS: AgentCapabilityPluginAssetDescriptor[] = [
  assetDescriptor(
    'claude-md',
    'instruction',
    ['user', 'project'],
    ['claude.user.data-directory', 'claude.project.directory']
  ),
  assetDescriptor(
    'agents-md',
    'instruction',
    ['user', 'project'],
    ['claude.user.data-directory', 'claude.project.directory']
  ),
  assetDescriptor(
    'skill',
    'instruction',
    ['user', 'project'],
    ['claude.user.data-directory', 'claude.project.directory']
  ),
  assetDescriptor(
    'agent',
    'instruction',
    ['user', 'project'],
    ['claude.user.data-directory', 'claude.project.directory']
  ),
  assetDescriptor(
    'command',
    'instruction',
    ['user', 'project'],
    ['claude.user.data-directory', 'claude.project.directory']
  ),
  assetDescriptor(
    'output-mode',
    'instruction',
    ['user'],
    ['claude.user.data-directory']
  ),
  assetDescriptor(
    'team',
    'instruction',
    ['user', 'project'],
    ['claude.user.data-directory', 'claude.project.directory']
  ),
  assetDescriptor(
    'mcp-server',
    'capability',
    ['user', 'project', 'enterprise'],
    [
      'claude.user.global-config',
      'claude.user.data-directory',
      'claude.project.mcp-config',
      'claude.enterprise.managed-mcp'
    ]
  ),
  assetDescriptor(
    'hook',
    'capability',
    ['user', 'project', 'enterprise'],
    [
      'claude.user.data-directory',
      'claude.project.directory',
      'claude.enterprise.managed-settings'
    ]
  ),
  assetDescriptor(
    'permission',
    'capability',
    ['user', 'project', 'enterprise'],
    [
      'claude.user.data-directory',
      'claude.project.directory',
      'claude.enterprise.managed-settings'
    ]
  ),
  assetDescriptor(
    'env',
    'capability',
    ['user', 'project', 'enterprise'],
    [
      'claude.user.data-directory',
      'claude.project.directory',
      'claude.enterprise.managed-settings'
    ]
  ),
  assetDescriptor(
    'statusline',
    'capability',
    ['user', 'project', 'enterprise'],
    [
      'claude.user.data-directory',
      'claude.project.directory',
      'claude.enterprise.managed-settings'
    ]
  ),
  assetDescriptor(
    'plugin',
    'capability',
    ['user'],
    ['claude.user.data-directory']
  ),
  assetDescriptor(
    'session',
    'state',
    ['session'],
    ['claude.user.data-directory']
  ),
  assetDescriptor(
    'plan',
    'state',
    ['user'],
    ['claude.user.data-directory']
  ),
  assetDescriptor(
    'todo',
    'state',
    ['user'],
    ['claude.user.data-directory']
  ),
  assetDescriptor(
    'history',
    'state',
    ['user'],
    ['claude.user.data-directory']
  ),
  assetDescriptor(
    'stats-cache',
    'observability',
    ['user'],
    ['claude.user.data-directory']
  ),
  assetDescriptor(
    'usage-data',
    'observability',
    ['user'],
    ['claude.user.data-directory']
  ),
  assetDescriptor(
    'ide-lock',
    'integration',
    ['user'],
    ['claude.user.data-directory']
  ),
  assetDescriptor(
    'credential',
    'integration',
    ['user'],
    ['claude.user.data-directory'],
    { sensitive: true }
  )
]

const CODEX_ASSET_DESCRIPTORS: AgentCapabilityPluginAssetDescriptor[] = [
  assetDescriptor(
    'agents-md',
    'instruction',
    ['user', 'project'],
    ['codex.user.agents-md', 'codex.project.agents-md']
  ),
  assetDescriptor(
    'agent',
    'instruction',
    ['user', 'project'],
    ['codex.user.agents-directory', 'codex.project.agents-directory']
  ),
  assetDescriptor(
    'skill',
    'instruction',
    ['user', 'project'],
    ['codex.user.codex-home-skills', 'codex.user.shared-skills', 'codex.project.skills']
  ),
  assetDescriptor(
    'mcp-server',
    'capability',
    ['user', 'project'],
    ['codex.user.config', 'codex.project.config']
  ),
  assetDescriptor(
    'hook',
    'capability',
    ['user', 'project'],
    ['codex.user.config', 'codex.user.hooks', 'codex.project.config', 'codex.project.hooks']
  ),
  assetDescriptor(
    'statusline',
    'capability',
    ['user', 'project'],
    ['codex.user.config', 'codex.project.config']
  ),
  assetDescriptor(
    'session',
    'state',
    ['session'],
    ['codex.user.sessions', 'codex.session.archived-sessions']
  )
]

const CLAUDE_HEALTH_CHECK_DESCRIPTORS: AgentCapabilityPluginHealthCheckDescriptor[] = [
  healthCheckDescriptor('claude-code:source:user-claude-md-missing', 'claude-code', 'info', 'source', {
    assetTypes: ['claude-md'],
    scopes: ['user'],
    sourceCodes: ['claude.user.data-directory'],
    targetRoute: HEALTH_TARGET_ROUTES.instructions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeMemory],
    confidence: 'low'
  }),
  healthCheckDescriptor('claude-code:syntax:json-config-invalid', 'claude-code', 'error', 'syntax', {
    assetTypes: ['hook', 'mcp-server', 'permission', 'env', 'statusline'],
    scopes: ['user', 'project'],
    sourceCodes: [
      'claude.user.data-directory',
      'claude.user.global-config',
      'claude.project.directory',
      'claude.project.mcp-config'
    ],
    evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeSettings],
    confidence: 'high'
  }),
  healthCheckDescriptor(
    'claude-code:configuration:settings-schema-missing',
    'claude-code',
    'info',
    'configuration',
    {
      assetTypes: ['hook', 'mcp-server', 'permission', 'env', 'statusline'],
      scopes: ['user', 'project'],
      sourceCodes: CLAUDE_SETTINGS_SOURCE_CODES,
      evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeSettings],
      confidence: 'low'
    }
  ),
  healthCheckDescriptor(
    'claude-code:structure:hook-command-missing-command',
    'claude-code',
    'error',
    'structure',
    {
      assetTypes: ['hook'],
      scopes: ['user', 'project'],
      sourceCodes: CLAUDE_SETTINGS_SOURCE_CODES,
      targetRoute: HEALTH_TARGET_ROUTES.hooks,
      evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeHooks],
      confidence: 'high'
    }
  ),
  healthCheckDescriptor('claude-code:structure:hook-http-missing-url', 'claude-code', 'error', 'structure', {
    assetTypes: ['hook'],
    scopes: ['user', 'project'],
    sourceCodes: CLAUDE_SETTINGS_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.hooks,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeHooks],
    confidence: 'high'
  }),
  healthCheckDescriptor(
    'claude-code:structure:hook-mcp-tool-missing-field',
    'claude-code',
    'error',
    'structure',
    {
      assetTypes: ['hook'],
      scopes: ['user', 'project'],
      sourceCodes: CLAUDE_SETTINGS_SOURCE_CODES,
      targetRoute: HEALTH_TARGET_ROUTES.hooks,
      evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeHooks, HEALTH_EVIDENCE_URLS.claudeMcp],
      confidence: 'high'
    }
  ),
  healthCheckDescriptor(
    'claude-code:structure:hook-prompt-missing-prompt',
    'claude-code',
    'error',
    'structure',
    {
      assetTypes: ['hook'],
      scopes: ['user', 'project'],
      sourceCodes: CLAUDE_SETTINGS_SOURCE_CODES,
      targetRoute: HEALTH_TARGET_ROUTES.hooks,
      evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeHooks],
      confidence: 'high'
    }
  ),
  healthCheckDescriptor(
    'claude-code:structure:hook-agent-missing-prompt',
    'claude-code',
    'error',
    'structure',
    {
      assetTypes: ['hook'],
      scopes: ['user', 'project'],
      sourceCodes: CLAUDE_SETTINGS_SOURCE_CODES,
      targetRoute: HEALTH_TARGET_ROUTES.hooks,
      evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeHooks],
      confidence: 'high'
    }
  ),
  healthCheckDescriptor('claude-code:structure:hook-unknown-type', 'claude-code', 'warning', 'structure', {
    assetTypes: ['hook'],
    scopes: ['user', 'project'],
    sourceCodes: CLAUDE_SETTINGS_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.hooks,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeHooks],
    confidence: 'high'
  }),
  healthCheckDescriptor(
    'claude-code:configuration:hook-shell-ignored-with-args',
    'claude-code',
    'info',
    'configuration',
    {
      assetTypes: ['hook'],
      scopes: ['user', 'project'],
      sourceCodes: CLAUDE_SETTINGS_SOURCE_CODES,
      targetRoute: HEALTH_TARGET_ROUTES.hooks,
      evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeHooks],
      confidence: 'high'
    }
  ),
  healthCheckDescriptor(
    'claude-code:configuration:hook-windows-shell',
    'claude-code',
    'warning',
    'configuration',
    {
      assetTypes: ['hook'],
      scopes: ['user', 'project'],
      sourceCodes: CLAUDE_SETTINGS_SOURCE_CODES,
      targetRoute: HEALTH_TARGET_ROUTES.hooks,
      evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeHooks],
      confidence: 'medium'
    }
  ),
  healthCheckDescriptor('claude-code:configuration:permission-bypass', 'claude-code', 'warning', 'configuration', {
    assetTypes: ['permission'],
    scopes: ['user', 'project'],
    sourceCodes: CLAUDE_SETTINGS_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.permissions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeSettings],
    confidence: 'medium'
  }),
  healthCheckDescriptor(
    'claude-code:configuration:permission-broad-bash',
    'claude-code',
    'warning',
    'configuration',
    {
      assetTypes: ['permission'],
      scopes: ['user', 'project'],
      sourceCodes: CLAUDE_SETTINGS_SOURCE_CODES,
      targetRoute: HEALTH_TARGET_ROUTES.permissions,
      evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeSettings],
      confidence: 'medium'
    }
  ),
  healthCheckDescriptor('claude-code:structure:mcp-invalid', 'claude-code', 'error', 'structure', {
    assetTypes: ['mcp-server'],
    scopes: ['user', 'project'],
    sourceCodes: CLAUDE_MCP_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.mcp,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeMcp],
    confidence: 'high'
  }),
  healthCheckDescriptor('claude-code:structure:mcp-missing-transport', 'claude-code', 'warning', 'structure', {
    assetTypes: ['mcp-server'],
    scopes: ['user', 'project'],
    sourceCodes: CLAUDE_MCP_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.mcp,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeMcp],
    confidence: 'high'
  }),
  healthCheckDescriptor('claude-code:source:instruction-file-unreadable', 'claude-code', 'error', 'source', {
    assetTypes: ['claude-md', 'agents-md'],
    scopes: ['user', 'project'],
    sourceCodes: CLAUDE_INSTRUCTION_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.instructions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeMemory],
    confidence: 'high'
  }),
  healthCheckDescriptor('claude-code:reference:instruction-import-missing', 'claude-code', 'warning', 'reference', {
    assetTypes: ['claude-md', 'agents-md'],
    scopes: ['user', 'project'],
    sourceCodes: CLAUDE_INSTRUCTION_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.instructions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeMemory],
    confidence: 'high'
  }),
  healthCheckDescriptor(
    'claude-code:reference:project-agents-md-not-imported',
    'claude-code',
    'info',
    'reference',
    {
      assetTypes: ['claude-md', 'agents-md'],
      scopes: ['project'],
      sourceCodes: ['claude.project.directory'],
      targetRoute: HEALTH_TARGET_ROUTES.instructions,
      evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeMemory],
      confidence: 'medium'
    }
  ),
  healthCheckDescriptor('claude-code:structure:skill-missing-entrypoint', 'claude-code', 'warning', 'structure', {
    assetTypes: ['skill'],
    scopes: ['user', 'project'],
    sourceCodes: CLAUDE_INSTRUCTION_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.instructions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeSkills],
    confidence: 'high'
  }),
  healthCheckDescriptor('claude-code:syntax:skill-frontmatter-invalid', 'claude-code', 'warning', 'syntax', {
    assetTypes: ['skill'],
    scopes: ['user', 'project'],
    sourceCodes: CLAUDE_INSTRUCTION_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.instructions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeSkills],
    confidence: 'high'
  }),
  healthCheckDescriptor('claude-code:syntax:subagent-frontmatter-invalid', 'claude-code', 'error', 'syntax', {
    assetTypes: ['agent'],
    scopes: ['user', 'project'],
    sourceCodes: CLAUDE_INSTRUCTION_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.instructions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeSubagents],
    confidence: 'high'
  }),
  healthCheckDescriptor(
    'claude-code:structure:subagent-metadata-incomplete',
    'claude-code',
    'warning',
    'structure',
    {
      assetTypes: ['agent'],
      scopes: ['user', 'project'],
      sourceCodes: CLAUDE_INSTRUCTION_SOURCE_CODES,
      targetRoute: HEALTH_TARGET_ROUTES.instructions,
      evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeSubagents],
      confidence: 'high'
    }
  ),
  healthCheckDescriptor('claude-code:session:empty-project-dirs', 'claude-code', 'info', 'session', {
    assetTypes: ['session'],
    scopes: ['session'],
    sourceCodes: ['claude.user.data-directory'],
    targetRoute: HEALTH_TARGET_ROUTES.sessions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeSessions],
    confidence: 'low'
  }),
  healthCheckDescriptor('claude-code:session:metadata-missing', 'claude-code', 'info', 'session', {
    assetTypes: ['session'],
    scopes: ['session'],
    sourceCodes: ['claude.user.data-directory'],
    targetRoute: HEALTH_TARGET_ROUTES.sessions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.claudeSessions],
    confidence: 'low'
  })
]

const CODEX_HEALTH_CHECK_DESCRIPTORS: AgentCapabilityPluginHealthCheckDescriptor[] = [
  healthCheckDescriptor('codex:syntax:config-invalid', 'codex', 'error', 'syntax', {
    assetTypes: ['mcp-server', 'hook', 'statusline'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_CONFIG_SOURCE_CODES,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexConfig],
    confidence: 'high'
  }),
  healthCheckDescriptor('codex:configuration:config-schema-comment-missing', 'codex', 'info', 'configuration', {
    assetTypes: ['mcp-server', 'hook', 'statusline'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_CONFIG_SOURCE_CODES,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexConfig],
    confidence: 'low'
  }),
  healthCheckDescriptor('codex:syntax:hooks-json-invalid', 'codex', 'error', 'syntax', {
    assetTypes: ['hook'],
    scopes: ['user', 'project'],
    sourceCodes: ['codex.user.hooks', 'codex.project.hooks'],
    targetRoute: HEALTH_TARGET_ROUTES.hooks,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexHooks],
    confidence: 'high'
  }),
  healthCheckDescriptor('codex:configuration:hooks-duplicated', 'codex', 'warning', 'configuration', {
    assetTypes: ['hook'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_HOOK_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.hooks,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexHooks],
    confidence: 'medium'
  }),
  healthCheckDescriptor('codex:configuration:hook-async-skipped', 'codex', 'info', 'configuration', {
    assetTypes: ['hook'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_HOOK_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.hooks,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexHooks],
    confidence: 'high'
  }),
  healthCheckDescriptor('codex:configuration:hook-skipped-type', 'codex', 'info', 'configuration', {
    assetTypes: ['hook'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_HOOK_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.hooks,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexHooks],
    confidence: 'high'
  }),
  healthCheckDescriptor('codex:structure:hook-command-missing-command', 'codex', 'error', 'structure', {
    assetTypes: ['hook'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_HOOK_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.hooks,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexHooks],
    confidence: 'high'
  }),
  healthCheckDescriptor('codex:configuration:hook-windows-command', 'codex', 'warning', 'configuration', {
    assetTypes: ['hook'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_HOOK_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.hooks,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexHooks],
    confidence: 'medium'
  }),
  healthCheckDescriptor('codex:configuration:hook-windows-command-override', 'codex', 'info', 'configuration', {
    assetTypes: ['hook'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_HOOK_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.hooks,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexHooks],
    confidence: 'high'
  }),
  healthCheckDescriptor(
    'codex:configuration:project-config-ignored-local-keys',
    'codex',
    'warning',
    'configuration',
    {
      assetTypes: ['mcp-server'],
      scopes: ['project'],
      sourceCodes: ['codex.project.config'],
      targetRoute: HEALTH_TARGET_ROUTES.mcp,
      evidenceUrls: [HEALTH_EVIDENCE_URLS.codexConfig],
      confidence: 'high'
    }
  ),
  healthCheckDescriptor('codex:structure:mcp-invalid', 'codex', 'error', 'structure', {
    assetTypes: ['mcp-server'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_CONFIG_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.mcp,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexConfig],
    confidence: 'high'
  }),
  healthCheckDescriptor('codex:structure:mcp-missing-transport', 'codex', 'warning', 'structure', {
    assetTypes: ['mcp-server'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_CONFIG_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.mcp,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexConfig],
    confidence: 'high'
  }),
  healthCheckDescriptor('codex:source:instruction-file-unreadable', 'codex', 'error', 'source', {
    assetTypes: ['agents-md'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_INSTRUCTION_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.instructions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexAgentsMd],
    confidence: 'high'
  }),
  healthCheckDescriptor('codex:reference:instruction-import-missing', 'codex', 'warning', 'reference', {
    assetTypes: ['agents-md'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_INSTRUCTION_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.instructions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexAgentsMd],
    confidence: 'high'
  }),
  healthCheckDescriptor('codex:structure:skill-missing-entrypoint', 'codex', 'warning', 'structure', {
    assetTypes: ['skill'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_SKILL_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.instructions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexSkills],
    confidence: 'high'
  }),
  healthCheckDescriptor('codex:syntax:skill-frontmatter-invalid', 'codex', 'warning', 'syntax', {
    assetTypes: ['skill'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_SKILL_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.instructions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexSkills],
    confidence: 'high'
  }),
  healthCheckDescriptor(
    'codex:structure:skill-frontmatter-missing-required',
    'codex',
    'warning',
    'structure',
    {
      assetTypes: ['skill'],
      scopes: ['user', 'project'],
      sourceCodes: CODEX_SKILL_SOURCE_CODES,
      targetRoute: HEALTH_TARGET_ROUTES.instructions,
      evidenceUrls: [HEALTH_EVIDENCE_URLS.codexSkills],
      confidence: 'high'
    }
  ),
  healthCheckDescriptor('codex:syntax:custom-agent-toml-invalid', 'codex', 'error', 'syntax', {
    assetTypes: ['agent'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_AGENT_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.instructions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexSubagents],
    confidence: 'high'
  }),
  healthCheckDescriptor('codex:structure:custom-agent-metadata-incomplete', 'codex', 'warning', 'structure', {
    assetTypes: ['agent'],
    scopes: ['user', 'project'],
    sourceCodes: CODEX_AGENT_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.instructions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexSubagents],
    confidence: 'high'
  }),
  healthCheckDescriptor('codex:session:user-sessions-empty', 'codex', 'info', 'session', {
    assetTypes: ['session'],
    scopes: ['session'],
    sourceCodes: ['codex.user.sessions'],
    targetRoute: HEALTH_TARGET_ROUTES.sessions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexWindows],
    confidence: 'low'
  }),
  healthCheckDescriptor('codex:session:empty-transcript', 'codex', 'warning', 'session', {
    assetTypes: ['session'],
    scopes: ['session'],
    sourceCodes: CODEX_SESSION_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.sessions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexWindows],
    confidence: 'low'
  }),
  healthCheckDescriptor('codex:session:unreadable-transcript', 'codex', 'error', 'session', {
    assetTypes: ['session'],
    scopes: ['session'],
    sourceCodes: CODEX_SESSION_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.sessions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexWindows],
    confidence: 'high'
  }),
  healthCheckDescriptor('codex:session:metadata-missing', 'codex', 'info', 'session', {
    assetTypes: ['session'],
    scopes: ['session'],
    sourceCodes: CODEX_SESSION_SOURCE_CODES,
    targetRoute: HEALTH_TARGET_ROUTES.sessions,
    evidenceUrls: [HEALTH_EVIDENCE_URLS.codexWindows],
    confidence: 'low'
  })
]

export function listAgentCapabilityPlugins(
  groups: AgentScanSourceGroup[] = []
): AgentCapabilityPluginListResult {
  return {
    plugins: [
      buildClaudeCodePlugin(findGroup(groups, 'claude-code')),
      buildCodexPlugin(findGroup(groups, 'codex'))
    ]
  }
}

function buildClaudeCodePlugin(group: AgentScanSourceGroup | undefined): AgentCapabilityPlugin {
  return {
    id: 'claude-code',
    displayName: 'Claude Code',
    version: BUILTIN_PLUGIN_VERSION,
    schemaVersion: PLUGIN_SCHEMA_VERSION,
    builtin: true,
    enabled: true,
    detected: group?.installed === true,
    agentCompatibility: {
      agentId: 'claude-code',
      name: 'Claude Code'
    },
    capabilities: [
      capability('sourceDiscovery', 'available'),
      capability('assetParsing', 'available'),
      capability('hookSchema', 'partial', 'claudeHookSchema'),
      capability('hookActions', 'partial', 'claudeHookActions'),
      capability('healthChecks', 'partial', 'healthChecksNotPluginOwned'),
      capability('sessionUsageParsing', 'available'),
      capability('uiGuidance', 'partial', 'uiGuidanceInProgress')
    ],
    permissions: [
      permission('read', ['user', 'project', 'enterprise', 'session'], [
        '~/.claude',
        '~/.claude.json',
        '<project>/.claude',
        '<project>/.mcp.json',
        '<managed>/managed-settings.json',
        '<managed>/managed-mcp.json'
      ], 'claudeRead'),
      permission('write', ['user'], [
        '~/.claude/settings.json',
        '~/.claude/.berth/hooks-state.json'
      ], 'claudeWrite')
    ],
    sourceDescriptors: CLAUDE_SOURCE_DESCRIPTORS,
    assetDescriptors: CLAUDE_ASSET_DESCRIPTORS,
    healthCheckDescriptors: CLAUDE_HEALTH_CHECK_DESCRIPTORS,
    sourceCoverage: buildSourceCoverage(group, CLAUDE_SOURCE_DESCRIPTORS),
    references: [
      {
        label: 'Claude Code hooks',
        url: 'https://code.claude.com/docs/en/hooks'
      },
      {
        label: 'Claude Code settings',
        url: 'https://code.claude.com/docs/en/settings'
      }
    ]
  }
}

function buildCodexPlugin(group: AgentScanSourceGroup | undefined): AgentCapabilityPlugin {
  return {
    id: 'codex',
    displayName: 'Codex',
    version: BUILTIN_PLUGIN_VERSION,
    schemaVersion: PLUGIN_SCHEMA_VERSION,
    builtin: true,
    enabled: true,
    detected: group?.installed === true,
    agentCompatibility: {
      agentId: 'codex',
      name: 'Codex'
    },
    capabilities: [
      capability('sourceDiscovery', 'available'),
      capability('assetParsing', 'available'),
      capability('hookSchema', 'partial', 'codexHookSchema'),
      capability('hookActions', 'partial', 'codexHookActions'),
      capability('healthChecks', 'partial', 'healthChecksNotPluginOwned'),
      capability('sessionUsageParsing', 'available'),
      capability('uiGuidance', 'partial', 'uiGuidanceInProgress')
    ],
    permissions: [
      permission('read', ['user', 'project', 'session'], [
        '~/.codex/config.toml',
        '~/.codex/hooks.json',
        '~/.codex/AGENTS.md',
        '~/.codex/agents',
        '~/.codex/skills',
        '~/.codex/sessions',
        '~/.codex/archived_sessions',
        '~/.agents/skills',
        '<project>/AGENTS.md',
        '<project>/.codex',
        '<project>/.agents/skills'
      ], 'codexRead'),
      permission('write', ['user'], [
        '~/.codex/config.toml'
      ], 'codexWrite')
    ],
    sourceDescriptors: CODEX_SOURCE_DESCRIPTORS,
    assetDescriptors: CODEX_ASSET_DESCRIPTORS,
    healthCheckDescriptors: CODEX_HEALTH_CHECK_DESCRIPTORS,
    sourceCoverage: buildSourceCoverage(group, CODEX_SOURCE_DESCRIPTORS),
    references: [
      {
        label: 'Codex hooks',
        url: 'https://developers.openai.com/codex/hooks'
      }
    ]
  }
}

function findGroup(
  groups: AgentScanSourceGroup[],
  agentId: AgentCapabilityPlugin['id']
): AgentScanSourceGroup | undefined {
  return groups.find((group) => group.agentId === agentId)
}

function capability(
  id: AgentCapabilityPluginCapability['id'],
  status: AgentCapabilityPluginCapability['status'],
  statusDetailKey?: string
): AgentCapabilityPluginCapability {
  return {
    id,
    status,
    labelKey: `settings.agentPluginCapabilities.${id}.label`,
    descriptionKey: `settings.agentPluginCapabilities.${id}.description`,
    statusDetailKey: statusDetailKey
      ? `settings.agentPluginCapabilityDetails.${statusDetailKey}`
      : undefined
  }
}

function permission(
  kind: AgentCapabilityPluginPermission['kind'],
  scopes: AssetScope[],
  pathPatterns: string[],
  reasonId: string
): AgentCapabilityPluginPermission {
  return {
    kind,
    scopes,
    pathPatterns,
    reasonKey: `settings.agentPluginPermissionReasons.${reasonId}`
  }
}

function sourceDescriptor(
  code: ScanSourceCode,
  scope: AssetScope,
  kind: ScanSourceKind,
  categories: AssetCategory[],
  pathPattern: string
): AgentCapabilityPluginSourceDescriptor {
  return {
    code,
    scope,
    kind,
    categories,
    pathPattern,
    labelKey: `settings.agentPluginSources.${code}.label`,
    descriptionKey: `settings.agentPluginSources.${code}.description`
  }
}

function assetDescriptor(
  type: AssetType,
  category: AssetCategory,
  scopes: AssetScope[],
  sourceCodes?: ScanSourceCode[],
  options: { sensitive?: boolean } = {}
): AgentCapabilityPluginAssetDescriptor {
  return {
    type,
    category,
    scopes,
    sourceCodes,
    sensitive: options.sensitive,
    labelKey: `settings.agentPluginAssets.${type}.label`,
    descriptionKey: `settings.agentPluginAssets.${type}.description`
  }
}

function healthCheckDescriptor(
  id: AgentCapabilityPluginHealthCheckDescriptor['id'],
  agentId: AgentCapabilityPluginHealthCheckDescriptor['agentId'],
  severity: AgentCapabilityPluginHealthCheckDescriptor['severity'],
  category: AgentCapabilityPluginHealthCheckDescriptor['category'],
  options: Omit<
    AgentCapabilityPluginHealthCheckDescriptor,
    'id' | 'agentId' | 'severity' | 'category' | 'labelKey' | 'descriptionKey' | 'suggestionKey'
  > = {}
): AgentCapabilityPluginHealthCheckDescriptor {
  return {
    id,
    agentId,
    severity,
    category,
    ...options,
    labelKey: `settings.agentPluginHealthChecks.${id}.label`,
    descriptionKey: `settings.agentPluginHealthChecks.${id}.description`,
    suggestionKey: `settings.agentPluginHealthChecks.${id}.suggestion`
  }
}

function buildSourceCoverage(
  group: AgentScanSourceGroup | undefined,
  descriptors: AgentCapabilityPluginSourceDescriptor[]
): AgentCapabilityPluginSourceCoverage {
  const roots = group ? group.sources ?? group.roots : []
  const descriptorByCode = new Map(descriptors.map((descriptor) => [descriptor.code, descriptor]))
  const sources = roots.map((root) => toPluginSource(root, descriptorByCode))
  const counts = SOURCE_STATUSES.reduce<Record<ScanSourceStatus, number>>((result, status) => {
    result[status] = 0
    return result
  }, {
    scanned: 0,
    missing: 0,
    'not-scanned': 0
  })

  for (const source of sources) {
    counts[source.status] += 1
  }

  return {
    total: sources.length,
    counts,
    sources
  }
}

function toPluginSource(
  source: ScanRoot,
  descriptorByCode: Map<ScanSourceCode, AgentCapabilityPluginSourceDescriptor>
): AgentCapabilityPluginSource {
  const descriptor = source.code ? descriptorByCode.get(source.code) : undefined

  return {
    path: source.path,
    scope: source.scope,
    status: source.status ?? 'scanned',
    code: source.code,
    kind: source.kind ?? descriptor?.kind,
    categories: source.categories ?? descriptor?.categories,
    declared: descriptor !== undefined,
    labelKey: descriptor?.labelKey,
    descriptionKey: descriptor?.descriptionKey,
    pathPattern: descriptor?.pathPattern
  }
}
