import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import type { Asset, AssetScope } from '../types'

let _nextId = 0
function makeId(type: string): string {
  return `${type}-${Date.now()}-${_nextId++}`
}

// ---------------------------------------------------------------------------
// Markdown instruction files (CLAUDE.md, AGENTS.md)
// ---------------------------------------------------------------------------

export function parseClaudeMd(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const imports = extractAtImports(raw)
  return {
    id: makeId('claude-md'),
    agentId: 'claude-code',
    category: 'instruction',
    type: 'claude-md',
    scope,
    name: path.basename(filePath),
    path: filePath,
    meta: { imports, lineCount: raw.split('\n').length },
    raw
  }
}

export function parseAgentsMd(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const imports = extractAtImports(raw)
  return {
    id: makeId('agents-md'),
    agentId: 'claude-code',
    category: 'instruction',
    type: 'agents-md',
    scope,
    name: path.basename(filePath),
    path: filePath,
    meta: { imports, lineCount: raw.split('\n').length },
    raw
  }
}

export function extractAtImports(content: string): string[] {
  const results: string[] = []
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    // Matches @path references like @AGENTS.md, @./foo/bar.md
    if (/^@[\w./\\]/.test(trimmed)) {
      results.push(trimmed.slice(1).trim())
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// Skills (YAML frontmatter + Markdown)
// ---------------------------------------------------------------------------

export function parseSkill(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  return {
    id: makeId('skill'),
    agentId: 'claude-code',
    category: 'instruction',
    type: 'skill',
    scope,
    name: (frontmatter?.name as string) ?? path.basename(filePath, path.extname(filePath)),
    path: filePath,
    meta: {
      ...(frontmatter ?? {}),
      bodyLength: body.length
    },
    raw
  }
}

// ---------------------------------------------------------------------------
// Agents (YAML subagent definitions)
// ---------------------------------------------------------------------------

export function parseAgent(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  let parsed: Record<string, unknown> = {}
  try {
    parsed = (yaml.load(raw) as Record<string, unknown>) ?? {}
  } catch {
    // malformed yaml — still return the asset with empty meta
  }
  return {
    id: makeId('agent'),
    agentId: 'claude-code',
    category: 'instruction',
    type: 'agent',
    scope,
    name: (parsed.name as string) ?? path.basename(filePath, path.extname(filePath)),
    path: filePath,
    meta: parsed
  }
}

// ---------------------------------------------------------------------------
// Commands (Markdown slash commands)
// ---------------------------------------------------------------------------

export function parseCommand(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const name = path.basename(filePath, path.extname(filePath))
  return {
    id: makeId('command'),
    agentId: 'claude-code',
    category: 'instruction',
    type: 'command',
    scope,
    name,
    path: filePath,
    meta: { lineCount: raw.split('\n').length },
    raw
  }
}

// ---------------------------------------------------------------------------
// Output modes
// ---------------------------------------------------------------------------

export function parseOutputMode(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const name = path.basename(filePath, path.extname(filePath))
  return {
    id: makeId('output-mode'),
    agentId: 'claude-code',
    category: 'instruction',
    type: 'output-mode',
    scope,
    name,
    path: filePath,
    meta: { lineCount: raw.split('\n').length },
    raw
  }
}

// ---------------------------------------------------------------------------
// Teams (YAML)
// ---------------------------------------------------------------------------

export function parseTeam(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  let parsed: Record<string, unknown> = {}
  try {
    parsed = (yaml.load(raw) as Record<string, unknown>) ?? {}
  } catch {
    // malformed yaml
  }
  return {
    id: makeId('team'),
    agentId: 'claude-code',
    category: 'instruction',
    type: 'team',
    scope,
    name: (parsed.name as string) ?? path.basename(filePath, path.extname(filePath)),
    path: filePath,
    meta: parsed
  }
}

// ---------------------------------------------------------------------------
// MCP servers (from JSON configs)
// ---------------------------------------------------------------------------

export interface McpConfig {
  mcpServers?: Record<string, Record<string, unknown>>
}

export function parseMcpServers(
  filePath: string,
  scope: AssetScope
): Asset[] {
  const assets: Asset[] = []
  let config: McpConfig
  try {
    config = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as McpConfig
  } catch {
    return assets
  }
  const servers = config.mcpServers ?? {}
  for (const [name, serverConfig] of Object.entries(servers)) {
    assets.push({
      id: makeId('mcp-server'),
      agentId: 'claude-code',
      category: 'capability',
      type: 'mcp-server',
      scope,
      name,
      path: filePath,
      meta: { serverConfig, source: filePath }
    })
  }
  return assets
}

// ---------------------------------------------------------------------------
// Hooks (from settings.json)
// ---------------------------------------------------------------------------

export interface SettingsJson {
  hooks?: Record<string, unknown[]>
  permissions?: { allow?: string[]; deny?: string[] }
  env?: Record<string, string>
  [key: string]: unknown
}

export function parseHooks(filePath: string, scope: AssetScope): Asset[] {
  const settings = readSettingsJson(filePath)
  if (!settings?.hooks) return []
  const assets: Asset[] = []
  for (const [event, handlers] of Object.entries(settings.hooks)) {
    if (!Array.isArray(handlers)) continue

    handlers.forEach((handler, handlerIndex) => {
      const handlerRecord = isRecord(handler) ? handler : {}
      const matcher = typeof handlerRecord.matcher === 'string' ? handlerRecord.matcher : undefined
      const nestedHooks = Array.isArray(handlerRecord.hooks) ? handlerRecord.hooks : [handlerRecord]

      nestedHooks.forEach((hook, hookIndex) => {
        const hookRecord = isRecord(hook) ? hook : {}
        const command = typeof hookRecord.command === 'string' ? hookRecord.command : undefined
        const hookType = typeof hookRecord.type === 'string' ? hookRecord.type : undefined
        assets.push({
          id: makeId('hook'),
          agentId: 'claude-code',
          category: 'capability',
          type: 'hook',
          scope,
          name: command ?? `${event} hook ${handlerIndex + 1}`,
          path: filePath,
          meta: {
            event,
            eventType: event,
            matcher,
            command,
            hookType,
            handlerIndex,
            hookIndex
          }
        })
      })
    })
  }
  return assets
}

// ---------------------------------------------------------------------------
// Permissions (from settings.json allow/deny)
// ---------------------------------------------------------------------------

export function parsePermissions(filePath: string, scope: AssetScope): Asset[] {
  const settings = readSettingsJson(filePath)
  if (!settings?.permissions) return []
  const assets: Asset[] = []
  const perms = settings.permissions
  if (perms.allow && perms.allow.length > 0) {
    assets.push({
      id: makeId('permission'),
      agentId: 'claude-code',
      category: 'capability',
      type: 'permission',
      scope,
      name: 'allow-list',
      path: filePath,
      meta: { kind: 'allow', rules: perms.allow }
    })
  }
  if (perms.deny && perms.deny.length > 0) {
    assets.push({
      id: makeId('permission'),
      agentId: 'claude-code',
      category: 'capability',
      type: 'permission',
      scope,
      name: 'deny-list',
      path: filePath,
      meta: { kind: 'deny', rules: perms.deny }
    })
  }
  return assets
}

// ---------------------------------------------------------------------------
// Env blocks (from settings.json)
// ---------------------------------------------------------------------------

export function parseEnv(filePath: string, scope: AssetScope): Asset[] {
  const settings = readSettingsJson(filePath)
  if (!settings?.env || Object.keys(settings.env).length === 0) return []
  return [
    {
      id: makeId('env'),
      agentId: 'claude-code',
      category: 'capability',
      type: 'env',
      scope,
      name: 'env',
      path: filePath,
      meta: { keys: Object.keys(settings.env), count: Object.keys(settings.env).length }
    }
  ]
}

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

export function parsePlugin(filePath: string): Asset {
  const dirName = path.basename(filePath)
  let meta: Record<string, unknown> = { directory: filePath }
  const manifestPath = path.join(filePath, 'package.json')
  if (fs.existsSync(manifestPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      meta = { ...meta, name: pkg.name, version: pkg.version, description: pkg.description }
    } catch {
      // ignore
    }
  }
  return {
    id: makeId('plugin'),
    agentId: 'claude-code',
    category: 'capability',
    type: 'plugin',
    scope: 'user',
    name: (meta.name as string) ?? dirName,
    path: filePath,
    meta
  }
}

// ---------------------------------------------------------------------------
// Statusline scripts
// ---------------------------------------------------------------------------

export function parseStatusline(filePath: string, scope: AssetScope): Asset {
  return {
    id: makeId('statusline'),
    agentId: 'claude-code',
    category: 'capability',
    type: 'statusline',
    scope,
    name: path.basename(filePath),
    path: filePath,
    meta: {}
  }
}

// ---------------------------------------------------------------------------
// Sessions (metadata-only from JSONL)
// ---------------------------------------------------------------------------

export function parseSessionMeta(filePath: string, projectName: string): Asset {
  const fallbackSessionId = path.basename(filePath, '.jsonl')
  let sessionId = fallbackSessionId
  let firstTimestamp: string | undefined
  let lastTimestamp: string | undefined
  let title: string | undefined
  let model: string | undefined
  let projectPath: string | undefined
  let totalTokens = 0
  let sawUsage = false
  let totalCost: number | undefined
  let fileHistoryCount = 0
  const skillsUsed = new Set<string>()
  const mcpServers = new Set<string>()
  const hookEventCounts = new Map<string, number>()

  const meta: Record<string, unknown> = {
    sessionId,
    projectDirName: projectName,
    transcriptPath: filePath
  }

  try {
    const stat = fs.statSync(filePath)
    meta.sizeBytes = stat.size
    meta.modifiedAt = stat.mtime.toISOString()

    const raw = fs.readFileSync(filePath, 'utf-8')
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue
      let parsed: unknown
      try {
        parsed = JSON.parse(line)
      } catch {
        continue
      }
      if (!isRecord(parsed)) continue

      const recordSessionId = readString(parsed, 'sessionId') ?? readString(parsed, 'session_id')
      if (recordSessionId) sessionId = recordSessionId

      const timestamp = readValidDateString(parsed, 'timestamp')
      if (timestamp) {
        firstTimestamp ??= timestamp
        lastTimestamp = timestamp
      }

      const workspace = isRecord(parsed.workspace) ? parsed.workspace : undefined
      const workspaceProjectDir = readString(workspace, 'project_dir')
      if (workspaceProjectDir) {
        projectPath = workspaceProjectDir
      } else {
        projectPath ??= readString(workspace, 'current_dir') ?? readString(parsed, 'cwd')
      }

      const type = readString(parsed, 'type')
      if (type === 'ai-title') {
        title = title ?? readString(parsed, 'aiTitle')
      }
      if (type === 'file-history-snapshot') {
        fileHistoryCount += 1
      }

      if (type === 'summary') {
        title = title ?? readString(parsed, 'summary') ?? readString(parsed, 'title')
        model = model ?? readString(parsed, 'model')
        totalCost = readExplicitCost(parsed) ?? totalCost
        if (!sawUsage) {
          const legacyTokens = readNumber(parsed, 'totalTokens')
          if (legacyTokens != null) totalTokens = legacyTokens
        }
      }

      const message = isRecord(parsed.message) ? parsed.message : undefined
      model = readString(message, 'model') ?? model
      const usage = isRecord(message?.usage) ? message.usage : undefined
      if (usage) {
        sawUsage = true
        totalTokens += readTokenUsage(usage)
      }

      const content = Array.isArray(message?.content) ? message.content : []
      for (const item of content) {
        if (!isRecord(item)) continue
        if (readString(item, 'type') !== 'tool_use') continue
        const toolName = readString(item, 'name')
        if (!toolName) continue
        const input = isRecord(item.input) ? item.input : undefined
        if (toolName === 'Skill') {
          const skillName = readString(input, 'skill')
          if (skillName) skillsUsed.add(skillName)
        }
        const mcpServer = extractMcpServerName(toolName)
        if (mcpServer) mcpServers.add(mcpServer)
      }

      const subtype = readString(parsed, 'subtype')
      if (subtype === 'stop_hook_summary') {
        const hookCount =
          readNumber(parsed, 'hookCount') ??
          (Array.isArray(parsed.hookInfos) ? parsed.hookInfos.length : 0)
        if (hookCount > 0) {
          addHookCount(hookEventCounts, 'Stop', hookCount)
        }
      }
    }
  } catch {
    // file read error
  }

  const resolvedProjectPath = projectPath ?? decodeClaudeProjectDir(projectName)
  const project = projectNameFromPath(resolvedProjectPath, projectName)
  const duration = calculateDurationSeconds(firstTimestamp, lastTimestamp)
  const hookCountsObject = Object.fromEntries(hookEventCounts)

  meta.sessionId = sessionId
  meta.project = project
  meta.projectPath = resolvedProjectPath
  meta.title = title
  meta.model = model
  meta.startedAt = firstTimestamp
  meta.endedAt = lastTimestamp
  meta.duration = duration
  meta.totalTokens = totalTokens
  meta.hasUsage = sawUsage
  meta.skillsUsed = Array.from(skillsUsed).sort()
  meta.mcpServers = Array.from(mcpServers).sort()
  meta.hooksFired = Array.from(hookEventCounts.values()).reduce((sum, count) => sum + count, 0)
  meta.hookEventCounts = hookCountsObject
  meta.fileHistoryCount = fileHistoryCount
  if (totalCost != null) meta.totalCost = totalCost

  return {
    id: `session-${sessionId}`,
    agentId: 'claude-code',
    category: 'state',
    type: 'session',
    scope: 'session',
    name: title ?? `Session ${sessionId.slice(0, 8)}`,
    path: filePath,
    meta
  }
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export function parsePlan(filePath: string): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const name = path.basename(filePath, path.extname(filePath))
  return {
    id: makeId('plan'),
    agentId: 'claude-code',
    category: 'state',
    type: 'plan',
    scope: 'user',
    name,
    path: filePath,
    meta: { lineCount: raw.split('\n').length },
    raw
  }
}

// ---------------------------------------------------------------------------
// Todos
// ---------------------------------------------------------------------------

export function parseTodo(filePath: string): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const name = path.basename(filePath, path.extname(filePath))
  return {
    id: makeId('todo'),
    agentId: 'claude-code',
    category: 'state',
    type: 'todo',
    scope: 'user',
    name,
    path: filePath,
    meta: { lineCount: raw.split('\n').length },
    raw
  }
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export function parseHistory(filePath: string): Asset {
  let entryCount = 0
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    entryCount = content.split('\n').filter((l) => l.trim()).length
  } catch {
    // ignore
  }
  return {
    id: makeId('history'),
    agentId: 'claude-code',
    category: 'state',
    type: 'history',
    scope: 'user',
    name: 'history',
    path: filePath,
    meta: { entryCount }
  }
}

