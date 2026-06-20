import * as fs from 'fs'
import { extractAtImports } from '@shared/object-guards'
import * as os from 'os'
import * as path from 'path'
import { parseCodexToml } from '../adapters/codex/parsers'
import { resolveClaudeDirs, resolveCodexHomeDirs } from '../agent-homes'
import { asRecord, booleanValue, hashString, slug, stringValue } from './health/value-guards'
import { dirExists, fileExists, safeGlob, safeReadDir, safeReadText } from './health/fs-utils'
import { looksPowerShellCommand, looksWindowsSpecificCommand } from './health/command-heuristics'
import { readMarkdownFrontmatter } from './health/markdown'
import type { HealthCheckInput, HealthPaths } from './health/types'
import {
  AGENT_NAMES,
  CLAUDE_HOOK_TYPES,
  CLAUDE_SETTINGS_SCHEMA,
  CODEX_CONFIG_SCHEMA_COMMENT,
  CODEX_PROJECT_IGNORED_KEYS,
  CODEX_RUNNABLE_HOOK_TYPE,
  EVIDENCE
} from './health/constants'
import type { Asset, AssetScope } from '@shared/types/asset'
import { samePath } from '@shared/path-utils'
import type {
  HealthCheck,
  HealthCheckConfidence,
  HealthCheckEvidence,
  HealthCheckTarget,
  ScanError
} from '@shared/types/ipc'

export interface HealthCheckOptions {
  homeDir?: string
  projectDir?: string
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
  assets?: Asset[]
  scanErrors?: ScanError[]
}

export function runHealthChecks(options: HealthCheckOptions | string = {}): HealthCheck[] {
  const normalized = normalizeOptions(options)
  const paths = buildHealthPaths(normalized)
  const checks: HealthCheck[] = []
  const hasClaude = hasClaudeData(paths)
  const hasCodex = hasCodexData(paths)

  if (!hasClaude && !hasCodex) {
    checks.push(makeCheck({
      id: 'all:source:no-agent-data',
      severity: 'warning',
      category: 'source',
      agentId: 'all',
      title: 'No supported agent data found',
      message: 'Berth scans Claude Code and Codex local data when present.',
      suggestion: 'Install or run Claude Code or Codex once, then refresh Berth.'
    }))
    return checks
  }

  if (hasClaude) checks.push(...checkClaude(paths, normalized.platform))
  if (hasCodex) checks.push(...checkCodex(paths, normalized.platform))
  if (paths.projectDir) checkProjectInstructionCompatibility(checks, paths.projectDir)
  checks.push(...checksFromScanErrors(normalized.scanErrors ?? []))
  checks.push(...checksFromSessionAssets(normalized.assets ?? []))

  return dedupeChecks(checks)
}

