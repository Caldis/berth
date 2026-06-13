import type { Asset, AssetScope } from '@shared/types/asset'
import type { ProjectCapabilitySource } from '../adapters/_shared/project-sources'
import {
  CLAUDE_PROJECT_CAPABILITY_SOURCES,
  CLAUDE_PROJECT_WATCH_TARGETS,
  claudeSettingsCapabilities
} from '../adapters/claude-code/sources'
import { parseAgentsMd, parseClaudeMd, parseMcpServers } from '../adapters/claude-code/parsers'
import {
  CODEX_PROJECT_CAPABILITY_SOURCES,
  CODEX_PROJECT_WATCH_TARGETS
} from '../adapters/codex/sources'
import { parseCodexAgentsMd } from '../adapters/codex/parsers'

// GH-115 T9: engine 消费 per-agent 知识的单一漏斗 (01-ANALYSIS R1 的 capability map
// 最小形)。shallow-conventions / derive-asset / watcher 一律从这里取项目级扫描源,
// 不再直连各 adapter 的 parser 自建 mirror 表。接入第 N 个 agent: 新建其
// adapters/<agent>/sources.ts 后在本文件登记一行。
// engine→adapters 的直连面从 5 文件收敛到本文件 (规则: 存量直连只减不增)。

export type ProjectConventionParser = (filePath: string, scope: AssetScope) => Asset
export type EnterpriseCapabilityParser = (filePath: string) => Asset[]

export interface ShallowConventionSource {
  file: string
  parse: ProjectConventionParser
  sharedReaderAgentIds?: string[]
}

const SHARED_AGENT_READERS = ['claude-code', 'codex']

const PROJECT_CONVENTION_DERIVERS: Readonly<Record<string, readonly ProjectConventionParser[]>> = {
  'CLAUDE.md': [parseClaudeMd],
  'CLAUDE.local.md': [parseClaudeMd],
  'AGENTS.md': [parseAgentsMd, parseCodexAgentsMd]
}

const SHALLOW_CONVENTION_SOURCES: readonly ShallowConventionSource[] = [
  { file: 'AGENTS.md', parse: parseAgentsMd, sharedReaderAgentIds: SHARED_AGENT_READERS },
  { file: '.claude/AGENTS.md', parse: parseAgentsMd, sharedReaderAgentIds: SHARED_AGENT_READERS },
  { file: 'CLAUDE.md', parse: parseClaudeMd },
  { file: 'CLAUDE.local.md', parse: parseClaudeMd },
  { file: '.claude/CLAUDE.md', parse: parseClaudeMd }
]

const ENTERPRISE_CAPABILITY_DERIVERS: Readonly<Record<string, EnterpriseCapabilityParser>> = {
  'managed-settings.json': (filePath) => claudeSettingsCapabilities(filePath, 'enterprise'),
  'managed-mcp.json': (filePath) => parseMcpServers(filePath, 'enterprise')
}

export function projectConventionDerivers(): Readonly<Record<string, readonly ProjectConventionParser[]>> {
  return PROJECT_CONVENTION_DERIVERS
}

export function shallowConventionSources(): readonly ShallowConventionSource[] {
  return SHALLOW_CONVENTION_SOURCES
}

export function enterpriseCapabilityDerivers(): Readonly<Record<string, EnterpriseCapabilityParser>> {
  return ENTERPRISE_CAPABILITY_DERIVERS
}

export function projectCapabilitySources(): ProjectCapabilitySource[] {
  return [...CLAUDE_PROJECT_CAPABILITY_SOURCES, ...CODEX_PROJECT_CAPABILITY_SOURCES]
}

export function projectWatchTargets(): string[] {
  return [...CLAUDE_PROJECT_WATCH_TARGETS, ...CODEX_PROJECT_WATCH_TARGETS]
}

export type { ProjectCapabilitySource }
