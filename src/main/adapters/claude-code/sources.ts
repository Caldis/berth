import * as path from 'path'
import type { Asset, AssetScope } from '@shared/types/asset'
import type { ProjectCapabilitySource } from '../_shared/project-sources'
import {
  parseAgent,
  parseCommand,
  parseEnv,
  parseHooks,
  parseMcpServers,
  parseOutputMode,
  parsePermissions,
  parseSkill,
  parseStatuslinesFromSettings
} from './parsers'

// GH-115 T9: Claude Code 项目级扫描源单一声明 (此前散布 shallow-conventions
// CAPABILITY_GLOBS / derive-asset 两张 DISPATCH / watcher 路径表, 注释自认 mirror 且已分叉)。
// 注意: adapter 自身 scanAll (claude-code/scanner.ts) 的散落调用暂不接本表 —
// 其对 settings.local.json 只跑部分 parser 的分叉如实保留, 全量统一随 engine 成包 issue。

/** settings.json / settings.local.json: 一文件五类资产 (与 derive 的 settingsCapabilities 同义)。 */
export function claudeSettingsCapabilities(filePath: string, scope: AssetScope): Asset[] {
  return [
    ...parseMcpServers(filePath, scope),
    ...parseHooks(filePath, scope),
    ...parsePermissions(filePath, scope),
    ...parseEnv(filePath, scope),
    ...parseStatuslinesFromSettings(filePath, scope)
  ]
}

const CLAUDE = (p: string): string => path.join('.claude', p)

export const CLAUDE_PROJECT_CAPABILITY_SOURCES: ProjectCapabilitySource[] = [
  { kind: 'glob', dir: CLAUDE('skills'), pattern: '**/SKILL.md', fileName: 'SKILL.md', parse: (f, s) => [parseSkill(f, s)] },
  { kind: 'glob', dir: CLAUDE('agents'), pattern: '**/*.md', ext: '.md', parse: (f, s) => [parseAgent(f, s)] },
  { kind: 'glob', dir: CLAUDE('commands'), pattern: '**/*.md', ext: '.md', parse: (f, s) => [parseCommand(f, s)] },
  { kind: 'glob', dir: CLAUDE('output-styles'), pattern: '**/*.md', ext: '.md', parse: (f, s) => [parseOutputMode(f, s)] },
  { kind: 'file', file: '.mcp.json', parse: (f, s) => parseMcpServers(f, s) },
  { kind: 'file', file: CLAUDE('settings.json'), parse: claudeSettingsCapabilities },
  { kind: 'file', file: CLAUDE('settings.local.json'), parse: claudeSettingsCapabilities }
]

/** watcher 的项目级监听目标 (目录覆盖 globs+settings; 根级文件单列)。 */
export const CLAUDE_PROJECT_WATCH_TARGETS: string[] = ['.claude', '.mcp.json', 'CLAUDE.md']