function checkClaude(paths: HealthPaths, platform: NodeJS.Platform): HealthCheck[] {
  const checks: HealthCheck[] = []
  const claudeMd = path.join(paths.claudeDir, 'CLAUDE.md')

  if (dirExists(paths.claudeDir) && !fileExists(claudeMd)) {
    checks.push(makeCheck({
      id: 'claude-code:source:user-claude-md-missing',
      severity: 'info',
      category: 'source',
      agentId: 'claude-code',
      title: 'User CLAUDE.md not found',
      message: 'No user-level CLAUDE.md found.',
      suggestion: 'Create ~/.claude/CLAUDE.md if you want shared Claude Code instructions.',
      scope: 'user',
      path: claudeMd
    }))
  }

  const userSettings = checkJsonConfig(
    checks,
    'claude-code',
    path.join(paths.claudeDir, 'settings.json'),
    'user',
    'settings',
    'Invalid settings.json',
    'Fix the JSON syntax in ~/.claude/settings.json.'
  )
  if (userSettings) {
    const userSettingsPath = path.join(paths.claudeDir, 'settings.json')
    checkClaudeSettingsSchema(checks, userSettings, 'user', userSettingsPath)
    checkClaudeSettings(checks, userSettings, 'user', userSettingsPath, platform)
  }

  const claudeJson = checkJsonConfig(
    checks,
    'claude-code',
    path.join(paths.homeDir, '.claude.json'),
    'user',
    'claude-json',
    'Invalid .claude.json',
    'Fix the JSON syntax in ~/.claude.json.'
  )
  if (claudeJson) checkMcpServers(checks, 'claude-code', claudeJson, 'mcpServers', 'user', path.join(paths.homeDir, '.claude.json'))

  if (paths.projectDir) {
    const projectSettings = path.join(paths.projectDir, '.claude', 'settings.json')
    const projectLocalSettings = path.join(paths.projectDir, '.claude', 'settings.local.json')
    const mcpJson = path.join(paths.projectDir, '.mcp.json')
    const parsedProjectSettings = checkJsonConfig(
      checks,
      'claude-code',
      projectSettings,
      'project',
      'settings',
      'Invalid project settings.json',
      'Fix the JSON syntax in .claude/settings.json.'
    )
    if (parsedProjectSettings) {
      checkClaudeSettingsSchema(checks, parsedProjectSettings, 'project', projectSettings)
      checkClaudeSettings(checks, parsedProjectSettings, 'project', projectSettings, platform)
    }

    const parsedLocalSettings = checkJsonConfig(
      checks,
      'claude-code',
      projectLocalSettings,
      'project',
      'settings-local',
      'Invalid settings.local.json',
      'Fix the JSON syntax in .claude/settings.local.json.'
    )
    if (parsedLocalSettings) checkClaudeSettings(checks, parsedLocalSettings, 'project', projectLocalSettings, platform)

    const parsedMcp = checkJsonConfig(
      checks,
      'claude-code',
      mcpJson,
      'project',
      'mcp',
      'Invalid .mcp.json',
      'Fix the JSON syntax in project .mcp.json.'
    )
    if (parsedMcp) checkMcpServers(checks, 'claude-code', parsedMcp, 'mcpServers', 'project', mcpJson)
  }

  checkInstructionImports(checks, 'claude-code', claudeMd, 'user', 'claude-md')
  checkInstructionImports(checks, 'claude-code', path.join(paths.claudeDir, 'AGENTS.md'), 'user', 'agents-md')
  if (paths.projectDir) {
    checkInstructionImports(checks, 'claude-code', path.join(paths.projectDir, 'CLAUDE.md'), 'project', 'claude-md')
    checkInstructionImports(checks, 'claude-code', path.join(paths.projectDir, '.claude', 'CLAUDE.md'), 'project', 'claude-md')
    checkInstructionImports(checks, 'claude-code', path.join(paths.projectDir, 'AGENTS.md'), 'project', 'agents-md')
    checkClaudeProjectAgentsImport(checks, paths.projectDir)
  }

  checkSkillDirectories(checks, 'claude-code', path.join(paths.claudeDir, 'skills'), 'user')
  checkClaudeAgents(checks, path.join(paths.claudeDir, 'agents'), 'user')
  if (paths.projectDir) {
    checkSkillDirectories(checks, 'claude-code', path.join(paths.projectDir, '.claude', 'skills'), 'project')
    checkClaudeAgents(checks, path.join(paths.projectDir, '.claude', 'agents'), 'project')
  }

  checkClaudeSessions(checks, path.join(paths.claudeDir, 'projects'))
  return checks
}

