import type { AgentScanSourceGroup } from '@shared/types/ipc'
import type {
  AgentCapabilityPlugin,
  AgentCapabilityPluginAssetDescriptor,
  AgentCapabilityPluginCapability,
  AgentCapabilityPluginHealthCheckDescriptor,
  AgentCapabilityPluginHookEventDescriptor,
  AgentCapabilityPluginHookHandlerDescriptor,
  AgentCapabilityPluginHookHandlerFieldDescriptor,
  AgentCapabilityPluginHookSchemaDescriptor,
  AgentCapabilityPluginListResult,
  AgentCapabilityPluginManifestEntry,
  AgentCapabilityPluginManifestPermission,
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
  ScanSourceStatus
} from '@shared/types/asset'
import type { AgentAdapterDefinition } from '@berth/scan-engine/adapter-api'
import { PLANNED_AGENT_ADAPTER_DEFINITIONS } from '@berth/scan-engine/adapters/planned-agent-definitions'
import { CLAUDE_SOURCE_DESCRIPTORS, CODEX_SOURCE_DESCRIPTORS } from './descriptors'
import { loadAgentPluginManifests } from '@berth/scan-engine/agent-plugins/manifest'

const PLUGIN_SCHEMA_VERSION = 1
const BUILTIN_PLUGIN_VERSION = '0.1.0'
const BUILTIN_PLUGIN_IDS = ['claude-code', 'codex'] as const

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

const CLAUDE_HOOK_SCHEMA: AgentCapabilityPluginHookSchemaDescriptor = hookSchema(
  'claude-code',
  [
    hookEvent('claude-code', 'Setup', 'session-start', 'supported'),
    hookEvent('claude-code', 'SessionStart', 'session-start', 'supported'),
    hookEvent('claude-code', 'UserPromptSubmit', 'user-input', 'supported'),
    hookEvent('claude-code', 'UserPromptExpansion', 'user-input', 'supported'),
    hookEvent('claude-code', 'PreToolUse', 'tool-before', 'supported', {
      matcherSupported: true,
      matcherField: 'tool_name'
    }),
    hookEvent('claude-code', 'PermissionRequest', 'permission', 'supported'),
    hookEvent('claude-code', 'PermissionDenied', 'permission', 'supported'),
    hookEvent('claude-code', 'Elicitation', 'permission', 'supported'),
    hookEvent('claude-code', 'ElicitationResult', 'permission', 'supported'),
    hookEvent('claude-code', 'PostToolUse', 'tool-after', 'supported', {
      matcherSupported: true,
      matcherField: 'tool_name'
    }),
    hookEvent('claude-code', 'PostToolUseFailure', 'tool-after', 'supported', {
      matcherSupported: true,
      matcherField: 'tool_name'
    }),
    hookEvent('claude-code', 'PostToolBatch', 'tool-after', 'supported'),
    hookEvent('claude-code', 'SubagentStart', 'subagent', 'supported'),
    hookEvent('claude-code', 'SubagentStop', 'subagent', 'supported'),
    hookEvent('claude-code', 'TaskCreated', 'subagent', 'supported'),
    hookEvent('claude-code', 'TaskCompleted', 'subagent', 'supported'),
    hookEvent('claude-code', 'TeammateIdle', 'subagent', 'supported'),
    hookEvent('claude-code', 'PreCompact', 'context-maintenance', 'supported'),
    hookEvent('claude-code', 'PostCompact', 'context-maintenance', 'supported'),
    hookEvent('claude-code', 'InstructionsLoaded', 'context-maintenance', 'supported'),
    hookEvent('claude-code', 'ConfigChange', 'context-maintenance', 'supported'),
    hookEvent('claude-code', 'CwdChanged', 'context-maintenance', 'supported'),
    hookEvent('claude-code', 'FileChanged', 'context-maintenance', 'supported'),
    hookEvent('claude-code', 'Stop', 'session-stop', 'supported'),
    hookEvent('claude-code', 'StopFailure', 'session-stop', 'supported'),
    hookEvent('claude-code', 'SessionEnd', 'session-stop', 'supported'),
    hookEvent('claude-code', 'WorktreeCreate', 'environment', 'supported'),
    hookEvent('claude-code', 'WorktreeRemove', 'environment', 'supported'),
    hookEvent('claude-code', 'Notification', 'environment', 'supported')
  ],
  [
    hookHandler('claude-code', 'command', 'runnable', [
      hookField('type', 'string', { required: true }),
      hookField('command', 'string', { required: true, primary: true }),
      hookField('args', 'string-array'),
      hookField('shell', 'string'),
      hookField('async', 'boolean'),
      hookField('asyncRewake', 'boolean'),
      hookField('allowedEnvVars', 'string-array'),
      hookCommonField('if'),
      hookCommonField('timeout'),
      hookCommonField('statusMessage'),
      hookCommonField('once')
    ]),
    hookHandler('claude-code', 'http', 'runnable', [
      hookField('type', 'string', { required: true }),
      hookField('url', 'string', { required: true, primary: true }),
      hookField('headers', 'object'),
      hookCommonField('if'),
      hookCommonField('timeout'),
      hookCommonField('statusMessage'),
      hookCommonField('once')
    ]),
    hookHandler('claude-code', 'mcp_tool', 'runnable', [
      hookField('type', 'string', { required: true }),
      hookField('server', 'string', { required: true, primary: true }),
      hookField('tool', 'string', { required: true, primary: true }),
      hookField('input', 'object'),
      hookCommonField('if'),
      hookCommonField('timeout'),
      hookCommonField('statusMessage'),
      hookCommonField('once')
    ]),
    hookHandler('claude-code', 'prompt', 'runnable', [
      hookField('type', 'string', { required: true }),
      hookField('prompt', 'string', { required: true, primary: true }),
      hookField('model', 'string'),
      hookCommonField('if'),
      hookCommonField('timeout'),
      hookCommonField('statusMessage'),
      hookCommonField('once')
    ]),
    hookHandler('claude-code', 'agent', 'runnable', [
      hookField('type', 'string', { required: true }),
      hookField('prompt', 'string', { required: true, primary: true }),
      hookField('model', 'string'),
      hookCommonField('if'),
      hookCommonField('timeout'),
      hookCommonField('statusMessage'),
      hookCommonField('once')
    ])
  ]
)

