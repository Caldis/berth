import type { AgentCapabilityPluginSourceDescriptor } from '@shared/types/agent-plugin'
import type { AssetCategory, AssetScope, ScanRoot, ScanSourceCode, ScanSourceKind } from '@shared/types/asset'

export const CLAUDE_SOURCE_DESCRIPTORS: AgentCapabilityPluginSourceDescriptor[] = [
  sourceDescriptor(
    'claude.user.data-directory',
    'user',
    'directory',
    ['instruction', 'capability', 'state', 'observability', 'integration'],
    '~/.claude'
  ),
  sourceDescriptor('claude.user.global-config', 'user', 'file', ['capability'], '~/.claude.json'),
  sourceDescriptor(
    'claude.project.directory',
    'project',
    'directory',
    ['instruction', 'capability'],
    '<project>/.claude'
  ),
  sourceDescriptor('claude.project.mcp-config', 'project', 'file', ['capability'], '<project>/.mcp.json'),
  sourceDescriptor(
    'claude.enterprise.managed-settings',
    'enterprise',
    'file',
    ['capability'],
    '<managed>/managed-settings.json'
  ),
  sourceDescriptor('claude.enterprise.managed-mcp', 'enterprise', 'file', ['capability'], '<managed>/managed-mcp.json')
]

export const CODEX_SOURCE_DESCRIPTORS: AgentCapabilityPluginSourceDescriptor[] = [
  sourceDescriptor('codex.user.config', 'user', 'file', ['capability'], '~/.codex/config.toml'),
  sourceDescriptor('codex.user.hooks', 'user', 'file', ['capability'], '~/.codex/hooks.json'),
  sourceDescriptor('codex.user.agents-md', 'user', 'file', ['instruction'], '~/.codex/AGENTS.md'),
  sourceDescriptor('codex.user.agents-directory', 'user', 'directory', ['instruction'], '~/.codex/agents'),
  sourceDescriptor('codex.user.codex-home-skills', 'user', 'directory', ['instruction'], '~/.codex/skills'),
  sourceDescriptor('codex.user.sessions', 'user', 'directory', ['state'], '~/.codex/sessions'),
  sourceDescriptor('codex.session.archived-sessions', 'session', 'directory', ['state'], '~/.codex/archived_sessions'),
  sourceDescriptor('codex.user.shared-skills', 'user', 'directory', ['instruction'], '~/.agents/skills'),
  sourceDescriptor('codex.project.agents-md', 'project', 'file', ['instruction'], '<project>/AGENTS.md'),
  sourceDescriptor('codex.project.config', 'project', 'file', ['capability'], '<project>/.codex/config.toml'),
  sourceDescriptor('codex.project.hooks', 'project', 'file', ['capability'], '<project>/.codex/hooks.json'),
  sourceDescriptor('codex.project.agents-directory', 'project', 'directory', ['instruction'], '<project>/.codex/agents'),
  sourceDescriptor('codex.project.skills', 'project', 'directory', ['instruction'], '<project>/.agents/skills')
]

export function scanRootFromDescriptor(
  descriptors: AgentCapabilityPluginSourceDescriptor[],
  code: ScanSourceCode,
  rootPath: string,
  status: NonNullable<ScanRoot['status']> = 'scanned'
): ScanRoot {
  const descriptor = descriptors.find((item) => item.code === code)
  if (!descriptor) {
    throw new Error(`Unknown scan source descriptor: ${code}`)
  }
  return {
    path: rootPath,
    scope: descriptor.scope,
    code: descriptor.code,
    categories: descriptor.categories,
    kind: descriptor.kind,
    status
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
