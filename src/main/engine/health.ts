import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { glob } from 'glob'
import { parseCodexToml } from '../adapters/codex/parsers'
import type { Asset, AssetScope } from '@shared/types/asset'
import type {
  HealthCheck,
  HealthCheckCategory,
  HealthCheckSeverity,
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

interface HealthCheckInput {
  id: string
  severity: HealthCheckSeverity
  category: HealthCheckCategory
  agentId: HealthCheck['agentId']
  title: string
  message: string
  suggestion?: string
  scope?: AssetScope
  path?: string
  assetId?: string
  assetType?: string
}

interface HealthPaths {
  homeDir: string
  claudeDir: string
  codexDir: string
  projectDir?: string
}

const AGENT_NAMES: Record<HealthCheck['agentId'], string> = {
  all: 'All agents',
  'claude-code': 'Claude Code',
  codex: 'Codex'
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
  if (userSettings) checkClaudeSettings(checks, userSettings, 'user', path.join(paths.claudeDir, 'settings.json'), platform)

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
    if (parsedProjectSettings) checkClaudeSettings(checks, parsedProjectSettings, 'project', projectSettings, platform)

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
    if (platform === 'win32' && hook.command && hook.shell !== 'powershell') {
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
        assetType: 'hook'
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
    const config = parseCodexToml(filePath)
    checkMcpServers(checks, 'codex', config, 'mcp_servers', scope, filePath)
    checkCodexHooks(checks, asRecord(config.hooks), scope, filePath, platform)
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
    if (platform === 'win32' && hook.command && !hook.commandWindows) {
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
        assetType: 'hook'
      }))
    }
  }
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
}> {
  if (!hooks) return []
  const result: Array<{
    event: string
    command?: string
    commandWindows?: string
    shell?: string
    type?: string
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
          type: stringValue(hookRecord.type)
        })
      }
    }
  }

  return result
}

function readMarkdownFrontmatter(filePath: string): {
  frontmatter: Record<string, unknown> | null
  error?: string
} {
  let raw = ''
  try {
    raw = fs.readFileSync(filePath, 'utf-8')
  } catch (err) {
    return { frontmatter: null, error: err instanceof Error ? err.message : 'Unable to read file.' }
  }
  if (!raw.startsWith('---')) return { frontmatter: null }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { frontmatter: null, error: 'Frontmatter is not closed.' }
  try {
    const parsed = yaml.load(raw.slice(3, end).trim())
    return { frontmatter: asRecord(parsed) ?? null }
  } catch (err) {
    return {
      frontmatter: null,
      error: err instanceof Error ? err.message : 'Invalid YAML frontmatter.'
    }
  }
}

function extractAtImports(content: string): string[] {
  const results: string[] = []
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (/^@[\w./\\]/.test(trimmed)) results.push(trimmed.slice(1).trim())
  }
  return results
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
  return {
    homeDir: options.homeDir,
    claudeDir: path.join(options.homeDir, '.claude'),
    codexDir: options.env.CODEX_HOME || path.join(options.homeDir, '.codex'),
    projectDir: options.projectDir
  }
}

function hasClaudeData(paths: HealthPaths): boolean {
  return (
    dirExists(paths.claudeDir) ||
    (paths.projectDir != null &&
      (dirExists(path.join(paths.projectDir, '.claude')) ||
        fileExists(path.join(paths.projectDir, 'CLAUDE.md')) ||
        fileExists(path.join(paths.projectDir, '.mcp.json'))))
  )
}

function hasCodexData(paths: HealthPaths): boolean {
  return (
    dirExists(paths.codexDir) ||
    dirExists(path.join(paths.homeDir, '.agents', 'skills')) ||
    (paths.projectDir != null &&
      (dirExists(path.join(paths.projectDir, '.codex')) ||
        fileExists(path.join(paths.projectDir, 'AGENTS.md')) ||
        dirExists(path.join(paths.projectDir, '.agents', 'skills'))))
  )
}

function makeCheck(input: HealthCheckInput): HealthCheck {
  return {
    ...input,
    agentName: AGENT_NAMES[input.agentId]
  }
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

function safeGlob(pattern: string, cwd: string): string[] {
  if (!dirExists(cwd)) return []
  try {
    return glob.sync(pattern, { cwd, absolute: true, windowsPathsNoEscape: true })
  } catch {
    return []
  }
}

function safeReadDir(dirPath: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return []
  }
}

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

function dirExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory()
  } catch {
    return false
  }
}

function inferAgentId(filePath: string): HealthCheck['agentId'] {
  if (filePath.includes(`${path.sep}.codex${path.sep}`) || filePath.includes(`${path.sep}.agents${path.sep}`)) return 'codex'
  if (filePath.includes(`${path.sep}.claude${path.sep}`)) return 'claude-code'
  return 'all'
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'unknown'
}

function hashString(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}