function checkCodex(paths: HealthPaths, platform: NodeJS.Platform): HealthCheck[] {
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

function checkClaudeSettings(
  checks: HealthCheck[],
  settings: Record<string, unknown>,
  scope: AssetScope,
  filePath: string,
  platform: NodeJS.Platform
): void {
  checkClaudeHooks(checks, asRecord(settings.hooks), scope, filePath, platform)
  checkClaudePermissions(checks, settings, scope, filePath)
  checkMcpServers(checks, 'claude-code', settings, 'mcpServers', scope, filePath)
}

function checkClaudeSettingsSchema(
  checks: HealthCheck[],
  settings: Record<string, unknown>,
  scope: AssetScope,
  filePath: string
): void {
  if (stringValue(settings.$schema)) return
  checks.push(makeCheck({
    id: `claude-code:configuration:${scope}-settings-schema-missing`,
    severity: 'info',
    category: 'configuration',
    agentId: 'claude-code',
    title: 'Claude settings schema is not declared',
    message: `${path.basename(filePath)} does not declare the Claude Code settings JSON schema.`,
    suggestion: 'Add $schema if you want editor validation for Claude Code settings.',
    scope,
    path: filePath,
    evidence: [EVIDENCE.claudeSettings],
    fix: {
      label: 'Add Claude settings schema',
      description: 'Add the official Claude Code settings schema near the top of the JSON file.',
      snippet: `{\n  "$schema": "${CLAUDE_SETTINGS_SCHEMA}"\n}`
    },
    confidence: 'low'
  }))
}

function checkClaudeHooks(
  checks: HealthCheck[],
  hooks: Record<string, unknown> | undefined,
  scope: AssetScope,
  filePath: string,
  platform: NodeJS.Platform
): void {
  for (const hook of collectHooks(hooks)) {
    if (hook.type === 'command' && !hook.command) {
      checks.push(makeCheck({
        id: `claude-code:structure:${scope}-hook-${slug(hook.event)}-missing-command`,
        severity: 'error',
        category: 'structure',
        agentId: 'claude-code',
        title: 'Claude Code hook is missing command',
        message: `${hook.event} contains a command hook without a command.`,
        suggestion: 'Add a command value or remove the hook entry.',
        scope,
        path: filePath,
        assetType: 'hook'
      }))
    }
    if (hook.type === 'http' && !hook.url) {
      checks.push(makeCheck({
        id: `claude-code:structure:${scope}-hook-${slug(hook.event)}-http-missing-url`,
        severity: 'error',
        category: 'structure',
        agentId: 'claude-code',
        title: 'Claude HTTP hook is missing url',
        message: `${hook.event} contains an http hook without a url.`,
        suggestion: 'Add a url value or remove the hook entry.',
        scope,
        path: filePath,
        assetType: 'hook'
      }))
    }
    if (hook.type === 'mcp_tool') {
      const missingFields = [
        hook.server ? '' : 'server',
        hook.tool ? '' : 'tool'
      ].filter(Boolean)
      for (const field of missingFields) {
        checks.push(makeCheck({
          id: `claude-code:structure:${scope}-hook-${slug(hook.event)}-mcp-tool-missing-${field}`,
          severity: 'error',
          category: 'structure',
          agentId: 'claude-code',
          title: 'Claude MCP tool hook is incomplete',
          message: `${hook.event} contains an mcp_tool hook without ${field}.`,
          suggestion: 'Add both server and tool values, or remove the hook entry.',
          scope,
          path: filePath,
          assetType: 'hook'
        }))
      }
    }
    if ((hook.type === 'prompt' || hook.type === 'agent') && !hook.prompt) {
      checks.push(makeCheck({
        id: `claude-code:structure:${scope}-hook-${slug(hook.event)}-${hook.type}-missing-prompt`,
        severity: 'error',
        category: 'structure',
        agentId: 'claude-code',
        title: 'Claude prompt hook is missing prompt',
        message: `${hook.event} contains a ${hook.type} hook without a prompt.`,
        suggestion: 'Add a prompt value or remove the hook entry.',
        scope,
        path: filePath,
        assetType: 'hook'
      }))
    }
    if (hook.type && !CLAUDE_HOOK_TYPES.has(hook.type)) {
      checks.push(makeCheck({
        id: `claude-code:structure:${scope}-hook-${slug(hook.event)}-unknown-type-${slug(hook.type)}`,
        severity: 'warning',
        category: 'structure',
        agentId: 'claude-code',
        title: 'Claude hook type is not documented',
        message: `${hook.event} uses hook type "${hook.type}".`,
        suggestion: 'Use a documented hook type, such as command, http, mcp_tool, prompt, or agent.',
        scope,
        path: filePath,
        assetType: 'hook',
        confidence: 'high'
      }))
    }
    if (hook.args.length > 0 && hook.shell) {
      checks.push(makeCheck({
        id: `claude-code:configuration:${scope}-hook-shell-ignored-with-args`,
        severity: 'info',
        category: 'configuration',
        agentId: 'claude-code',
        title: 'Claude hook shell is ignored when args are set',
        message: 'A command hook defines args and shell; Claude Code ignores shell in this shape.',
        suggestion: 'Remove shell or move the full command into command when shell selection matters.',
        scope,
        path: filePath,
        assetType: 'hook',
        confidence: 'high'
      }))
    }
    if (platform === 'win32' && hook.command && hook.shell !== 'powershell' && looksPowerShellCommand(hook.command)) {
      checks.push(makeCheck({
        id: `claude-code:configuration:${scope}-hook-windows-shell`,
        severity: 'warning',
        category: 'configuration',
        agentId: 'claude-code',
        title: 'Claude hook has no Windows shell hint',
        message: 'A command hook is configured without shell: powershell on Windows.',
        suggestion: 'Set "shell": "powershell" when the hook command is written for PowerShell.',
        scope,
        path: filePath,
        assetType: 'hook',
        confidence: 'medium'
      }))
    }
  }
}

function checkClaudePermissions(
  checks: HealthCheck[],
  settings: Record<string, unknown>,
  scope: AssetScope,
  filePath: string
): void {
  if (settings.permissionMode === 'bypassPermissions') {
    checks.push(makeCheck({
      id: `claude-code:configuration:${scope}-permission-bypass`,
      severity: 'warning',
      category: 'configuration',
      agentId: 'claude-code',
      title: 'Claude Code bypass permissions enabled',
      message: 'permissionMode is set to bypassPermissions.',
      suggestion: 'Use this only for trusted local workflows.',
      scope,
      path: filePath,
      assetType: 'permission'
    }))
  }

  const permissions = asRecord(settings.permissions)
  const allow = Array.isArray(permissions?.allow) ? permissions.allow : []
  if (allow.some((rule) => typeof rule === 'string' && /Bash\(\s*\*\s*\)/.test(rule))) {
    checks.push(makeCheck({
      id: `claude-code:configuration:${scope}-permission-broad-bash`,
      severity: 'warning',
      category: 'configuration',
      agentId: 'claude-code',
      title: 'Broad Bash permission rule',
      message: 'permissions.allow contains Bash(*).',
      suggestion: 'Prefer narrower command allow rules.',
      scope,
      path: filePath,
      assetType: 'permission'
    }))
  }
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

function checkMcpServers(
  checks: HealthCheck[],
  agentId: 'claude-code' | 'codex',
  config: Record<string, unknown>,
  key: 'mcpServers' | 'mcp_servers',
  scope: AssetScope,
  filePath: string
): void {
  const servers = asRecord(config[key])
  if (!servers) return
  for (const [name, serverConfig] of Object.entries(servers)) {
    const record = asRecord(serverConfig)
    if (!record) {
      checks.push(makeCheck({
        id: `${agentId}:structure:${scope}-mcp-${slug(name)}-invalid`,
        severity: 'error',
        category: 'structure',
        agentId,
        title: 'MCP server config is invalid',
        message: `${name} is not an object.`,
        suggestion: 'Replace the MCP server entry with an object config.',
        scope,
        path: filePath,
        assetType: 'mcp-server'
      }))
      continue
    }
    const hasTransport =
      typeof record.command === 'string' ||
      typeof record.url === 'string' ||
      typeof record.type === 'string' ||
      typeof record.transport === 'string'
    if (!hasTransport) {
      checks.push(makeCheck({
        id: `${agentId}:structure:${scope}-mcp-${slug(name)}-missing-transport`,
        severity: 'warning',
        category: 'structure',
        agentId,
        title: 'MCP server has no transport',
        message: `${name} has no command, url, type, or transport field.`,
        suggestion: 'Add the transport field required by the agent configuration.',
        scope,
        path: filePath,
        assetType: 'mcp-server'
      }))
    }
  }
}

function checkInstructionImports(
  checks: HealthCheck[],
  agentId: 'claude-code' | 'codex',
  filePath: string,
  scope: AssetScope,
  fileType: 'claude-md' | 'agents-md'
): void {
  if (!fileExists(filePath)) return
  let raw = ''
  try {
    raw = fs.readFileSync(filePath, 'utf-8')
  } catch (err) {
    checks.push(makeCheck({
      id: `${agentId}:source:${scope}-${fileType}-unreadable-${hashString(filePath)}`,
      severity: 'error',
      category: 'source',
      agentId,
      title: 'Instruction file is unreadable',
      message: err instanceof Error ? err.message : 'Unable to read instruction file.',
      suggestion: 'Check file permissions and try again.',
      scope,
      path: filePath,
      assetType: fileType
    }))
    return
  }

  for (const importPath of extractAtImports(raw)) {
    const resolved = path.isAbsolute(importPath)
      ? importPath
      : path.resolve(path.dirname(filePath), importPath)
    if (fileExists(resolved)) continue
    checks.push(makeCheck({
      id: `${agentId}:reference:${scope}-${fileType}-missing-import-${hashString(resolved)}`,
      severity: 'warning',
      category: 'reference',
      agentId,
      title: 'Instruction import is missing',
      message: `${importPath} referenced by ${path.basename(filePath)} does not exist.`,
      suggestion: 'Create the imported file or remove the @path reference.',
      scope,
      path: filePath,
      assetType: fileType
    }))
  }
}

function checkClaudeProjectAgentsImport(checks: HealthCheck[], projectDir: string): void {
  const agentsMd = path.join(projectDir, 'AGENTS.md')
  if (!fileExists(agentsMd)) return

  const claudeFiles = [
    path.join(projectDir, 'CLAUDE.md'),
    path.join(projectDir, '.claude', 'CLAUDE.md')
  ].filter(fileExists)
  if (claudeFiles.length === 0) return

  for (const filePath of claudeFiles) {
    const raw = safeReadText(filePath)
    if (!raw) continue
    const importsAgentsMd = extractAtImports(raw).some((importPath) => {
      const resolved = path.isAbsolute(importPath)
        ? importPath
        : path.resolve(path.dirname(filePath), importPath)
      return samePath(resolved, agentsMd)
    })
    if (importsAgentsMd) return
  }

  checks.push(makeCheck({
    id: 'claude-code:reference:project-agents-md-not-imported',
    severity: 'info',
    category: 'reference',
    agentId: 'claude-code',
    title: 'Project CLAUDE.md does not import AGENTS.md',
    message: 'This project has AGENTS.md, but Claude Code reads CLAUDE.md and only imports files referenced from it.',
    suggestion: 'Add @AGENTS.md to project CLAUDE.md if those shared instructions should apply to Claude Code.',
    scope: 'project',
    path: claudeFiles[0],
    assetType: 'claude-md',
    evidence: [EVIDENCE.claudeMemory],
    fix: {
      label: 'Import AGENTS.md',
      description: 'Add a Claude memory import for the shared project instructions.',
      snippet: '@AGENTS.md'
    },
    confidence: 'medium'
  }))
}

function checkProjectInstructionCompatibility(checks: HealthCheck[], projectDir: string): void {
  const agentsMd = path.join(projectDir, 'AGENTS.md')
  const claudeMdCandidates = [
    path.join(projectDir, 'CLAUDE.md'),
    path.join(projectDir, '.claude', 'CLAUDE.md')
  ]
  const claudeMd = claudeMdCandidates.find(fileExists)
  const hasAgentsMd = fileExists(agentsMd)

  if (claudeMd && !hasAgentsMd) {
    checks.push(makeCheck({
      id: 'all:reference:project-claude-md-without-agents-md',
      severity: 'info',
      category: 'reference',
      agentId: 'all',
      title: 'Project instructions are Claude Code-only',
      message: 'Claude Code reads CLAUDE.md, but Codex reads AGENTS.md. No project AGENTS.md was found.',
      suggestion: 'Create AGENTS.md when shared project instructions should also apply to Codex.',
      scope: 'project',
      path: claudeMd,
      assetType: 'claude-md',
      evidence: [EVIDENCE.claudeMemory, EVIDENCE.codexAgentsMd],
      fix: {
        label: 'Add Codex project instructions',
        description: 'Create AGENTS.md and keep only instructions that should apply to Codex.',
        snippet: '# Shared project instructions'
      },
      confidence: 'high'
    }))
  }

  if (hasAgentsMd && !claudeMd) {
    checks.push(makeCheck({
      id: 'all:reference:project-agents-md-without-claude-md',
      severity: 'info',
      category: 'reference',
      agentId: 'all',
      title: 'Project instructions are Codex-only',
      message: 'Codex reads AGENTS.md, but Claude Code reads CLAUDE.md. No project CLAUDE.md was found.',
      suggestion: 'Create CLAUDE.md with @AGENTS.md when shared project instructions should also apply to Claude Code.',
      scope: 'project',
      path: agentsMd,
      assetType: 'agents-md',
      evidence: [EVIDENCE.codexAgentsMd, EVIDENCE.claudeMemory],
      fix: {
        label: 'Import shared instructions for Claude Code',
        description: 'Create CLAUDE.md and import the shared AGENTS.md file.',
        snippet: '@AGENTS.md'
      },
      confidence: 'high'
    }))
  }
}

function checkSkillDirectories(
  checks: HealthCheck[],
  agentId: 'claude-code' | 'codex',
  skillsDir: string,
  scope: AssetScope
): void {
  if (!dirExists(skillsDir)) return
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const skillDir = path.join(skillsDir, entry.name)
    const skillMd = path.join(skillDir, 'SKILL.md')
    if (!fileExists(skillMd)) {
      checks.push(makeCheck({
        id: `${agentId}:structure:${scope}-skill-${slug(entry.name)}-missing-entrypoint`,
        severity: 'warning',
        category: 'structure',
        agentId,
        title: 'Skill is missing SKILL.md',
        message: `${entry.name} has no SKILL.md entrypoint.`,
        suggestion: 'Add SKILL.md or move non-skill files outside the skills directory.',
        scope,
        path: skillDir,
        assetType: 'skill'
      }))
      continue
    }
    checkSkillFrontmatter(checks, agentId, skillMd, scope)
  }
}

function checkSkillFrontmatter(
  checks: HealthCheck[],
  agentId: 'claude-code' | 'codex',
  filePath: string,
  scope: AssetScope
): void {
  const parsed = readMarkdownFrontmatter(filePath)
  if (parsed.error) {
    checks.push(makeCheck({
      id: `${agentId}:syntax:${scope}-skill-${slug(path.basename(path.dirname(filePath)))}-frontmatter-invalid`,
      severity: 'warning',
      category: 'syntax',
      agentId,
      title: 'Skill frontmatter is invalid',
      message: parsed.error,
      suggestion: 'Fix the YAML frontmatter in SKILL.md.',
      scope,
      path: filePath,
      assetType: 'skill'
    }))
  }
  if (agentId === 'codex' && !parsed.error) {
    const missing = [
      stringValue(parsed.frontmatter?.name) ? '' : 'name',
      stringValue(parsed.frontmatter?.description) ? '' : 'description'
    ].filter(Boolean)
    if (missing.length > 0) {
      checks.push(makeCheck({
        id: `codex:structure:${scope}-skill-${slug(path.basename(path.dirname(filePath)))}-frontmatter-missing-required`,
        severity: 'warning',
        category: 'structure',
        agentId,
        title: 'Codex skill metadata is incomplete',
        message: `SKILL.md is missing required Codex field(s): ${missing.join(', ')}.`,
        suggestion: 'Add name and description frontmatter to SKILL.md.',
        scope,
        path: filePath,
        assetType: 'skill',
        confidence: 'high'
      }))
    }
  }
}

function checkClaudeAgents(checks: HealthCheck[], agentsDir: string, scope: AssetScope): void {
  for (const filePath of safeGlob('**/*.md', agentsDir)) {
    const parsed = readMarkdownFrontmatter(filePath)
    const name = stringValue(parsed.frontmatter?.name) ?? path.basename(filePath, '.md')
    const description = stringValue(parsed.frontmatter?.description)
    if (parsed.error || !name || !description) {
      checks.push(makeCheck({
        id: `claude-code:structure:${scope}-agent-${slug(name)}`,
        severity: parsed.error ? 'error' : 'warning',
        category: parsed.error ? 'syntax' : 'structure',
        agentId: 'claude-code',
        title: 'Claude subagent metadata is incomplete',
        message: parsed.error ?? `${name} is missing name or description frontmatter.`,
        suggestion: 'Claude Code subagents require Markdown files with name and description frontmatter.',
        scope,
        path: filePath,
        assetType: 'agent'
      }))
    }
  }
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

function checkClaudeSessions(checks: HealthCheck[], projectsDir: string): void {
  if (!dirExists(projectsDir)) return
  const entries = safeReadDir(projectsDir)
  const emptyDirs = entries.filter((entry) => {
    if (!entry.isDirectory()) return false
    const dirPath = path.join(projectsDir, entry.name)
    return safeReadDir(dirPath).length === 0
  })
  if (emptyDirs.length > 0) {
    checks.push(makeCheck({
      id: 'claude-code:session:empty-project-dirs',
      severity: 'info',
      category: 'session',
      agentId: 'claude-code',
      title: 'Empty Claude project directories',
      message: `${emptyDirs.length} empty project directories found in ~/.claude/projects/.`,
      suggestion: 'This is usually harmless. Remove stale directories if they are no longer useful.',
      scope: 'session',
      path: projectsDir
    }))
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

function checkJsonConfig(
  checks: HealthCheck[],
  agentId: 'claude-code' | 'codex',
  filePath: string,
  scope: AssetScope,
  label: string,
  title: string,
  suggestion: string
): Record<string, unknown> | undefined {
  if (!fileExists(filePath)) return undefined
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return asRecord(parsed) ?? {}
  } catch (err) {
    checks.push(makeCheck({
      id: `${agentId}:syntax:${scope}-${label}-invalid`,
      severity: 'error',
      category: 'syntax',
      agentId,
      title,
      message: err instanceof Error ? err.message : `${path.basename(filePath)} contains invalid JSON.`,
      suggestion,
      scope,
      path: filePath,
      assetType: label === 'mcp' ? 'mcp-server' : 'hook'
    }))
    return undefined
  }
}

function checksFromScanErrors(errors: ScanError[]): HealthCheck[] {
  return errors.map((error) => {
    const agentId = inferAgentId(error.path)
    return makeCheck({
      id: `${agentId}:syntax:scan-error-${hashString(`${error.path}:${error.type}:${error.message}`)}`,
      severity: 'error',
      category: 'syntax',
      agentId,
      title: 'Scanner parser error',
      message: error.message,
      suggestion: 'Fix the file syntax, then refresh Berth.',
      path: error.path,
      assetType: error.type
    })
  })
}

function checksFromSessionAssets(assets: Asset[]): HealthCheck[] {
  const checks: HealthCheck[] = []
  for (const asset of assets) {
    if (asset.type !== 'session') continue
    const startedAt = stringValue(asset.meta.startedAt)
    const projectPath = stringValue(asset.meta.projectPath)
    if (!startedAt || !projectPath) {
      const agentId = asset.agentId === 'codex' ? 'codex' : 'claude-code'
      checks.push(makeCheck({
        id: `${agentId}:session:metadata-missing-${hashString(asset.path)}`,
        severity: 'info',
        category: 'session',
        agentId,
        title: 'Session metadata is incomplete',
        message: `${asset.name} is missing start time or project path metadata.`,
        suggestion: 'This can happen with partial or legacy transcripts.',
        scope: 'session',
        path: asset.path,
        assetId: asset.id,
        assetType: 'session'
      }))
    }
  }
  return checks
}

function collectHooks(hooks: Record<string, unknown> | undefined): Array<{
  event: string
  command?: string
  commandWindows?: string
  shell?: string
  type?: string
  url?: string
  server?: string
  tool?: string
  prompt?: string
  async?: boolean
  args: string[]
}> {
  if (!hooks) return []
  const result: Array<{
    event: string
    command?: string
    commandWindows?: string
    shell?: string
    type?: string
    url?: string
    server?: string
    tool?: string
    prompt?: string
    async?: boolean
    args: string[]
  }> = []

  for (const [event, handlers] of Object.entries(hooks)) {
    const handlerList = Array.isArray(handlers) ? handlers : [handlers]
    for (const handler of handlerList) {
      const handlerRecord = asRecord(handler) ?? {}
      const nestedHooks = Array.isArray(handlerRecord.hooks)
        ? handlerRecord.hooks
        : [handlerRecord]
      for (const hook of nestedHooks) {
        const hookRecord = asRecord(hook) ?? {}
        result.push({
          event,
          command: stringValue(hookRecord.command),
          commandWindows:
            stringValue(hookRecord.commandWindows) ?? stringValue(hookRecord.command_windows),
          shell: stringValue(hookRecord.shell),
          type: stringValue(hookRecord.type),
          url: stringValue(hookRecord.url),
          server: stringValue(hookRecord.server),
          tool: stringValue(hookRecord.tool),
          prompt: stringValue(hookRecord.prompt),
          async: booleanValue(hookRecord.async) ?? booleanValue(hookRecord.async_),
          args: Array.isArray(hookRecord.args)
            ? hookRecord.args.filter((arg): arg is string => typeof arg === 'string')
            : []
        })
      }
    }
  }

  return result
}

type NormalizedHealthCheckOptions =
  Required<Pick<HealthCheckOptions, 'homeDir' | 'platform' | 'env'>> &
  Omit<HealthCheckOptions, 'homeDir' | 'platform' | 'env'>

function normalizeOptions(options: HealthCheckOptions | string): NormalizedHealthCheckOptions {
  if (typeof options === 'string') {
    return {
      homeDir: options,
      platform: process.platform,
      env: process.env
    }
  }
  return {
    ...options,
    homeDir: options.homeDir ?? os.homedir(),
    platform: options.platform ?? process.platform,
    env: options.env ?? process.env
  }
}

function buildHealthPaths(options: NormalizedHealthCheckOptions): HealthPaths {
  const claudeDirs = resolveClaudeDirs(options.homeDir, options.env)
  const codexDirs = resolveCodexHomeDirs(options.homeDir, options.env)
  return {
    homeDir: options.homeDir,
    claudeDir: claudeDirs[0],
    claudeDirs,
    codexDir: codexDirs[0],
    codexDirs,
    projectDir: options.projectDir
  }
}

function hasClaudeData(paths: HealthPaths): boolean {
  return (
    paths.claudeDirs.some(dirExists) ||
    (paths.projectDir != null &&
      (dirExists(path.join(paths.projectDir, '.claude')) ||
        fileExists(path.join(paths.projectDir, 'CLAUDE.md')) ||
        fileExists(path.join(paths.projectDir, '.mcp.json'))))
  )
}

function hasCodexData(paths: HealthPaths): boolean {
  return (
    paths.codexDirs.some((codexDir) => dirExists(codexDir) || dirExists(path.join(codexDir, 'skills'))) ||
    dirExists(path.join(paths.homeDir, '.agents', 'skills')) ||
    (paths.projectDir != null &&
      (dirExists(path.join(paths.projectDir, '.codex')) ||
        fileExists(path.join(paths.projectDir, 'AGENTS.md')) ||
        dirExists(path.join(paths.projectDir, '.agents', 'skills'))))
  )
}

function makeCheck(input: HealthCheckInput): HealthCheck {
  const suggestion = input.suggestion
  return {
    ...input,
    agentName: AGENT_NAMES[input.agentId],
    evidence: input.evidence ?? evidenceFor(input),
    fix: input.fix ?? (suggestion ? { label: 'Suggested fix', description: suggestion } : undefined),
    target: input.target ?? targetFor(input),
    confidence: input.confidence ?? confidenceFor(input)
  }
}

function evidenceFor(input: HealthCheckInput): HealthCheckEvidence[] {
  if (input.agentId === 'codex') {
    if (input.assetType === 'hook') return [EVIDENCE.codexHooks]
    if (input.assetType === 'skill') return [EVIDENCE.codexSkills]
    if (input.assetType === 'agent') return [EVIDENCE.codexSubagents]
    if (input.assetType === 'agents-md') return [EVIDENCE.codexAgentsMd]
    if (input.category === 'session') return [EVIDENCE.codexWindows]
    return [EVIDENCE.codexConfig]
  }

  if (input.agentId === 'claude-code') {
    if (input.assetType === 'hook') return [EVIDENCE.claudeHooks]
    if (input.assetType === 'mcp-server') return [EVIDENCE.claudeMcp]
    if (input.assetType === 'skill') return [EVIDENCE.claudeSkills]
    if (input.assetType === 'agent') return [EVIDENCE.claudeSubagents]
    if (input.assetType === 'claude-md' || input.assetType === 'agents-md') return [EVIDENCE.claudeMemory]
    if (input.category === 'session') return [EVIDENCE.claudeSessions]
    return [EVIDENCE.claudeSettings]
  }

  return []
}

function targetFor(input: HealthCheckInput): HealthCheckTarget | undefined {
  if (input.assetId && input.assetType === 'session') return { route: `/sessions/${input.assetId}`, assetId: input.assetId, path: input.path }

  const route = routeForAssetType(input.assetType)
  if (route || input.assetId || input.path) {
    return {
      route,
      assetId: input.assetId,
      path: input.path
    }
  }

  return undefined
}

function routeForAssetType(assetType: string | undefined): string | undefined {
  if (!assetType) return undefined
  if (assetType === 'hook') return '/configuration/capabilities?tab=hooks'
  if (assetType === 'mcp-server') return '/configuration/capabilities?tab=mcp'
  if (assetType === 'permission') return '/configuration/capabilities?tab=permissions'
  if (assetType === 'env') return '/configuration/capabilities?tab=env'
  if (assetType === 'plugin') return '/configuration/capabilities?tab=plugins'
  if (assetType === 'statusline') return '/configuration/capabilities?tab=statusLine'
  if (['skill', 'agent', 'claude-md', 'gemini-md', 'agents-md', 'command', 'output-mode'].includes(assetType)) {
    return '/configuration/instructions'
  }
  return undefined
}

function confidenceFor(input: HealthCheckInput): HealthCheckConfidence {
  if (input.category === 'syntax' || input.severity === 'error') return 'high'
  if (input.category === 'configuration') return 'medium'
  if (input.category === 'session' || input.severity === 'info') return 'low'
  return 'high'
}

function dedupeChecks(checks: HealthCheck[]): HealthCheck[] {
  const seen = new Set<string>()
  const result: HealthCheck[] = []
  for (const check of checks) {
    if (seen.has(check.id)) continue
    seen.add(check.id)
    result.push(check)
  }
  return result
}

function inferAgentId(filePath: string): HealthCheck['agentId'] {
  if (filePath.includes(`${path.sep}.codex${path.sep}`) || filePath.includes(`${path.sep}.agents${path.sep}`)) return 'codex'
  if (filePath.includes(`${path.sep}.claude${path.sep}`)) return 'claude-code'
  return 'all'
}
