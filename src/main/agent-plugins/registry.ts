import type { AgentScanSourceGroup } from '@shared/types/ipc'
import type {
  AgentCapabilityPlugin,
  AgentCapabilityPluginCapability,
  AgentCapabilityPluginListResult,
  AgentCapabilityPluginPermission,
  AgentCapabilityPluginSource,
  AgentCapabilityPluginSourceCoverage
} from '@shared/types/agent-plugin'
import type { AssetScope, ScanRoot, ScanSourceStatus } from '@shared/types/asset'

const PLUGIN_SCHEMA_VERSION = 1
const BUILTIN_PLUGIN_VERSION = '0.1.0'

const SOURCE_STATUSES: ScanSourceStatus[] = ['scanned', 'missing', 'not-scanned']

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
    sourceCoverage: buildSourceCoverage(group),
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
    sourceCoverage: buildSourceCoverage(group),
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

function buildSourceCoverage(
  group: AgentScanSourceGroup | undefined
): AgentCapabilityPluginSourceCoverage {
  const roots = group ? group.sources ?? group.roots : []
  const sources = roots.map(toPluginSource)
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

function toPluginSource(source: ScanRoot): AgentCapabilityPluginSource {
  return {
    path: source.path,
    scope: source.scope,
    status: source.status ?? 'scanned',
    code: source.code,
    kind: source.kind,
    categories: source.categories
  }
}
