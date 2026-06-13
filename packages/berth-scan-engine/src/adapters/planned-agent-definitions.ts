import type {
  AgentAdapterDefinition,
  AgentAdapterSourcePolicy,
  AgentAdapterSourceSensitivity,
  AgentAdapterSourceStability
} from '../adapter-api'
import type {
  AgentCapabilityPluginAssetDescriptor,
  AgentCapabilityPluginManifestPermission,
  AgentCapabilityPluginReference
} from '../shared/types/agent-plugin'
import type { AssetCategory, AssetScope, AssetType, ScanSourceKind } from '../shared/types/asset'

const REF = {
  geminiConfig: 'https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md',
  geminiExtensions: 'https://google-gemini.github.io/gemini-cli/docs/extensions/',
  geminiSessions: 'https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/session-management.md',
  copilotConfig: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference',
  copilotCommands: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
  copilotPlugins: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference',
  cursorRules: 'https://cursor.com/docs/rules',
  cursorMcp: 'https://cursor.com/docs/mcp',
  cursorCliConfig: 'https://cursor.com/docs/cli/reference/configuration',
  cursorHooks: 'https://cursor.com/docs/hooks',
  cursorSkills: 'https://cursor.com/docs/skills',
  opencodeConfig: 'https://opencode.ai/docs/config/',
  opencodeRules: 'https://opencode.ai/docs/rules/',
  opencodePlugins: 'https://opencode.ai/docs/plugins/',
  opencodeRepo: 'https://github.com/anomalyco/opencode',
  openclawCli: 'https://docs.openclaw.ai/cli',
  openclawConfig: 'https://docs.openclaw.ai/gateway/configuration',
  openclawSkills: 'https://docs.openclaw.ai/tools/skills',
  openclawRepo: 'https://github.com/openclaw/openclaw',
  hermesConfig: 'https://hermes-agent.nousresearch.com/docs/user-guide/configuration',
  hermesSessions: 'https://hermes-agent.nousresearch.com/docs/developer-guide/session-storage',
  hermesPlugins: 'https://hermes-agent.nousresearch.com/docs/guides/build-a-hermes-plugin',
  hermesRepo: 'https://github.com/NousResearch/hermes-agent'
} as const