// ---------------------------------------------------------------------------
// Stats cache
// ---------------------------------------------------------------------------

export function parseStatsCache(filePath: string): Asset {
  let meta: Record<string, unknown> = {}
  try {
    meta = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    // ignore
  }
  return {
    id: makeId('stats-cache'),
    agentId: 'claude-code',
    category: 'observability',
    type: 'stats-cache',
    scope: 'user',
    name: 'stats-cache',
    path: filePath,
    meta
  }
}

// ---------------------------------------------------------------------------
// Usage data
// ---------------------------------------------------------------------------

export function parseUsageData(filePath: string): Asset {
  let meta: Record<string, unknown> = {}
  try {
    meta = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    // ignore
  }
  const name = path.basename(filePath, path.extname(filePath))
  return {
    id: makeId('usage-data'),
    agentId: 'claude-code',
    category: 'observability',
    type: 'usage-data',
    scope: 'user',
    name,
    path: filePath,
    meta
  }
}

// ---------------------------------------------------------------------------
// IDE locks
// ---------------------------------------------------------------------------

export function parseIdeLock(filePath: string): Asset {
  let meta: Record<string, unknown> = {}
  try {
    meta = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    // ignore
  }
  return {
    id: makeId('ide-lock'),
    agentId: 'claude-code',
    category: 'integration',
    type: 'ide-lock',
    scope: 'user',
    name: path.basename(filePath),
    path: filePath,
    meta
  }
}

