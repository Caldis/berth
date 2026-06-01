export interface FeatureGuideDocLink {
  labelKey: string
  url: string
}

export interface FeatureGuideProviderMapping {
  provider: string
  config: string
  meaningKey: string
}

export interface FeatureGuideInsight {
  titleKey: string
  bodyKey: string
  agentView?: 'all' | 'claude' | 'codex'
}

export interface FeatureGuideDefinition {
  id: string
  titleKey: string
  summaryKey: string
  insightKeys?: FeatureGuideInsight[]
  pointKeys?: string[]
  docLinks?: FeatureGuideDocLink[]
  providerMappings?: FeatureGuideProviderMapping[]
}

export interface FeatureGuideEvidence {
  labelKey: string
  helpKey?: string
  value: number | string
  tone?: 'default' | 'warning'
}

export type InstructionGuideId =
  | 'memories'
  | 'conventions'
  | 'skills'
  | 'subagents'
  | 'commands'
  | 'outputModes'
  | 'agentTeams'

export type CapabilityGuideId =
  | 'mcp'
  | 'hooks'
  | 'plugins'
  | 'statusLine'
  | 'permissions'
  | 'env'

const CLAUDE_SETTINGS_URL = 'https://code.claude.com/docs/en/settings'
const CLAUDE_MEMORY_URL = 'https://code.claude.com/docs/en/memory'
const CLAUDE_SKILLS_URL = 'https://code.claude.com/docs/en/skills'
const CLAUDE_SUBAGENTS_URL = 'https://code.claude.com/docs/en/sub-agents'
const CLAUDE_OUTPUT_STYLES_URL = 'https://code.claude.com/docs/en/output-styles'
const CLAUDE_MCP_URL = 'https://code.claude.com/docs/en/mcp'
const CLAUDE_HOOKS_URL = 'https://code.claude.com/docs/en/hooks'
const CLAUDE_STATUSLINE_URL = 'https://code.claude.com/docs/en/statusline'
const CLAUDE_PERMISSIONS_URL = 'https://code.claude.com/docs/en/permissions'
const CLAUDE_PLUGINS_URL = 'https://code.claude.com/docs/en/plugins'
const CODEX_AGENTS_MD_URL = 'https://developers.openai.com/codex/guides/agents-md'
const CODEX_CONFIG_URL = 'https://developers.openai.com/codex/config-reference'
const CODEX_SKILLS_URL = 'https://developers.openai.com/codex/skills'
const CODEX_SUBAGENTS_URL = 'https://developers.openai.com/codex/subagents'
const CODEX_HOOKS_URL = 'https://developers.openai.com/codex/hooks'
const CODEX_MCP_URL = 'https://developers.openai.com/codex/mcp'
const CODEX_PERMISSIONS_URL = 'https://developers.openai.com/codex/permissions'
const CODEX_SECURITY_URL = 'https://developers.openai.com/codex/agent-approvals-security'
const CODEX_CLI_URL = 'https://developers.openai.com/codex/cli'
const MCP_INTRO_URL = 'https://modelcontextprotocol.io/docs/getting-started/intro'
const MCP_TOOLS_SPEC_URL = 'https://modelcontextprotocol.io/specification/2025-06-18/server/tools'

function guide(
  id: string,
  baseKey: string,
  docs: FeatureGuideDocLink[],
  providerMappings: FeatureGuideProviderMapping[],
  insightKeys?: FeatureGuideInsight[]
): FeatureGuideDefinition {
  return {
    id,
    titleKey: `${baseKey}.title`,
    summaryKey: `${baseKey}.summary`,
    pointKeys: [`${baseKey}.points.role`, `${baseKey}.points.scope`, `${baseKey}.points.review`],
    insightKeys,
    docLinks: docs,
    providerMappings
  }
}

function provider(baseKey: string, providerName: string, config: string): FeatureGuideProviderMapping {
  return {
    provider: providerName,
    config,
    meaningKey: `${baseKey}.providers.${providerName === 'Claude Code' ? 'claude' : providerName === 'Codex' ? 'codex' : 'abstract'}`
  }
}

