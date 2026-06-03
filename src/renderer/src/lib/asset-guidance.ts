export interface AssetGuideDocLink {
  labelKey: string
  url: string
}

export interface AssetGuideProviderMapping {
  provider: string
  config: string
  meaningKey: string
  docUrl?: string
}

export interface AssetGuideDefinition {
  titleKey: string
  summaryKey: string
  pointKeys: string[]
  docLinks: AssetGuideDocLink[]
  providerMappings: AssetGuideProviderMapping[]
}

export interface AssetGuideEvidence {
  labelKey: string
  value: number | string
  tone?: 'default' | 'warning'
}

export type InstructionGuideId =
  | 'conventions'
  | 'skills'
  | 'subagents'
  | 'commands'
  | 'outputModes'

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
const MCP_INTRO_URL = 'https://modelcontextprotocol.io/docs/getting-started/intro'
const MCP_TOOLS_SPEC_URL = 'https://modelcontextprotocol.io/specification/2025-06-18/server/tools'

function guide(baseKey: string, docs: AssetGuideDocLink[], providerMappings: AssetGuideProviderMapping[]): AssetGuideDefinition {
  return {
    titleKey: `${baseKey}.title`,
    summaryKey: `${baseKey}.summary`,
    pointKeys: [`${baseKey}.points.role`, `${baseKey}.points.scope`, `${baseKey}.points.review`],
    docLinks: docs,
    providerMappings
  }
}

function provider(baseKey: string, providerName: string, config: string, docUrl?: string): AssetGuideProviderMapping {
  return {
    provider: providerName,
    config,
    meaningKey: `${baseKey}.providers.${providerName === 'Claude Code' ? 'claude' : providerName === 'Codex' ? 'codex' : 'abstract'}`,
    docUrl
  }
}

export const instructionGuideMap: Record<InstructionGuideId, AssetGuideDefinition> = {
  // The existing `guidance.memories` copy ("durable instructions the agent loads
  // as context") describes CLAUDE.md / AGENTS.md, so it now backs the Conventions
  // tab. The Memories tab renders MemoryView and shows no guide panel.
  conventions: guide('instructions.guidance.memories', [
    { labelKey: 'instructions.guidance.docs.claudeMemory', url: CLAUDE_MEMORY_URL },
    { labelKey: 'instructions.guidance.docs.codexAgentsMd', url: CODEX_AGENTS_MD_URL }
  ], [
    provider('instructions.guidance.memories', 'Claude Code', 'CLAUDE.md', CLAUDE_MEMORY_URL),
    provider('instructions.guidance.memories', 'Codex', 'AGENTS.md', CODEX_AGENTS_MD_URL)
  ]),
  skills: guide('instructions.guidance.skills', [
    { labelKey: 'instructions.guidance.docs.claudeSkills', url: CLAUDE_SKILLS_URL },
    { labelKey: 'instructions.guidance.docs.codexSkills', url: CODEX_SKILLS_URL }
  ], [
    provider('instructions.guidance.skills', 'Claude Code', 'SKILL.md', CLAUDE_SKILLS_URL),
    provider('instructions.guidance.skills', 'Codex', 'skills directory', CODEX_SKILLS_URL)
  ]),
  subagents: guide('instructions.guidance.subagents', [
    { labelKey: 'instructions.guidance.docs.claudeSubagents', url: CLAUDE_SUBAGENTS_URL },
    { labelKey: 'instructions.guidance.docs.codexSubagents', url: CODEX_SUBAGENTS_URL }
  ], [
    provider('instructions.guidance.subagents', 'Claude Code', '.claude/agents/*.md', CLAUDE_SUBAGENTS_URL),
    provider('instructions.guidance.subagents', 'Codex', 'subagents config', CODEX_SUBAGENTS_URL)
  ]),
  commands: guide('instructions.guidance.commands', [
    { labelKey: 'instructions.guidance.docs.claudeSkills', url: CLAUDE_SKILLS_URL },
    { labelKey: 'instructions.guidance.docs.codexSlashCommands', url: 'https://developers.openai.com/codex/cli/slash-commands' }
  ], [
    provider('instructions.guidance.commands', 'Claude Code', '.claude/commands or skills', CLAUDE_SKILLS_URL),
    provider('instructions.guidance.commands', 'Codex', 'slash commands', 'https://developers.openai.com/codex/cli/slash-commands')
  ]),
  outputModes: guide('instructions.guidance.outputModes', [
    { labelKey: 'instructions.guidance.docs.claudeOutputStyles', url: CLAUDE_OUTPUT_STYLES_URL },
    { labelKey: 'instructions.guidance.docs.claudeSettings', url: CLAUDE_SETTINGS_URL }
  ], [
    provider('instructions.guidance.outputModes', 'Claude Code', 'output styles', CLAUDE_OUTPUT_STYLES_URL),
    provider('instructions.guidance.outputModes', 'Abstract', 'response style policy')
  ])
}