const CODEX_HOOK_SCHEMA: AgentCapabilityPluginHookSchemaDescriptor = hookSchema(
  'codex',
  [
    hookEvent('codex', 'SessionStart', 'session-start', 'supported'),
    hookEvent('codex', 'UserPromptSubmit', 'user-input', 'supported'),
    hookEvent('codex', 'PreToolUse', 'tool-before', 'partial', {
      matcherSupported: true,
      matcherField: 'tool_name'
    }),
    hookEvent('codex', 'PermissionRequest', 'permission', 'supported'),
    hookEvent('codex', 'PostToolUse', 'tool-after', 'partial', {
      matcherSupported: true,
      matcherField: 'tool_name'
    }),
    hookEvent('codex', 'SubagentStart', 'subagent', 'supported'),
    hookEvent('codex', 'SubagentStop', 'subagent', 'supported'),
    hookEvent('codex', 'PreCompact', 'context-maintenance', 'supported'),
    hookEvent('codex', 'PostCompact', 'context-maintenance', 'supported'),
    hookEvent('codex', 'Stop', 'session-stop', 'supported')
  ],
  [
    hookHandler('codex', 'command', 'runnable', [
      hookField('type', 'string', { required: true }),
      hookField('command', 'string', { required: true, primary: true }),
      hookField('commandWindows', 'string', { primary: true }),
      hookField('command_windows', 'string'),
      hookField('async', 'boolean'),
      hookField('timeout', 'number'),
      hookField('statusMessage', 'string'),
      hookField('status_message', 'string'),
      hookField('managed', 'boolean')
    ]),
    hookHandler('codex', 'prompt', 'parsed-only', [
      hookField('type', 'string', { required: true }),
      hookField('prompt', 'string', { primary: true }),
      hookField('model', 'string'),
      hookField('async', 'boolean'),
      hookField('timeout', 'number'),
      hookField('statusMessage', 'string'),
      hookField('managed', 'boolean')
    ], { supportNoteId: 'parsedOnly' }),
    hookHandler('codex', 'agent', 'parsed-only', [
      hookField('type', 'string', { required: true }),
      hookField('prompt', 'string', { primary: true }),
      hookField('model', 'string'),
      hookField('async', 'boolean'),
      hookField('timeout', 'number'),
      hookField('statusMessage', 'string'),
      hookField('managed', 'boolean')
    ], { supportNoteId: 'parsedOnly' })
  ]
)

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

