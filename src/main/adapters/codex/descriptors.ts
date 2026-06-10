import type { AgentCapabilityPluginSourceDescriptor } from '@shared/types/agent-plugin'
import { sourceDescriptor } from '../_shared/source-descriptors'

// GH-115 T8: Codex 扫描源 descriptor 数据 — per-agent 知识归 adapter 侧。

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