export const PLANNED_AGENT_ADAPTER_DEFINITIONS: AgentAdapterDefinition[] = [
  {
    id: 'gemini-cli',
    displayName: 'Gemini CLI',
    version: '0.1.0',
    homepageUrl: 'https://github.com/google-gemini/gemini-cli',
    downloadUrl: 'https://github.com/google-gemini/gemini-cli#installation',
    agentCompatibility: { agentId: 'gemini-cli', name: 'Gemini CLI' },
    versionProbe: { command: 'gemini', args: ['--version'], packageName: '@google/gemini-cli', source: 'cli' },
    permissions: [readPermission('~/.gemini', '<project>/.gemini', '<project>/GEMINI.md')],
    references: refs('Configuration', REF.geminiConfig, 'Extensions', REF.geminiExtensions),
    sources: [
      source('gemini.user.settings', 'user', 'file', ['capability'], '~/.gemini/settings.json', REF.geminiConfig),
      source('gemini.project.settings', 'project', 'file', ['capability'], '<project>/.gemini/settings.json', REF.geminiConfig),
      source('gemini.user.instructions', 'user', 'file', ['instruction'], '~/.gemini/GEMINI.md', REF.geminiConfig),
      source('gemini.project.instructions', 'project', 'file', ['instruction'], '<project>/GEMINI.md', REF.geminiConfig),
      source('gemini.user.extensions', 'user', 'directory', ['capability', 'instruction'], '~/.gemini/extensions', REF.geminiExtensions),
      source('gemini.user.sessions', 'session', 'directory', ['state'], '~/.gemini/tmp', REF.geminiSessions, {
        sensitivity: 'sensitive-metadata-only',
        maxRows: 200
      })
    ],
    assets: assets([
      ['gemini-md', 'instruction', ['user', 'project']],
      ['mcp-server', 'capability', ['user', 'project']],
      ['command', 'instruction', ['user']],
      ['session', 'state', ['session']],
      ['credential', 'integration', ['user'], true]
    ])
  },
  {
    id: 'github-copilot-cli',
    displayName: 'GitHub Copilot CLI',
    version: '0.1.0',
    homepageUrl: 'https://docs.github.com/en/copilot/how-tos/copilot-cli',
    downloadUrl: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli',
    agentCompatibility: { agentId: 'github-copilot-cli', name: 'GitHub Copilot CLI' },
    versionProbe: { command: 'copilot', args: ['version'], packageName: '@github/copilot', source: 'cli' },
    permissions: [readPermission('~/.copilot', '<project>/.github', '<project>/AGENTS.md')],
    references: refs('Config directory', REF.copilotConfig, 'Commands', REF.copilotCommands),
    sources: [
      source('copilot.user.home', 'user', 'directory', ['instruction', 'capability', 'state', 'observability', 'integration'], '~/.copilot', REF.copilotConfig),
      source('copilot.user.mcp-config', 'user', 'file', ['capability'], '~/.copilot/mcp-config.json', REF.copilotConfig),
      source('copilot.user.instructions', 'user', 'directory', ['instruction'], '~/.copilot/instructions', REF.copilotConfig),
      source('copilot.user.skills', 'user', 'directory', ['instruction'], '~/.copilot/skills', REF.copilotConfig),
      source('copilot.user.plugins', 'user', 'directory', ['capability'], '~/.copilot/installed-plugins', REF.copilotPlugins),
      source('copilot.user.sessions', 'session', 'directory', ['state'], '~/.copilot/session-state', REF.copilotConfig, {
        sensitivity: 'sensitive-metadata-only',
        maxRows: 200
      }),
      source('copilot.user.session-store', 'session', 'file', ['state'], '~/.copilot/session-store.db', REF.copilotConfig, {
        sensitivity: 'sensitive-metadata-only',
        maxBytes: 10_000_000
      }),
      source('copilot.project.instructions', 'project', 'file', ['instruction'], '<project>/.github/copilot-instructions.md', REF.copilotConfig),
      source('copilot.project.agents-md', 'project', 'file', ['instruction'], '<project>/AGENTS.md', REF.copilotConfig),
      source('copilot.project.mcp-config', 'project', 'file', ['capability'], '<project>/.github/mcp.json', REF.copilotConfig)
    ],
    assets: assets([
      ['agents-md', 'instruction', ['user', 'project']],
      ['skill', 'instruction', ['user', 'project']],
      ['agent', 'instruction', ['user', 'project']],
      ['mcp-server', 'capability', ['user', 'project']],
      ['hook', 'capability', ['user', 'project']],
      ['plugin', 'capability', ['user']],
      ['session', 'state', ['session']],
      ['credential', 'integration', ['user'], true]
    ])
  },
  {
    id: 'cursor',
    displayName: 'Cursor',
    version: '0.1.0',
    homepageUrl: 'https://cursor.com/docs',
    downloadUrl: 'https://cursor.com/downloads',
    agentCompatibility: { agentId: 'cursor', name: 'Cursor' },
    versionProbe: { command: 'cursor-agent', args: ['--version'], source: 'cli' },
    permissions: [readPermission('~/.cursor', '<project>/.cursor', '<project>/AGENTS.md')],
    references: refs('Rules', REF.cursorRules, 'MCP', REF.cursorMcp),
    sources: [
      source('cursor.project.rules', 'project', 'directory', ['instruction'], '<project>/.cursor/rules', REF.cursorRules),
      source('cursor.project.mcp', 'project', 'file', ['capability'], '<project>/.cursor/mcp.json', REF.cursorMcp),
      source('cursor.project.hooks', 'project', 'file', ['capability'], '<project>/.cursor/hooks.json', REF.cursorHooks),
      source('cursor.project.skills', 'project', 'directory', ['instruction'], '<project>/.cursor/skills', REF.cursorSkills),
      source('cursor.project.commands', 'project', 'directory', ['instruction'], '<project>/.cursor/commands', REF.cursorRules),
      source('cursor.project.agents-md', 'project', 'file', ['instruction'], '<project>/AGENTS.md', REF.cursorRules),
      source('cursor.user.config', 'user', 'file', ['capability'], '~/.cursor/cli-config.json', REF.cursorCliConfig),
      source('cursor.user.skills', 'user', 'directory', ['instruction'], '~/.cursor/skills', REF.cursorSkills),
      source('cursor.user.ide-state', 'user', 'directory', ['state'], '<cursor-user-data>/User', REF.cursorCliConfig, {
        stability: 'heuristic',
        sensitivity: 'sensitive-metadata-only',
        maxRows: 200
      })
    ],
    assets: assets([
      ['agents-md', 'instruction', ['project']],
      ['skill', 'instruction', ['user', 'project']],
      ['command', 'instruction', ['user', 'project']],
      ['mcp-server', 'capability', ['user', 'project']],
      ['hook', 'capability', ['user', 'project']],
      ['session', 'state', ['user']],
      ['credential', 'integration', ['user'], true]
    ])
  },
  {
    id: 'opencode',
    displayName: 'OpenCode',
    version: '0.1.0',
    homepageUrl: 'https://opencode.ai/',
    downloadUrl: 'https://opencode.ai/docs/',
    agentCompatibility: { agentId: 'opencode', name: 'OpenCode' },
    versionProbe: { command: 'opencode', args: ['--version'], source: 'cli' },
    permissions: [readPermission('~/.config/opencode', '~/.local/share/opencode', '<project>/.opencode', '<project>/opencode.json', '<project>/opencode.jsonc')],
    references: refs('Config', REF.opencodeConfig, 'Rules', REF.opencodeRules),
    sources: [
      source('opencode.user.config-jsonc', 'user', 'file', ['capability'], '~/.config/opencode/opencode.jsonc', REF.opencodeConfig),
      source('opencode.user.config', 'user', 'file', ['capability'], '~/.config/opencode/opencode.json', REF.opencodeConfig),
      source('opencode.user.assets', 'user', 'directory', ['instruction', 'capability'], '~/.config/opencode', REF.opencodeConfig),
      source('opencode.user.agents', 'user', 'directory', ['instruction'], '~/.config/opencode/agents', REF.opencodeConfig),
      source('opencode.user.commands', 'user', 'directory', ['instruction'], '~/.config/opencode/commands', REF.opencodeConfig),
      source('opencode.user.skills', 'user', 'directory', ['instruction'], '~/.config/opencode/skills', REF.opencodeConfig),
      source('opencode.user.plugins', 'user', 'directory', ['capability'], '~/.config/opencode/plugins', REF.opencodePlugins),
      source('opencode.project.config-jsonc', 'project', 'file', ['capability'], '<project>/opencode.jsonc', REF.opencodeConfig),
      source('opencode.project.config', 'project', 'file', ['capability'], '<project>/opencode.json', REF.opencodeConfig),
      source('opencode.project.assets', 'project', 'directory', ['instruction', 'capability'], '<project>/.opencode', REF.opencodeConfig),
      source('opencode.project.agents', 'project', 'directory', ['instruction'], '<project>/.opencode/agents', REF.opencodeConfig),
      source('opencode.project.commands', 'project', 'directory', ['instruction'], '<project>/.opencode/commands', REF.opencodeConfig),
      source('opencode.project.skills', 'project', 'directory', ['instruction'], '<project>/.opencode/skills', REF.opencodeConfig),
      source('opencode.project.plugins', 'project', 'directory', ['capability'], '<project>/.opencode/plugins', REF.opencodePlugins),
      source('opencode.project.agents-md', 'project', 'file', ['instruction'], '<project>/AGENTS.md', REF.opencodeRules),
      source('opencode.user.auth', 'user', 'file', ['integration'], '~/.local/share/opencode/auth.json', REF.opencodeConfig, {
        sensitivity: 'credential-presence-only',
        maxBytes: 0
      }),
      source('opencode.user.sessions-db', 'session', 'file', ['state'], '~/.local/share/opencode/opencode.db', REF.opencodeRepo, {
        stability: 'primary-source',
        sensitivity: 'sensitive-metadata-only',
        maxBytes: 10_000_000
      }),
      source('opencode.user.logs', 'user', 'directory', ['observability'], '~/.local/share/opencode/log', REF.opencodeConfig, {
        sensitivity: 'debug-summary-only',
        defaultHidden: true
      })
    ],
    assets: assets([
      ['agents-md', 'instruction', ['user', 'project']],
      ['skill', 'instruction', ['user', 'project']],
      ['agent', 'instruction', ['user', 'project']],
      ['command', 'instruction', ['user', 'project']],
      ['mcp-server', 'capability', ['user', 'project']],
      ['plugin', 'capability', ['user', 'project']],
      ['session', 'state', ['session']],
      ['debug', 'observability', ['user']],
      ['credential', 'integration', ['user'], true]
    ])
  },
  {
    id: 'openclaw',
    displayName: 'OpenClaw',
    version: '0.1.0',
    homepageUrl: 'https://docs.openclaw.ai/',
    downloadUrl: 'https://docs.openclaw.ai/cli',
    agentCompatibility: { agentId: 'openclaw', name: 'OpenClaw' },
    versionProbe: { command: 'openclaw', args: ['--version'], source: 'cli' },
    permissions: [readPermission('~/.openclaw', '~/.agents/skills')],
    references: refs('CLI', REF.openclawCli, 'Configuration', REF.openclawConfig),
    sources: [
      source('openclaw.user.config', 'user', 'file', ['capability'], '~/.openclaw/openclaw.json', REF.openclawConfig),
      source('openclaw.user.workspace', 'user', 'directory', ['instruction', 'capability'], '~/.openclaw/workspace', REF.openclawConfig),
      source('openclaw.user.skills', 'user', 'directory', ['instruction'], '~/.openclaw/skills', REF.openclawSkills),
      source('openclaw.user.shared-skills', 'user', 'directory', ['instruction'], '~/.agents/skills', REF.openclawSkills),
      source('openclaw.user.plugins', 'user', 'directory', ['capability'], '~/.openclaw/plugins', REF.openclawRepo, {
        stability: 'primary-source'
      }),
      source('openclaw.user.sessions', 'session', 'directory', ['state'], '~/.openclaw/agents', REF.openclawCli, {
        sensitivity: 'sensitive-metadata-only',
        maxRows: 200
      }),
      source('openclaw.user.logs', 'user', 'directory', ['observability'], '~/.openclaw/logs', REF.openclawCli, {
        sensitivity: 'debug-summary-only',
        defaultHidden: true
      })
    ],
    assets: assets([
      ['agents-md', 'instruction', ['user', 'project']],
      ['skill', 'instruction', ['user']],
      ['plugin', 'capability', ['user']],
      ['mcp-server', 'capability', ['user']],
      ['session', 'state', ['session']],
      ['debug', 'observability', ['user']],
      ['credential', 'integration', ['user'], true]
    ])
  },
  {
    id: 'hermes-agent',
    displayName: 'Hermes Agent',
    version: '0.1.0',
    homepageUrl: 'https://hermes-agent.nousresearch.com/docs',
    downloadUrl: 'https://github.com/NousResearch/hermes-agent',
    agentCompatibility: { agentId: 'hermes-agent', name: 'Hermes Agent' },
    versionProbe: { command: 'hermes', args: ['version'], source: 'cli' },
    permissions: [readPermission('~/.hermes')],
    references: refs('Configuration', REF.hermesConfig, 'Session storage', REF.hermesSessions),
    sources: [
      source('hermes.user.config', 'user', 'file', ['capability'], '~/.hermes/config.yaml', REF.hermesConfig),
      source('hermes.user.identity', 'user', 'file', ['instruction'], '~/.hermes/SOUL.md', REF.hermesConfig),
      source('hermes.user.memories', 'user', 'directory', ['instruction'], '~/.hermes/memories', REF.hermesConfig),
      source('hermes.user.skills', 'user', 'directory', ['instruction'], '~/.hermes/skills', REF.hermesConfig),
      source('hermes.user.plugins', 'user', 'directory', ['capability'], '~/.hermes/plugins', REF.hermesPlugins),
      source('hermes.user.hooks', 'user', 'directory', ['capability'], '~/.hermes/hooks', REF.hermesConfig),
      source('hermes.user.sessions-db', 'session', 'file', ['state'], '~/.hermes/state.db', REF.hermesSessions, {
        sensitivity: 'sensitive-metadata-only',
        maxBytes: 10_000_000
      }),
      source('hermes.user.logs', 'user', 'directory', ['observability'], '~/.hermes/logs', REF.hermesConfig, {
        sensitivity: 'debug-summary-only',
        defaultHidden: true
      }),
      source('hermes.user.checkpoints', 'user', 'directory', ['state'], '~/.hermes/checkpoints/store', REF.hermesRepo, {
        stability: 'primary-source',
        sensitivity: 'sensitive-metadata-only'
      })
    ],
    assets: assets([
      ['agents-md', 'instruction', ['user']],
      ['skill', 'instruction', ['user']],
      ['plugin', 'capability', ['user']],
      ['hook', 'capability', ['user']],
      ['session', 'state', ['session']],
      ['debug', 'observability', ['user']],
      ['credential', 'integration', ['user'], true]
    ])
  }
]

