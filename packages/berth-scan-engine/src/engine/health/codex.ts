// Codex health check provider.
// Extracted from health.ts (GH #6 health-restructure, behavior-preserving).
import * as fs from 'fs'
import * as path from 'path'
import { parseCodexToml } from '../../adapters/codex/parsers'
import type { AssetScope } from '@shared/types/asset'
import type { HealthCheck } from '@shared/types/ipc'
import type { HealthPaths } from './types'
import { CODEX_CONFIG_SCHEMA_COMMENT, CODEX_PROJECT_IGNORED_KEYS, CODEX_RUNNABLE_HOOK_TYPE, EVIDENCE } from './constants'
import { asRecord, hashString, slug, stringValue } from './value-guards'
import { dirExists, fileExists, safeGlob } from './fs-utils'
import { looksWindowsSpecificCommand } from './command-heuristics'
import { collectHooks } from './hooks'
import { makeCheck } from './make-check'
import {
  checkInstructionImports,
  checkJsonConfig,
  checkMcpServers,
  checkSkillDirectories
} from './shared-checks'

export function checkCodex(paths: HealthPaths, platform: NodeJS.Platform): HealthCheck[] {
  const checks: HealthCheck[] = []
  const userConfig = path.join(paths.codexDir, 'config.toml')
  const userHooks = path.join(paths.codexDir, 'hooks.json')
  const userAgentsMd = path.join(paths.codexDir, 'AGENTS.md')

  const parsedUserConfig = checkCodexConfig(checks, userConfig, 'user', platform)
  checkCodexHooksJson(checks, userHooks, 'user', platform)
  checkCodexDuplicatedHooks(checks, parsedUserConfig, userHooks, 'user')
  checkInstructionImports(checks, 'codex', userAgentsMd, 'user', 'agents-md')
  checkCodexAgents(checks, path.join(paths.codexDir, 'agents'), 'user')
  checkSkillDirectories(checks, 'codex', path.join(paths.codexDir, 'skills'), 'user')
  checkSkillDirectories(checks, 'codex', path.join(paths.homeDir, '.agents', 'skills'), 'user')
  checkCodexSessions(checks, path.join(paths.codexDir, 'sessions'))

  if (paths.projectDir) {
    const projectConfig = path.join(paths.projectDir, '.codex', 'config.toml')
    const projectHooks = path.join(paths.projectDir, '.codex', 'hooks.json')
    const parsedProjectConfig = checkCodexConfig(checks, projectConfig, 'project', platform)
    checkCodexHooksJson(checks, projectHooks, 'project', platform)
    checkCodexDuplicatedHooks(checks, parsedProjectConfig, projectHooks, 'project')
    checkInstructionImports(checks, 'codex', path.join(paths.projectDir, 'AGENTS.md'), 'project', 'agents-md')
    checkCodexAgents(checks, path.join(paths.projectDir, '.codex', 'agents'), 'project')
    checkSkillDirectories(checks, 'codex', path.join(paths.projectDir, '.agents', 'skills'), 'project')
  }

  return checks
}

function checkCodexConfig(
  checks: HealthCheck[],
  filePath: string,
  scope: AssetScope,
  platform: NodeJS.Platform
): Record<string, unknown> | undefined {
  if (!fileExists(filePath)) return undefined
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const config = parseCodexToml(filePath)
    checkCodexConfigSchemaComment(checks, raw, scope, filePath)
    checkMcpServers(checks, 'codex', config, 'mcp_servers', scope, filePath)
    checkCodexHooks(checks, asRecord(config.hooks), scope, filePath, platform)
    checkCodexProjectIgnoredKeys(checks, config, scope, filePath)
    return config
  } catch (err) {
    checks.push(makeCheck({
      id: `codex:syntax:${scope}-config-invalid`,
      severity: 'error',
      category: 'syntax',
      agentId: 'codex',
      title: 'Invalid Codex config.toml',
      message: err instanceof Error ? err.message : 'config.toml contains invalid TOML.',
      suggestion: 'Fix the TOML syntax in Codex config.toml.',
      scope,
      path: filePath,
      assetType: 'mcp-server'
    }))
    return undefined
  }
}

