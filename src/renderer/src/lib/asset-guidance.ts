export interface AssetGuideDocLink {
  labelKey: string
  url: string
}

export interface AssetGuideDefinition {
  titleKey: string
  summaryKey: string
  pointKeys: string[]
  docLinks: AssetGuideDocLink[]
}

export type InstructionGuideId =
  | 'memories'
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
const CODEX_PERMISSIONS_URL = 'https://developers.openai.com/codex/permissions'
const CODEX_SECURITY_URL = 'https://developers.openai.com/codex/agent-approvals-security'
const MCP_INTRO_URL = 'https://modelcontextprotocol.io/docs/getting-started/intro'
const MCP_TOOLS_SPEC_URL = 'https://modelcontextprotocol.io/specification/2025-06-18/server/tools'

function guide(baseKey: string, docs: AssetGuideDocLink[]): AssetGuideDefinition {
  return {
    titleKey: `${baseKey}.title`,
    summaryKey: `${baseKey}.summary`,
    pointKeys: [`${baseKey}.points.role`, `${baseKey}.points.scope`, `${baseKey}.points.review`],
    docLinks: docs
  }
}

export const instructionGuideMap: Record<InstructionGuideId, AssetGuideDefinition> = {
  memories: guide('instructions.guidance.memories', [
    { labelKey: 'instructions.guidance.docs.claudeMemory', url: CLAUDE_MEMORY_URL },
    { labelKey: 'instructions.guidance.docs.codexAgentsMd', url: CODEX_AGENTS_MD_URL }
  ]),
  skills: guide('instructions.guidance.skills', [
    { labelKey: 'instructions.guidance.docs.claudeSkills', url: CLAUDE_SKILLS_URL },
    { labelKey: 'instructions.guidance.docs.codexConfig', url: CODEX_CONFIG_URL }
  ]),
  subagents: guide('instructions.guidance.subagents', [
    { labelKey: 'instructions.guidance.docs.claudeSubagents', url: CLAUDE_SUBAGENTS_URL },
    { labelKey: 'instructions.guidance.docs.codexConfig', url: CODEX_CONFIG_URL }
  ]),
  commands: guide('instructions.guidance.commands', [
    { labelKey: 'instructions.guidance.docs.claudeSkills', url: CLAUDE_SKILLS_URL },
    { labelKey: 'instructions.guidance.docs.codexSlashCommands', url: 'https://developers.openai.com/codex/cli/slash-commands' }
  ]),
  outputModes: guide('instructions.guidance.outputModes', [
    { labelKey: 'instructions.guidance.docs.claudeOutputStyles', url: CLAUDE_OUTPUT_STYLES_URL },
    { labelKey: 'instructions.guidance.docs.claudeSettings', url: CLAUDE_SETTINGS_URL }
  ]),
  agentTeams: guide('instructions.guidance.agentTeams', [
    { labelKey: 'instructions.guidance.docs.claudeSettings', url: CLAUDE_SETTINGS_URL },
    { labelKey: 'instructions.guidance.docs.codexConfig', url: CODEX_CONFIG_URL }
  ])
}

export const capabilityGuideMap: Record<CapabilityGuideId, AssetGuideDefinition> = {
  mcp: guide('capabilities.guidance.mcp', [
    { labelKey: 'capabilities.guidance.docs.mcpIntro', url: MCP_INTRO_URL },
    { labelKey: 'capabilities.guidance.docs.mcpTools', url: MCP_TOOLS_SPEC_URL },
    { labelKey: 'capabilities.guidance.docs.claudeMcp', url: CLAUDE_MCP_URL }
  ]),
  hooks: guide('capabilities.guidance.hooks', [
    { labelKey: 'capabilities.guidance.docs.claudeHooks', url: CLAUDE_HOOKS_URL },
    { labelKey: 'capabilities.guidance.docs.codexConfig', url: CODEX_CONFIG_URL }
  ]),
  plugins: guide('capabilities.guidance.plugins', [
    { labelKey: 'capabilities.guidance.docs.claudePlugins', url: CLAUDE_PLUGINS_URL },
    { labelKey: 'capabilities.guidance.docs.claudeSettings', url: CLAUDE_SETTINGS_URL }
  ]),
  statusLine: guide('capabilities.guidance.statusLine', [
    { labelKey: 'capabilities.guidance.docs.claudeStatusLine', url: CLAUDE_STATUSLINE_URL },
    { labelKey: 'capabilities.guidance.docs.codexConfig', url: CODEX_CONFIG_URL }
  ]),
  permissions: guide('capabilities.guidance.permissions', [
    { labelKey: 'capabilities.guidance.docs.claudePermissions', url: CLAUDE_PERMISSIONS_URL },
    { labelKey: 'capabilities.guidance.docs.codexPermissions', url: CODEX_PERMISSIONS_URL },
    { labelKey: 'capabilities.guidance.docs.codexSecurity', url: CODEX_SECURITY_URL }
  ]),
  env: guide('capabilities.guidance.env', [
    { labelKey: 'capabilities.guidance.docs.claudeSettings', url: CLAUDE_SETTINGS_URL },
    { labelKey: 'capabilities.guidance.docs.codexConfig', url: CODEX_CONFIG_URL }
  ])
}
