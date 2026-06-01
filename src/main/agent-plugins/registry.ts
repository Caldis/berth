import type { AgentScanSourceGroup } from '@shared/types/ipc'
import type {
  AgentCapabilityPlugin,
  AgentCapabilityPluginCapability,
  AgentCapabilityPluginListResult,
  AgentCapabilityPluginPermission,
  AgentCapabilityPluginSource,
  AgentCapabilityPluginSourceCoverage,
  AgentCapabilityPluginSourceDescriptor
} from '@shared/types/agent-plugin'
import type {
  AssetCategory,
  AssetScope,
  ScanRoot,
  ScanSourceCode,
  ScanSourceKind,
  ScanSourceStatus
} from '@shared/types/asset'

const PLUGIN_SCHEMA_VERSION = 1
const BUILTIN_PLUGIN_VERSION = '0.1.0'

const SOURCE_STATUSES: ScanSourceStatus[] = ['scanned', 'missing', 'not-scanned']

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