export interface AgentCapabilityPluginRegistryOptions {
  homeDir?: string
  projectDir?: string
  env?: NodeJS.ProcessEnv
  manifestPaths?: string[]
}

export function listAgentCapabilityPlugins(
  groups: AgentScanSourceGroup[] = [],
  options: AgentCapabilityPluginRegistryOptions = {}
): AgentCapabilityPluginListResult {
  const manifests = loadAgentPluginManifests({
    ...options,
    agentVersions: toAgentVersions(groups),
    reservedIds: BUILTIN_PLUGIN_IDS
  })
  const manifestPluginIds = new Set(
    manifests
      .filter((manifest) => manifest.status === 'valid' && Boolean(manifest.id))
      .map((manifest) => manifest.id!)
  )
  return {
    plugins: [
      buildClaudeCodePlugin(findGroup(groups, 'claude-code')),
      buildCodexPlugin(findGroup(groups, 'codex')),
      ...buildPlannedAdapterPlugins(manifestPluginIds),
      ...buildManifestPlugins(manifests, groups)
    ],
    manifests
  }
}

function buildPlannedAdapterPlugins(manifestPluginIds: Set<string>): AgentCapabilityPlugin[] {
  return PLANNED_AGENT_ADAPTER_DEFINITIONS
    .filter((definition) => !manifestPluginIds.has(definition.id))
    .map((definition) => buildPlannedAdapterPlugin(definition))
}

function buildPlannedAdapterPlugin(definition: AgentAdapterDefinition): AgentCapabilityPlugin {
  const agentId = definition.agentCompatibility?.agentId ?? definition.id
  return {
    id: definition.id,
    displayName: definition.displayName,
    version: definition.version,
    schemaVersion: PLUGIN_SCHEMA_VERSION,
    builtin: true,
    enabled: false,
    detected: false,
    agentCompatibility: {
      agentId,
      name: definition.agentCompatibility?.name ?? definition.displayName,
      versionRange: definition.agentCompatibility?.versionRange
    },
    capabilities: plannedAdapterCapabilities(definition),
    permissions: definition.permissions.map((permission) => ({
      kind: permission.kind,
      scopes: permission.scopes,
      pathPatterns: permission.pathPatterns,
      reasonKey: 'settings.agentPluginPermissionReasons.plannedRead'
    })),
    sourceDescriptors: definition.sources,
    assetDescriptors: definition.assets,
    hookSchema: definition.hookSchema ?? {
      agentId,
      events: [],
      handlers: []
    },
    healthCheckDescriptors: definition.healthChecks ?? [],
    sourceCoverage: buildPlannedSourceCoverage(definition),
    references: [
      { label: 'Homepage', url: definition.homepageUrl },
      { label: 'Download', url: definition.downloadUrl },
      ...definition.references
    ]
  }
}

function plannedAdapterCapabilities(
  definition: AgentAdapterDefinition
): AgentCapabilityPluginCapability[] {
  const result: AgentCapabilityPluginCapability[] = []
  if (definition.sources.length > 0) {
    result.push(capability('sourceDiscovery', 'planned', 'plannedAdapterMetadataOnly'))
  }
  if (definition.assets.length > 0) {
    result.push(capability('assetParsing', 'planned', 'plannedAdapterMetadataOnly'))
  }
  if (definition.hookSchema) {
    result.push(capability('hookSchema', 'planned', 'plannedAdapterMetadataOnly'))
  }
  if ((definition.healthChecks?.length ?? 0) > 0) {
    result.push(capability('healthChecks', 'planned', 'plannedAdapterMetadataOnly'))
  }
  return result.length > 0 ? result : [capability('sourceDiscovery', 'planned', 'plannedAdapterMetadataOnly')]
}

