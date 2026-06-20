// Claude Code health check provider.
// Extracted from health.ts (GH #6 health-restructure, behavior-preserving).
import * as path from 'path'
import { extractAtImports } from '@shared/object-guards'
import { samePath } from '@shared/path-utils'
import type { AssetScope } from '@shared/types/asset'
import type { HealthCheck } from '@shared/types/ipc'
import type { HealthPaths } from './types'
import { CLAUDE_HOOK_TYPES, CLAUDE_SETTINGS_SCHEMA, EVIDENCE } from './constants'
import { asRecord, slug, stringValue } from './value-guards'
import { dirExists, fileExists, safeGlob, safeReadDir, safeReadText } from './fs-utils'
import { looksPowerShellCommand } from './command-heuristics'
import { readMarkdownFrontmatter } from './markdown'
import { collectHooks } from './hooks'
import { makeCheck } from './make-check'
import {
  checkInstructionImports,
  checkJsonConfig,
  checkMcpServers,
  checkSkillDirectories
} from './shared-checks'

export function checkClaude(paths: HealthPaths, platform: NodeJS.Platform): HealthCheck[] {
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
      path: claudeMd,
      i18nKeys: {
        title: 'healthChecks.text.titles.userClaudeMdNotFound',
        message: 'healthChecks.text.messages.noUserClaudeMd',
        suggestion: 'healthChecks.text.fixDescriptions.createUserClaudeMd'
      }
    }))
  }

  const userSettings = checkJsonConfig(
    checks,
    'claude-code',
    path.join(paths.claudeDir, 'settings.json'),
    'user',
    'settings',
    'Invalid settings.json',
    'Fix the JSON syntax in ~/.claude/settings.json.',
    {
      title: 'healthChecks.text.titles.invalidClaudeSettings',
      suggestion: 'healthChecks.text.suggestions.fixClaudeUserSettings'
    }
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
    'Fix the JSON syntax in ~/.claude.json.',
    {
      title: 'healthChecks.text.titles.invalidClaudeJson',
      suggestion: 'healthChecks.text.suggestions.fixClaudeJson'
    }
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
      'Fix the JSON syntax in .claude/settings.json.',
      {
        title: 'healthChecks.text.titles.invalidClaudeProjectSettings',
        suggestion: 'healthChecks.text.suggestions.fixClaudeProjectSettings'
      }
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
      'Fix the JSON syntax in .claude/settings.local.json.',
      {
        title: 'healthChecks.text.titles.invalidClaudeLocalSettings',
        suggestion: 'healthChecks.text.suggestions.fixClaudeLocalSettings'
      }
    )
    if (parsedLocalSettings) checkClaudeSettings(checks, parsedLocalSettings, 'project', projectLocalSettings, platform)

    const parsedMcp = checkJsonConfig(
      checks,
      'claude-code',
      mcpJson,
      'project',
      'mcp',
      'Invalid .mcp.json',
      'Fix the JSON syntax in project .mcp.json.',
      {
        title: 'healthChecks.text.titles.invalidMcpJson',
        suggestion: 'healthChecks.text.suggestions.fixMcpJson'
      }
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
    confidence: 'low',
    i18nKeys: {
      title: 'healthChecks.text.titles.claudeSettingsSchemaMissing',
      message: 'healthChecks.text.messages.claudeSettingsSchemaMissing',
      suggestion: 'healthChecks.text.suggestions.addClaudeSettingsSchema',
      fixLabel: 'healthChecks.text.fixLabels.addClaudeSettingsSchema',
      fixDescription: 'healthChecks.text.fixDescriptions.addClaudeSettingsSchema'
    },
    params: { name: path.basename(filePath) }
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
        assetType: 'hook',
        i18nKeys: {
          title: 'healthChecks.text.titles.claudeHookMissingCommand',
          message: 'healthChecks.text.messages.claudeHookMissingCommand',
          suggestion: 'healthChecks.text.fixDescriptions.addHookCommand'
        },
        params: { event: hook.event }
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
        assetType: 'hook',
        i18nKeys: {
          title: 'healthChecks.text.titles.claudeHookMissingUrl',
          message: 'healthChecks.text.messages.claudeHookMissingUrl',
          suggestion: 'healthChecks.text.suggestions.addHookUrl'
        },
        params: { event: hook.event }
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
          assetType: 'hook',
          i18nKeys: {
            title: 'healthChecks.text.titles.claudeHookMcpToolIncomplete',
            message: 'healthChecks.text.messages.claudeHookMcpToolIncomplete',
            suggestion: 'healthChecks.text.suggestions.addMcpToolFields'
          },
          params: { event: hook.event, field }
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
        assetType: 'hook',
        i18nKeys: {
          title: 'healthChecks.text.titles.claudeHookMissingPrompt',
          message: 'healthChecks.text.messages.claudeHookMissingPrompt',
          suggestion: 'healthChecks.text.suggestions.addHookPrompt'
        },
        params: { event: hook.event, type: hook.type }
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
        confidence: 'high',
        i18nKeys: {
          title: 'healthChecks.text.titles.claudeHookUnknownType',
          message: 'healthChecks.text.messages.claudeHookUnknownType',
          suggestion: 'healthChecks.text.suggestions.useDocumentedHookType'
        },
        params: { event: hook.event, type: hook.type }
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
        confidence: 'high',
        i18nKeys: {
          title: 'healthChecks.text.titles.claudeHookShellIgnored',
          message: 'healthChecks.text.messages.claudeHookShellIgnored',
          suggestion: 'healthChecks.text.suggestions.claudeHookShellIgnored'
        }
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
        confidence: 'medium',
        i18nKeys: {
          title: 'healthChecks.text.titles.claudeHookNoWindowsShell',
          message: 'healthChecks.text.messages.claudeHookNoWindowsShell',
          suggestion: 'healthChecks.text.suggestions.claudeHookNoWindowsShell'
        }
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
      assetType: 'permission',
      i18nKeys: {
        title: 'healthChecks.text.titles.claudeBypassPermissions',
        message: 'healthChecks.text.messages.claudeBypassPermissions',
        suggestion: 'healthChecks.text.suggestions.claudeBypassPermissions'
      }
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
      assetType: 'permission',
      i18nKeys: {
        title: 'healthChecks.text.titles.claudeBroadBashPermission',
        message: 'healthChecks.text.messages.claudeBroadBashPermission',
        suggestion: 'healthChecks.text.suggestions.claudeBroadBashPermission'
      }
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
    confidence: 'medium',
    i18nKeys: {
      title: 'healthChecks.text.titles.claudeProjectAgentsNotImported',
      message: 'healthChecks.text.messages.claudeProjectAgentsNotImported',
      suggestion: 'healthChecks.text.suggestions.claudeProjectAgentsNotImported',
      fixLabel: 'healthChecks.text.fixLabels.importAgentsMd',
      fixDescription: 'healthChecks.text.fixDescriptions.importAgentsMd'
    }
  }))
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
        assetType: 'agent',
        i18nKeys: {
          title: 'healthChecks.text.titles.claudeSubagentIncomplete',
          // Raw parser errors have no stable key; only the derived prose does.
          message: parsed.error ? undefined : 'healthChecks.text.messages.claudeSubagentIncomplete',
          suggestion: 'healthChecks.text.suggestions.claudeSubagentIncomplete'
        },
        params: parsed.error ? undefined : { name }
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
      path: projectsDir,
      i18nKeys: {
        title: 'healthChecks.text.titles.claudeEmptyProjectDirs',
        message: 'healthChecks.text.messages.claudeEmptyProjectDirs',
        suggestion: 'healthChecks.text.suggestions.claudeEmptyProjectDirs'
      },
      params: { count: emptyDirs.length }
    }))
  }
}