export const capabilityGuideMap: Record<CapabilityGuideId, AssetGuideDefinition> = {
  mcp: guide('capabilities.guidance.mcp', [
    { labelKey: 'capabilities.guidance.docs.mcpIntro', url: MCP_INTRO_URL },
    { labelKey: 'capabilities.guidance.docs.mcpTools', url: MCP_TOOLS_SPEC_URL },
    { labelKey: 'capabilities.guidance.docs.claudeMcp', url: CLAUDE_MCP_URL },
    { labelKey: 'capabilities.guidance.docs.codexMcp', url: CODEX_MCP_URL }
  ], [
    provider('capabilities.guidance.mcp', 'Claude Code', 'mcpServers / .mcp.json', CLAUDE_MCP_URL),
    provider('capabilities.guidance.mcp', 'Codex', 'config.toml mcp_servers', CODEX_MCP_URL),
    provider('capabilities.guidance.mcp', 'Abstract', 'MCP tools/resources')
  ]),
  hooks: guide('capabilities.guidance.hooks', [
    { labelKey: 'capabilities.guidance.docs.claudeHooks', url: CLAUDE_HOOKS_URL },
    { labelKey: 'capabilities.guidance.docs.codexHooks', url: CODEX_HOOKS_URL }
  ], [
    provider('capabilities.guidance.hooks', 'Claude Code', 'settings.json hooks', CLAUDE_HOOKS_URL),
    provider('capabilities.guidance.hooks', 'Codex', 'config.toml hooks', CODEX_HOOKS_URL)
  ]),
  plugins: guide('capabilities.guidance.plugins', [
    { labelKey: 'capabilities.guidance.docs.claudePlugins', url: CLAUDE_PLUGINS_URL },
    { labelKey: 'capabilities.guidance.docs.claudeSettings', url: CLAUDE_SETTINGS_URL }
  ], [
    provider('capabilities.guidance.plugins', 'Claude Code', '.claude-plugin/plugin.json', CLAUDE_PLUGINS_URL),
    provider('capabilities.guidance.plugins', 'Abstract', 'capability bundle')
  ]),
  statusLine: guide('capabilities.guidance.statusLine', [
    { labelKey: 'capabilities.guidance.docs.claudeStatusLine', url: CLAUDE_STATUSLINE_URL },
    { labelKey: 'capabilities.guidance.docs.codexConfig', url: CODEX_CONFIG_URL }
  ], [
    provider('capabilities.guidance.statusLine', 'Claude Code', 'settings.json statusLine', CLAUDE_STATUSLINE_URL),
    provider('capabilities.guidance.statusLine', 'Codex', 'config.toml tui.status_line', CODEX_CONFIG_URL)
  ]),
  permissions: guide('capabilities.guidance.permissions', [
    { labelKey: 'capabilities.guidance.docs.claudePermissions', url: CLAUDE_PERMISSIONS_URL },
    { labelKey: 'capabilities.guidance.docs.codexPermissions', url: CODEX_PERMISSIONS_URL },
    { labelKey: 'capabilities.guidance.docs.codexSecurity', url: CODEX_SECURITY_URL }
  ], [
    provider('capabilities.guidance.permissions', 'Claude Code', 'settings.json permissions', CLAUDE_PERMISSIONS_URL),
    provider('capabilities.guidance.permissions', 'Codex', 'approval / sandbox policy', CODEX_PERMISSIONS_URL)
  ]),
  env: guide('capabilities.guidance.env', [
    { labelKey: 'capabilities.guidance.docs.claudeSettings', url: CLAUDE_SETTINGS_URL },
    { labelKey: 'capabilities.guidance.docs.codexConfig', url: CODEX_CONFIG_URL }
  ], [
    provider('capabilities.guidance.env', 'Claude Code', 'settings.json env', CLAUDE_SETTINGS_URL),
    provider('capabilities.guidance.env', 'Codex', 'config.toml env policy', CODEX_CONFIG_URL),
    provider('capabilities.guidance.env', 'Abstract', 'process environment')
  ])
}

export const allAssetGuides = [
  ...Object.values(instructionGuideMap),
  ...Object.values(capabilityGuideMap)
]

export function buildAssetGuideEvidence(assets: { agentId: string; path: string }[], riskCount = 0): AssetGuideEvidence[] {
  const sourceCount = new Set(assets.map((asset) => asset.path).filter(Boolean)).size
  const providerCount = new Set(assets.map((asset) => asset.agentId).filter(Boolean)).size

  return [
    { labelKey: 'assetGuide.evidence.assets', value: assets.length },
    { labelKey: 'assetGuide.evidence.sources', value: sourceCount },
    { labelKey: 'assetGuide.evidence.providers', value: providerCount },
    { labelKey: 'assetGuide.evidence.risks', value: riskCount, tone: riskCount > 0 ? 'warning' : 'default' }
  ]
}
