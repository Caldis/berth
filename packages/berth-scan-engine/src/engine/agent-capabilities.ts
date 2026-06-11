import type { ProjectCapabilitySource } from '../adapters/_shared/project-sources'
import {
  CLAUDE_PROJECT_CAPABILITY_SOURCES,
  CLAUDE_PROJECT_WATCH_TARGETS
} from '../adapters/claude-code/sources'
import {
  CODEX_PROJECT_CAPABILITY_SOURCES,
  CODEX_PROJECT_WATCH_TARGETS
} from '../adapters/codex/sources'

// GH-115 T9: engine 消费 per-agent 知识的单一漏斗 (01-ANALYSIS R1 的 capability map
// 最小形)。shallow-conventions / derive-asset / watcher 一律从这里取项目级扫描源,
// 不再直连各 adapter 的 parser 自建 mirror 表。接入第 N 个 agent: 新建其
// adapters/<agent>/sources.ts 后在本文件登记一行。
// engine→adapters 的直连面从 5 文件收敛到本文件 (规则: 存量直连只减不增)。

export function projectCapabilitySources(): ProjectCapabilitySource[] {
  return [...CLAUDE_PROJECT_CAPABILITY_SOURCES, ...CODEX_PROJECT_CAPABILITY_SOURCES]
}

export function projectWatchTargets(): string[] {
  return [...CLAUDE_PROJECT_WATCH_TARGETS, ...CODEX_PROJECT_WATCH_TARGETS]
}

export type { ProjectCapabilitySource }