export const instructionGuideMap: Record<InstructionGuideId, FeatureGuideDefinition> = {
  memories: guide('instructions.memories', 'instructions.guidance.memories', [
    { labelKey: 'instructions.guidance.docs.claudeMemory', url: CLAUDE_MEMORY_URL },
    { labelKey: 'instructions.guidance.docs.codexAgentsMd', url: CODEX_AGENTS_MD_URL }
  ], [
    provider('instructions.guidance.memories', 'Claude Code', 'native memory files'),
    provider('instructions.guidance.memories', 'Codex', 'AGENTS.md and imported guidance'),
    provider('instructions.guidance.memories', 'Abstract', 'durable local notes')
  ], [
    { titleKey: 'instructions.guidance.memories.insights.sources.title', bodyKey: 'instructions.guidance.memories.insights.sources.body' },
    { titleKey: 'instructions.guidance.memories.insights.priority.title', bodyKey: 'instructions.guidance.memories.insights.priority.body' },
    { titleKey: 'instructions.guidance.memories.insights.review.title', bodyKey: 'instructions.guidance.memories.insights.review.body' }
  ]),
  conventions: guide('instructions.conventions', 'instructions.guidance.conventions', [
    { labelKey: 'instructions.guidance.docs.claudeMemory', url: CLAUDE_MEMORY_URL },
    { labelKey: 'instructions.guidance.docs.codexAgentsMd', url: CODEX_AGENTS_MD_URL }
  ], [
    provider('instructions.guidance.conventions', 'Claude Code', 'CLAUDE.md'),
    provider('instructions.guidance.conventions', 'Codex', 'AGENTS.md')
  ]),
  skills: guide('instructions.skills', 'instructions.guidance.skills', [
    { labelKey: 'instructions.guidance.docs.claudeSkills', url: CLAUDE_SKILLS_URL },
    { labelKey: 'instructions.guidance.docs.codexSkills', url: CODEX_SKILLS_URL }
  ], [
    provider('instructions.guidance.skills', 'Claude Code', 'SKILL.md'),
    provider('instructions.guidance.skills', 'Codex', 'skills directory')
  ]),
  subagents: guide('instructions.subagents', 'instructions.guidance.subagents', [
    { labelKey: 'instructions.guidance.docs.claudeSubagents', url: CLAUDE_SUBAGENTS_URL },
    { labelKey: 'instructions.guidance.docs.codexSubagents', url: CODEX_SUBAGENTS_URL }
  ], [
    provider('instructions.guidance.subagents', 'Claude Code', '.claude/agents/*.md'),
    provider('instructions.guidance.subagents', 'Codex', 'subagents config')
  ]),
  commands: guide('instructions.commands', 'instructions.guidance.commands', [
    { labelKey: 'instructions.guidance.docs.claudeSkills', url: CLAUDE_SKILLS_URL },
    { labelKey: 'instructions.guidance.docs.codexSlashCommands', url: 'https://developers.openai.com/codex/cli/slash-commands' }
  ], [
    provider('instructions.guidance.commands', 'Claude Code', '.claude/commands or skills'),
    provider('instructions.guidance.commands', 'Codex', 'slash commands')
  ]),
  outputModes: guide('instructions.outputModes', 'instructions.guidance.outputModes', [
    { labelKey: 'instructions.guidance.docs.claudeOutputStyles', url: CLAUDE_OUTPUT_STYLES_URL },
    { labelKey: 'instructions.guidance.docs.claudeSettings', url: CLAUDE_SETTINGS_URL }
  ], [
    provider('instructions.guidance.outputModes', 'Claude Code', 'output styles'),
    provider('instructions.guidance.outputModes', 'Abstract', 'response style policy')
  ]),
  agentTeams: guide('instructions.agentTeams', 'instructions.guidance.agentTeams', [
    { labelKey: 'instructions.guidance.docs.claudeSettings', url: CLAUDE_SETTINGS_URL },
    { labelKey: 'instructions.guidance.docs.codexConfig', url: CODEX_CONFIG_URL }
  ], [
    provider('instructions.guidance.agentTeams', 'Claude Code', 'agent teams'),
    provider('instructions.guidance.agentTeams', 'Abstract', 'multi-agent orchestration')
  ])
}