function buildPlannedSourceCoverage(
  definition: AgentAdapterDefinition
): AgentCapabilityPluginSourceCoverage {
  const sources: AgentCapabilityPluginSource[] = definition.sources.map((source) => ({
    path: '',
    scope: source.scope,
    status: 'not-scanned',
    code: source.code,
    kind: source.kind,
    categories: source.categories,
    declared: true,
    pathPattern: source.pathPattern,
    stability: source.stability,
    evidenceUrls: source.evidenceUrls,
    sensitivity: source.sensitivity,
    maxBytes: source.maxBytes,
    maxRows: source.maxRows,
    defaultHidden: source.defaultHidden
  }))
  return {
    total: sources.length,
    counts: {
      scanned: 0,
      missing: 0,
      'not-scanned': sources.length
    },
    sources
  }
}

function toAgentVersions(groups: AgentScanSourceGroup[]): Record<string, string | undefined> {
  return Object.fromEntries(groups.map((group) => [group.agentId, group.version]))
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
    hookSchema: CLAUDE_HOOK_SCHEMA,
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
    hookSchema: CODEX_HOOK_SCHEMA,
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

function buildManifestPlugins(
  manifests: AgentCapabilityPluginManifestEntry[],
  groups: AgentScanSourceGroup[]
): AgentCapabilityPlugin[] {
  return manifests
    .filter((manifest) => manifest.status === 'valid' && Boolean(manifest.id))
    .map((manifest) => buildManifestPlugin(manifest, groups))
}

function buildManifestPlugin(
  manifest: AgentCapabilityPluginManifestEntry,
  groups: AgentScanSourceGroup[]
): AgentCapabilityPlugin {
  const id = manifest.id ?? manifest.path
  const agentId = manifest.agentCompatibility?.agentId ?? id
  const group = findGroup(groups, id)
  const sourceDescriptors = manifest.sourceDescriptors ?? []
  const hookSchema = manifest.hookSchema ?? {
    agentId,
    events: [],
    handlers: []
  }

  return {
    id,
    displayName: manifest.displayName ?? id,
    version: manifest.version ?? '0.0.0',
    schemaVersion: manifest.schemaVersion ?? PLUGIN_SCHEMA_VERSION,
    builtin: false,
    enabled: manifest.activationReadiness.status === 'metadata-only' ||
      manifest.activationReadiness.status === 'activation-ready',
    detected: group?.installed === true,
    agentCompatibility: {
      agentId,
      name: manifest.agentCompatibility?.name ?? manifest.displayName ?? id,
      versionRange: manifest.agentCompatibility?.versionRange
    },
    capabilities: manifestCapabilities(manifest),
    permissions: manifestPermissions(manifest.permissions),
    sourceDescriptors,
    assetDescriptors: manifest.assetDescriptors ?? [],
    hookSchema,
    healthCheckDescriptors: manifest.healthCheckDescriptors ?? [],
    sourceCoverage: buildSourceCoverage(group, sourceDescriptors),
    references: manifest.references ?? []
  }
}

function manifestCapabilities(
  manifest: AgentCapabilityPluginManifestEntry
): AgentCapabilityPluginCapability[] {
  const result: AgentCapabilityPluginCapability[] = []
  if ((manifest.sourceDescriptors?.length ?? 0) > 0) {
    result.push(capability('sourceDiscovery', 'available'))
  }
  if ((manifest.assetDescriptors?.length ?? 0) > 0) {
    result.push(capability('assetParsing', manifest.implementation ? 'partial' : 'planned', 'manifestAdapterMetadataOnly'))
  }
  if (manifest.hookSchema) {
    result.push(capability('hookSchema', 'available'))
  }
  if ((manifest.healthCheckDescriptors?.length ?? 0) > 0) {
    result.push(capability('healthChecks', 'partial', 'healthChecksNotPluginOwned'))
  }
  if (manifest.implementation) {
    result.push(capability('uiGuidance', 'partial', 'thirdPartyCodeNotExecuted'))
  }
  return result.length > 0 ? result : [capability('sourceDiscovery', 'planned', 'manifestMetadataOnly')]
}

function manifestPermissions(
  permissions: AgentCapabilityPluginManifestPermission[] | undefined
): AgentCapabilityPluginPermission[] {
  return (permissions ?? []).map((permission) => ({
    kind: permission.kind,
    scopes: permission.scopes,
    pathPatterns: permission.pathPatterns,
    reasonKey: permission.reason
  }))
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

function hookSchema(
  agentId: AgentCapabilityPluginHookSchemaDescriptor['agentId'],
  events: AgentCapabilityPluginHookEventDescriptor[],
  handlers: AgentCapabilityPluginHookHandlerDescriptor[]
): AgentCapabilityPluginHookSchemaDescriptor {
  return {
    agentId,
    events,
    handlers
  }
}

function hookEvent(
  agentId: AgentCapabilityPluginHookSchemaDescriptor['agentId'],
  eventType: string,
  stageId: AgentCapabilityPluginHookEventDescriptor['stageId'],
  support: AgentCapabilityPluginHookEventDescriptor['support'],
  options: Partial<
    Pick<
      AgentCapabilityPluginHookEventDescriptor,
      'matcherSupported' | 'matcherField' | 'evidenceUrls'
    >
  > = {}
): AgentCapabilityPluginHookEventDescriptor {
  const agentKey = toTranslationKeyId(agentId)
  const eventKey = toTranslationKeyId(eventType)

  return {
    eventType,
    stageId,
    support,
    matcherSupported: options.matcherSupported ?? false,
    matcherField: options.matcherField,
    labelKey: `settings.agentPluginHookEvents.${agentKey}.${eventKey}.label`,
    descriptionKey: `settings.agentPluginHookEvents.${agentKey}.${eventKey}.description`,
    evidenceUrls: options.evidenceUrls ?? [hookEvidenceUrl(agentId)]
  }
}

function hookHandler(
  agentId: AgentCapabilityPluginHookSchemaDescriptor['agentId'],
  type: string,
  runMode: AgentCapabilityPluginHookHandlerDescriptor['runMode'],
  fields: AgentCapabilityPluginHookHandlerFieldDescriptor[],
  options: { supportNoteId?: string; evidenceUrls?: string[] } = {}
): AgentCapabilityPluginHookHandlerDescriptor {
  const agentKey = toTranslationKeyId(agentId)
  const typeKey = toTranslationKeyId(type)

  return {
    type,
    runMode,
    fields: fields.map((field) => ({
      ...field,
      labelKey: `settings.agentPluginHookHandlers.${agentKey}.${typeKey}.fields.${toTranslationKeyId(field.name)}.label`,
      descriptionKey: `settings.agentPluginHookHandlers.${agentKey}.${typeKey}.fields.${toTranslationKeyId(field.name)}.description`
    })),
    primaryFieldNames: fields.filter((field) => field.primary).map((field) => field.name),
    labelKey: `settings.agentPluginHookHandlers.${agentKey}.${typeKey}.label`,
    descriptionKey: `settings.agentPluginHookHandlers.${agentKey}.${typeKey}.description`,
    supportNoteKey: options.supportNoteId
      ? `settings.agentPluginHookHandlers.${agentKey}.${typeKey}.supportNotes.${toTranslationKeyId(options.supportNoteId)}`
      : undefined,
    evidenceUrls: options.evidenceUrls ?? [hookEvidenceUrl(agentId)]
  }
}

function hookField(
  name: string,
  kind: AgentCapabilityPluginHookHandlerFieldDescriptor['kind'],
  options: Pick<AgentCapabilityPluginHookHandlerFieldDescriptor, 'required' | 'primary'> = {}
): AgentCapabilityPluginHookHandlerFieldDescriptor {
  return {
    name,
    kind,
    required: options.required,
    primary: options.primary,
    labelKey: '',
    descriptionKey: ''
  }
}

function hookCommonField(
  name: 'if' | 'timeout' | 'statusMessage' | 'once'
): AgentCapabilityPluginHookHandlerFieldDescriptor {
  const kind = name === 'timeout' ? 'number' : name === 'once' ? 'boolean' : 'string'

  return hookField(name, kind)
}

function hookEvidenceUrl(agentId: AgentCapabilityPluginHookSchemaDescriptor['agentId']): string {
  return agentId === 'claude-code'
    ? HEALTH_EVIDENCE_URLS.claudeHooks
    : HEALTH_EVIDENCE_URLS.codexHooks
}

function toTranslationKeyId(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]/g, '.')
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
  const translationKeyId = id.replace(/:/g, '.')

  return {
    id,
    agentId,
    severity,
    category,
    ...options,
    labelKey: `settings.agentPluginHealthChecks.${translationKeyId}.label`,
    descriptionKey: `settings.agentPluginHealthChecks.${translationKeyId}.description`,
    suggestionKey: `settings.agentPluginHealthChecks.${translationKeyId}.suggestion`
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
