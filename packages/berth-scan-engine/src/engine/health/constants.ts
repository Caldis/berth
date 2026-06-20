// Static health check data: agent display names, documentation evidence links,
// and config key/schema constants.
// Extracted from health.ts (GH #6 health-restructure, behavior-preserving).
import type { HealthCheck, HealthCheckEvidence } from '@shared/types/ipc'

export const AGENT_NAMES: Record<HealthCheck['agentId'], string> = {
  all: 'All agents',
  'claude-code': 'Claude Code',
  codex: 'Codex'
}

export const EVIDENCE = {
  codexConfig: { label: 'Codex config reference', url: 'https://developers.openai.com/codex/config-reference' },
  codexHooks: { label: 'Codex hooks', url: 'https://developers.openai.com/codex/hooks' },
  codexSkills: { label: 'Codex skills', url: 'https://developers.openai.com/codex/skills' },
  codexSubagents: { label: 'Codex custom agents', url: 'https://developers.openai.com/codex/subagents' },
  codexAgentsMd: { label: 'Codex AGENTS.md', url: 'https://developers.openai.com/codex/guides/agents-md' },
  codexWindows: { label: 'Codex Windows and WSL homes', url: 'https://developers.openai.com/codex/app/windows#share-config-auth-and-sessions-with-wsl' },
  claudeSettings: { label: 'Claude Code settings', url: 'https://code.claude.com/docs/en/settings' },
  claudeHooks: { label: 'Claude Code hooks', url: 'https://code.claude.com/docs/en/hooks' },
  claudeMcp: { label: 'Claude Code MCP', url: 'https://code.claude.com/docs/en/mcp' },
  claudeSkills: { label: 'Claude Code skills', url: 'https://code.claude.com/docs/en/skills' },
  claudeSubagents: { label: 'Claude Code subagents', url: 'https://code.claude.com/docs/en/sub-agents' },
  claudeMemory: { label: 'Claude Code memory', url: 'https://code.claude.com/docs/en/memory' },
  claudeSessions: { label: 'Claude Code sessions', url: 'https://code.claude.com/docs/en/sessions' }
} satisfies Record<string, HealthCheckEvidence>

export const CODEX_PROJECT_IGNORED_KEYS = new Set([
  'openai_base_url',
  'chatgpt_base_url',
  'apps_mcp_product_sku',
  'model_provider',
  'model_providers',
  'notify',
  'profile',
  'profiles',
  'experimental_realtime_ws_base_url',
  'otel'
])

export const CODEX_RUNNABLE_HOOK_TYPE = 'command'
export const CLAUDE_HOOK_TYPES = new Set(['command', 'http', 'mcp_tool', 'prompt', 'agent'])
export const CODEX_CONFIG_SCHEMA_COMMENT = '#:schema https://developers.openai.com/codex/config-schema.json'
export const CLAUDE_SETTINGS_SCHEMA = 'https://json.schemastore.org/claude-code-settings.json'