export const capabilityGuideMap: Record<CapabilityGuideId, FeatureGuideDefinition> = {
  mcp: guide('capabilities.mcp', 'capabilities.guidance.mcp', [
    { labelKey: 'capabilities.guidance.docs.mcpIntro', url: MCP_INTRO_URL },
    { labelKey: 'capabilities.guidance.docs.mcpTools', url: MCP_TOOLS_SPEC_URL },
    { labelKey: 'capabilities.guidance.docs.claudeMcp', url: CLAUDE_MCP_URL },
    { labelKey: 'capabilities.guidance.docs.codexMcp', url: CODEX_MCP_URL }
  ], [
    provider('capabilities.guidance.mcp', 'Claude Code', 'mcpServers / .mcp.json'),
    provider('capabilities.guidance.mcp', 'Codex', 'config.toml mcp_servers'),
    provider('capabilities.guidance.mcp', 'Abstract', 'MCP tools/resources')
  ]),
  hooks: guide('capabilities.hooks', 'capabilities.guidance.hooks', [
    { labelKey: 'capabilities.guidance.docs.claudeHooks', url: CLAUDE_HOOKS_URL },
    { labelKey: 'capabilities.guidance.docs.codexHooks', url: CODEX_HOOKS_URL }
  ], [
    provider('capabilities.guidance.hooks', 'Claude Code', 'settings.json hooks'),
    provider('capabilities.guidance.hooks', 'Codex', 'config.toml hooks')
  ], [
    { titleKey: 'capabilities.hooks.intro.tips.trigger.title', bodyKey: 'capabilities.hooks.intro.tips.trigger.body' },
    { titleKey: 'capabilities.hooks.intro.tips.handler.title', bodyKey: 'capabilities.hooks.intro.tips.handler.body' },
    { titleKey: 'capabilities.hooks.intro.tips.difference.title.all', bodyKey: 'capabilities.hooks.intro.tips.difference.body.all', agentView: 'all' },
    { titleKey: 'capabilities.hooks.intro.tips.difference.title.claude', bodyKey: 'capabilities.hooks.intro.tips.difference.body.claude', agentView: 'claude' },
    { titleKey: 'capabilities.hooks.intro.tips.difference.title.codex', bodyKey: 'capabilities.hooks.intro.tips.difference.body.codex', agentView: 'codex' }
  ]),
  plugins: guide('capabilities.plugins', 'capabilities.guidance.plugins', [
    { labelKey: 'capabilities.guidance.docs.claudePlugins', url: CLAUDE_PLUGINS_URL },
    { labelKey: 'capabilities.guidance.docs.claudeSettings', url: CLAUDE_SETTINGS_URL }
  ], [
    provider('capabilities.guidance.plugins', 'Claude Code', '.claude-plugin/plugin.json'),
    provider('capabilities.guidance.plugins', 'Abstract', 'capability bundle')
  ]),
  statusLine: guide('capabilities.statusLine', 'capabilities.guidance.statusLine', [
    { labelKey: 'capabilities.guidance.docs.claudeStatusLine', url: CLAUDE_STATUSLINE_URL },
    { labelKey: 'capabilities.guidance.docs.codexConfig', url: CODEX_CONFIG_URL }
  ], [
    provider('capabilities.guidance.statusLine', 'Claude Code', 'settings.json statusLine'),
    provider('capabilities.guidance.statusLine', 'Codex', 'config.toml tui.status_line')
  ], [
    { titleKey: 'capabilities.statusLine.model.claude.title', bodyKey: 'capabilities.statusLine.model.claude.body' },
    { titleKey: 'capabilities.statusLine.model.codex.title', bodyKey: 'capabilities.statusLine.model.codex.body' }
  ]),
  permissions: guide('capabilities.permissions', 'capabilities.guidance.permissions', [
    { labelKey: 'capabilities.guidance.docs.claudePermissions', url: CLAUDE_PERMISSIONS_URL },
    { labelKey: 'capabilities.guidance.docs.codexPermissions', url: CODEX_PERMISSIONS_URL },
    { labelKey: 'capabilities.guidance.docs.codexSecurity', url: CODEX_SECURITY_URL }
  ], [
    provider('capabilities.guidance.permissions', 'Claude Code', 'settings.json permissions'),
    provider('capabilities.guidance.permissions', 'Codex', 'approval / sandbox policy')
  ]),
  env: guide('capabilities.env', 'capabilities.guidance.env', [
    { labelKey: 'capabilities.guidance.docs.claudeSettings', url: CLAUDE_SETTINGS_URL },
    { labelKey: 'capabilities.guidance.docs.codexConfig', url: CODEX_CONFIG_URL }
  ], [
    provider('capabilities.guidance.env', 'Claude Code', 'settings.json env'),
    provider('capabilities.guidance.env', 'Codex', 'config.toml env policy'),
    provider('capabilities.guidance.env', 'Abstract', 'process environment')
  ])
}

export const sessionGuide: FeatureGuideDefinition = guide('sessions.index', 'sessions.guidance.index', [
  { labelKey: 'sessions.guidance.docs.claudeSettings', url: CLAUDE_SETTINGS_URL },
  { labelKey: 'sessions.guidance.docs.codexCli', url: CODEX_CLI_URL }
], [
  provider('sessions.guidance.index', 'Claude Code', 'local transcript files'),
  provider('sessions.guidance.index', 'Codex', 'local session history'),
  provider('sessions.guidance.index', 'Abstract', 'conversation timeline')
], [
  { titleKey: 'sessions.guidance.index.insights.group.title', bodyKey: 'sessions.guidance.index.insights.group.body' },
  { titleKey: 'sessions.guidance.index.insights.detail.title', bodyKey: 'sessions.guidance.index.insights.detail.body' },
  { titleKey: 'sessions.guidance.index.insights.local.title', bodyKey: 'sessions.guidance.index.insights.local.body' }
])

export const allFeatureGuides = [
  ...Object.values(instructionGuideMap),
  ...Object.values(capabilityGuideMap),
  sessionGuide
]

export function buildFeatureGuideEvidence(assets: { agentId: string; path: string }[], riskCount = 0): FeatureGuideEvidence[] {
  const sourceCount = new Set(assets.map((asset) => asset.path).filter(Boolean)).size
  const providerCount = new Set(assets.map((asset) => asset.agentId).filter(Boolean)).size

  return [
    { labelKey: 'assetGuide.evidence.assets', helpKey: 'assetGuide.evidenceHelp.assets', value: assets.length },
    { labelKey: 'assetGuide.evidence.sources', helpKey: 'assetGuide.evidenceHelp.sources', value: sourceCount },
    { labelKey: 'assetGuide.evidence.providers', helpKey: 'assetGuide.evidenceHelp.providers', value: providerCount },
    { labelKey: 'assetGuide.evidence.risks', helpKey: 'assetGuide.evidenceHelp.risks', value: riskCount, tone: riskCount > 0 ? 'warning' : 'default' }
  ]
}