function source(
  code: string,
  scope: AssetScope,
  kind: ScanSourceKind,
  categories: AssetCategory[],
  pathPattern: string,
  evidenceUrl: string,
  options: {
    stability?: AgentAdapterSourceStability
    sensitivity?: AgentAdapterSourceSensitivity
    maxBytes?: number
    maxRows?: number
    defaultHidden?: boolean
  } = {}
): AgentAdapterSourcePolicy {
  return {
    code,
    scope,
    kind,
    categories,
    pathPattern,
    labelKey: `settings.agentPluginSources.${code}.label`,
    descriptionKey: `settings.agentPluginSources.${code}.description`,
    stability: options.stability ?? 'official-docs',
    evidenceUrls: [evidenceUrl],
    sensitivity: options.sensitivity ?? 'normal',
    maxBytes: options.maxBytes,
    maxRows: options.maxRows,
    defaultHidden: options.defaultHidden
  }
}

function assets(items: Array<[AssetType, AssetCategory, AssetScope[], boolean?]>): AgentCapabilityPluginAssetDescriptor[] {
  return items.map(([type, category, scopes, sensitive]) => ({
    type,
    category,
    scopes,
    sensitive,
    labelKey: `settings.agentPluginAssets.${type}.label`,
    descriptionKey: `settings.agentPluginAssets.${type}.description`
  }))
}

function readPermission(...pathPatterns: string[]): AgentCapabilityPluginManifestPermission {
  return {
    kind: 'read',
    scopes: ['user', 'project', 'session'],
    pathPatterns,
    reason: 'Read local agent configuration, capability, and state metadata.'
  }
}

function refs(...pairs: string[]): AgentCapabilityPluginReference[] {
  const result: AgentCapabilityPluginReference[] = []
  for (let index = 0; index < pairs.length; index += 2) {
    result.push({ label: pairs[index], url: pairs[index + 1] })
  }
  return result
}
