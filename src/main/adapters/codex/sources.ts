import * as path from 'path'
import type { ProjectCapabilitySource } from '../_shared/project-sources'
import { parseCodexConfig, parseCodexCustomAgent, parseCodexHooksJson, parseCodexSkill } from './parsers'

// GH-115 T9: Codex 项目级扫描源单一声明 (见 claude-code/sources.ts 同款说明)。

export const CODEX_PROJECT_CAPABILITY_SOURCES: ProjectCapabilitySource[] = [
  { kind: 'glob', dir: path.join('.agents', 'skills'), pattern: '**/SKILL.md', fileName: 'SKILL.md', parse: (f, s) => [parseCodexSkill(f, s)] },
  { kind: 'glob', dir: path.join('.codex', 'agents'), pattern: '**/*.toml', ext: '.toml', parse: (f, s) => [parseCodexCustomAgent(f, s)] },
  { kind: 'file', file: path.join('.codex', 'config.toml'), parse: (f, s) => parseCodexConfig(f, s) },
  { kind: 'file', file: path.join('.codex', 'hooks.json'), parse: (f, s) => parseCodexHooksJson(f, s) }
]

export const CODEX_PROJECT_WATCH_TARGETS: string[] = ['.codex', path.join('.agents', 'skills'), 'AGENTS.md']