function checkCodexConfigSchemaComment(
  checks: HealthCheck[],
  raw: string,
  scope: AssetScope,
  filePath: string
): void {
  if (/^#:schema\s+https:\/\/developers\.openai\.com\/codex\/config-schema\.json\s*$/m.test(raw)) return
  checks.push(makeCheck({
    id: `codex:configuration:${scope}-config-schema-comment-missing`,
    severity: 'info',
    category: 'configuration',
    agentId: 'codex',
    title: 'Codex config schema comment is not declared',
    message: 'config.toml does not include the official Codex TOML schema comment.',
    suggestion: 'Add the Codex schema comment if you want editor validation for config.toml.',
    scope,
    path: filePath,
    evidence: [EVIDENCE.codexConfig],
    fix: {
      label: 'Add Codex config schema',
      description: 'Add the official Codex TOML schema comment near the top of config.toml.',
      snippet: CODEX_CONFIG_SCHEMA_COMMENT
    },
    confidence: 'low'
  }))
}

function checkCodexHooksJson(
  checks: HealthCheck[],
  filePath: string,
  scope: AssetScope,
  platform: NodeJS.Platform
): void {
  const parsed = checkJsonConfig(
    checks,
    'codex',
    filePath,
    scope,
    'hooks',
    'Invalid Codex hooks.json',
    'Fix the JSON syntax in Codex hooks.json.'
  )
  if (!parsed) return
  checkCodexHooks(checks, asRecord(parsed.hooks) ?? parsed, scope, filePath, platform)
}

function checkCodexDuplicatedHooks(
  checks: HealthCheck[],
  config: Record<string, unknown> | undefined,
  hooksJsonPath: string,
  scope: AssetScope
): void {
  if (!config || !asRecord(config.hooks) || !fileExists(hooksJsonPath)) return
  checks.push(makeCheck({
    id: `codex:configuration:${scope}-hooks-duplicated`,
    severity: 'warning',
    category: 'configuration',
    agentId: 'codex',
    title: 'Codex hooks defined twice',
    message: 'Codex has hooks in config.toml and hooks.json at the same scope.',
    suggestion: 'Keep both only if you expect Codex to merge and warn about this layer.',
    scope,
    path: hooksJsonPath,
    assetType: 'hook'
  }))
}

function checkCodexHooks(
  checks: HealthCheck[],
  hooks: Record<string, unknown> | undefined,
  scope: AssetScope,
  filePath: string,
  platform: NodeJS.Platform
): void {
  for (const hook of collectHooks(hooks)) {
    if (hook.async) {
      checks.push(makeCheck({
        id: `codex:configuration:${scope}-hook-${slug(hook.event)}-async-skipped`,
        severity: 'info',
        category: 'configuration',
        agentId: 'codex',
        title: 'Codex async hook is skipped',
        message: 'Codex parses async hook handlers, but async command hooks are not supported yet.',
        suggestion: 'Remove async when this hook should run today.',
        scope,
        path: filePath,
        assetType: 'hook',
        confidence: 'high'
      }))
    }
    if (hook.type && hook.type !== CODEX_RUNNABLE_HOOK_TYPE) {
      checks.push(makeCheck({
        id: `codex:configuration:${scope}-hook-${slug(hook.event)}-skipped-type-${slug(hook.type)}`,
        severity: 'info',
        category: 'configuration',
        agentId: 'codex',
        title: 'Codex hook type is parsed but skipped',
        message: `Codex currently parses ${hook.type} hooks but only command hooks run.`,
        suggestion: 'Use type = "command" when this hook should run today.',
        scope,
        path: filePath,
        assetType: 'hook',
        confidence: 'high'
      }))
      continue
    }
    if (hook.type === 'command' && !hook.command) {
      checks.push(makeCheck({
        id: `codex:structure:${scope}-hook-${slug(hook.event)}-missing-command`,
        severity: 'error',
        category: 'structure',
        agentId: 'codex',
        title: 'Codex hook is missing command',
        message: `${hook.event} contains a command hook without a command.`,
        suggestion: 'Add a command value or remove the hook entry.',
        scope,
        path: filePath,
        assetType: 'hook'
      }))
    }
    if (platform === 'win32' && hook.command && !hook.commandWindows && looksWindowsSpecificCommand(hook.command)) {
      checks.push(makeCheck({
        id: `codex:configuration:${scope}-hook-windows-command`,
        severity: 'warning',
        category: 'configuration',
        agentId: 'codex',
        title: 'Codex hook has no Windows command override',
        message: 'A command hook is configured without commandWindows on Windows.',
        suggestion: 'Add commandWindows or command_windows when the command differs on Windows.',
        scope,
        path: filePath,
        assetType: 'hook',
        confidence: 'medium'
      }))
    }
    if (platform === 'win32' && hook.command && hook.commandWindows) {
      checks.push(makeCheck({
        id: `codex:configuration:${scope}-hook-${slug(hook.event)}-windows-command-override`,
        severity: 'info',
        category: 'configuration',
        agentId: 'codex',
        title: 'Codex hook uses a Windows command override',
        message: 'Codex will use commandWindows instead of command on Windows.',
        suggestion: 'Keep both commands aligned when updating this hook.',
        scope,
        path: filePath,
        assetType: 'hook',
        confidence: 'high'
      }))
    }
  }
}

function checkCodexProjectIgnoredKeys(
  checks: HealthCheck[],
  config: Record<string, unknown>,
  scope: AssetScope,
  filePath: string
): void {
  if (scope !== 'project') return
  const ignoredKeys = Object.keys(config).filter((key) => CODEX_PROJECT_IGNORED_KEYS.has(key))
  if (ignoredKeys.length === 0) return
  checks.push(makeCheck({
    id: `codex:configuration:${scope}-config-ignored-local-keys`,
    severity: 'warning',
    category: 'configuration',
    agentId: 'codex',
    title: 'Project Codex config contains ignored local keys',
    message: `Codex ignores project-level local keys: ${ignoredKeys.join(', ')}.`,
    suggestion: 'Move these keys to user config if they are intended to affect Codex.',
    scope,
    path: filePath,
    assetType: 'mcp-server',
    confidence: 'high'
  }))
}

function checkCodexAgents(checks: HealthCheck[], agentsDir: string, scope: AssetScope): void {
  for (const filePath of safeGlob('**/*.toml', agentsDir)) {
    let config: Record<string, unknown> | undefined
    try {
      config = parseCodexToml(filePath)
    } catch (err) {
      checks.push(makeCheck({
        id: `codex:syntax:${scope}-agent-${slug(path.basename(filePath, '.toml'))}`,
        severity: 'error',
        category: 'syntax',
        agentId: 'codex',
        title: 'Codex custom agent TOML is invalid',
        message: err instanceof Error ? err.message : 'Custom agent file contains invalid TOML.',
        suggestion: 'Fix the TOML syntax in the custom agent file.',
        scope,
        path: filePath,
        assetType: 'agent'
      }))
      continue
    }

    const name = stringValue(config.name) ?? path.basename(filePath, '.toml')
    if (!stringValue(config.name) || !stringValue(config.description) || !stringValue(config.developer_instructions)) {
      checks.push(makeCheck({
        id: `codex:structure:${scope}-agent-${slug(name)}`,
        severity: 'warning',
        category: 'structure',
        agentId: 'codex',
        title: 'Codex custom agent metadata is incomplete',
        message: `${name} is missing name, description, or developer_instructions.`,
        suggestion: 'Codex custom agents require name, description, and developer_instructions.',
        scope,
        path: filePath,
        assetType: 'agent'
      }))
    }
  }
}

function checkCodexSessions(checks: HealthCheck[], sessionsDir: string): void {
  if (!dirExists(sessionsDir)) return
  const files = safeGlob('**/rollout-*.jsonl', sessionsDir)
  if (files.length === 0) {
    checks.push(makeCheck({
      id: 'codex:session:user-sessions-empty',
      severity: 'info',
      category: 'session',
      agentId: 'codex',
      title: 'No Codex session transcripts found',
      message: 'Codex sessions directory exists but contains no rollout transcripts.',
      suggestion: 'Run Codex once, then refresh Berth.',
      scope: 'session',
      path: sessionsDir
    }))
    return
  }
  for (const filePath of files) {
    try {
      const stat = fs.statSync(filePath)
      if (stat.size === 0) {
        checks.push(makeCheck({
          id: `codex:session:empty-transcript-${hashString(filePath)}`,
          severity: 'warning',
          category: 'session',
          agentId: 'codex',
          title: 'Codex transcript is empty',
          message: `${path.basename(filePath)} has no content.`,
          suggestion: 'Refresh after Codex finishes writing the transcript.',
          scope: 'session',
          path: filePath,
          assetType: 'session'
        }))
      }
    } catch (err) {
      checks.push(makeCheck({
        id: `codex:session:unreadable-transcript-${hashString(filePath)}`,
        severity: 'error',
        category: 'session',
        agentId: 'codex',
        title: 'Codex transcript is unreadable',
        message: err instanceof Error ? err.message : 'Unable to read Codex transcript.',
        suggestion: 'Check file permissions and try again.',
        scope: 'session',
        path: filePath,
        assetType: 'session'
      }))
    }
  }
}