// ---------------------------------------------------------------------------
// Credentials (existence-only, never read content)
// ---------------------------------------------------------------------------

export function parseCredential(filePath: string): Asset {
  return {
    id: makeId('credential'),
    agentId: 'claude-code',
    category: 'integration',
    type: 'credential',
    scope: 'user',
    name: path.basename(filePath),
    path: filePath,
    meta: { exists: true },
    sensitive: true
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readString(record: unknown, key: string): string | undefined {
  if (!isRecord(record)) return undefined
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

function readNumber(record: unknown, key: string): number | undefined {
  if (!isRecord(record)) return undefined
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readValidDateString(record: unknown, key: string): string | undefined {
  const value = readString(record, key)
  if (!value) return undefined
  return Number.isNaN(new Date(value).getTime()) ? undefined : value
}

function readExplicitCost(record: Record<string, unknown>): number | undefined {
  const direct =
    readNumber(record, 'costUSD') ??
    readNumber(record, 'cost_usd') ??
    readNumber(record, 'totalCost') ??
    readNumber(record, 'total_cost_usd')
  if (direct != null) return direct

  const cost = record.cost
  if (typeof cost === 'number' && Number.isFinite(cost)) return cost
  if (isRecord(cost)) {
    return (
      readNumber(cost, 'total_cost_usd') ??
      readNumber(cost, 'totalCostUsd') ??
      readNumber(cost, 'costUSD')
    )
  }
  return undefined
}

function readTokenUsage(usage: Record<string, unknown>): number {
  const keys = [
    'input_tokens',
    'output_tokens',
    'cache_read_input_tokens',
    'cache_creation_input_tokens',
    'cache_read_tokens',
    'cache_creation_tokens',
    'inputTokens',
    'outputTokens',
    'cacheReadInputTokens',
    'cacheCreationInputTokens'
  ]
  return keys.reduce((sum, key) => sum + (readNumber(usage, key) ?? 0), 0)
}

function extractMcpServerName(toolName: string): string | undefined {
  if (!toolName.startsWith('mcp__')) return undefined
  const rest = toolName.slice('mcp__'.length)
  const separator = rest.indexOf('__')
  if (separator <= 0) return undefined
  return rest.slice(0, separator)
}

function addHookCount(counts: Map<string, number>, event: string, count: number): void {
  counts.set(event, (counts.get(event) ?? 0) + count)
}

function decodeClaudeProjectDir(projectName: string): string {
  const windowsPath = projectName.match(/^([A-Za-z])--(.+)$/)
  if (windowsPath) {
    return `${windowsPath[1]}:\\${windowsPath[2].split('-').filter(Boolean).join('\\')}`
  }
  if (projectName.startsWith('-')) {
    return `/${projectName.slice(1).split('-').filter(Boolean).join('/')}`
  }
  return projectName
}

function projectNameFromPath(projectPath: string, fallback: string): string {
  const trimmed = projectPath.replace(/[\\/]+$/, '')
  return path.win32.basename(trimmed) || path.posix.basename(trimmed) || fallback
}

function calculateDurationSeconds(
  startedAt: string | undefined,
  endedAt: string | undefined
): number | null {
  if (!startedAt || !endedAt) return null
  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  return Math.max(0, Math.round((end - start) / 1000))
}

function splitFrontmatter(content: string): {
  frontmatter: Record<string, unknown> | null
  body: string
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return { frontmatter: null, body: content }
  try {
    const fm = yaml.load(match[1]) as Record<string, unknown>
    return { frontmatter: fm, body: match[2] }
  } catch {
    return { frontmatter: null, body: content }
  }
}

function readSettingsJson(filePath: string): SettingsJson | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as SettingsJson
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}
