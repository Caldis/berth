// GH-138: 渲染层 agent 显示名单一真源 (agentId → 人类可读名)。
// 背景: berth 经 adapter-registry 实际扫描 8 个 agent (claude-code/codex/cursor/gemini-cli/
// github-copilot-cli/opencode/openclaw/hermes-agent), 但各处标签逻辑只认 claude/codex —
// session-row 曾把所有非 codex 一律标 "Claude" (误标 Cursor/Gemini 等), activity-insights 显原 id。
// 此处集中映射 (镜像引擎各 adapter 的 displayName, 避免跨包导入引擎内部), 未知 id 回退 Title Case。

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  'claude-code': 'Claude Code',
  claude: 'Claude Code',
  codex: 'Codex',
  cursor: 'Cursor',
  'gemini-cli': 'Gemini CLI',
  'github-copilot-cli': 'GitHub Copilot CLI',
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
  'hermes-agent': 'Hermes Agent'
}

/** agentId → 显示名; 未知 id 回退为 Title Case (kebab/snake 分词), 不再误标到某个已知 agent。 */
export function agentDisplayName(agentId: string): string {
  const known = AGENT_DISPLAY_NAMES[agentId]
  if (known) return known
  const titled = agentId
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  return titled || agentId
}
