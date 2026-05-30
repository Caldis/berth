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
  const sessionId = path.basename(filePath, '.jsonl')
  const meta: Record<string, unknown> = { sessionId, project: projectName }
  try {
    const fd = fs.openSync(filePath, 'r')
    try {
      const stat = fs.fstatSync(fd)
      meta.sizeBytes = stat.size
      meta.modifiedAt = stat.mtime.toISOString()

      // Read first line for session start info
      const buf = Buffer.alloc(Math.min(4096, stat.size))
      const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0)
      const firstChunk = buf.toString('utf-8', 0, bytesRead)
      const firstNewline = firstChunk.indexOf('\n')
      const firstLine = firstNewline >= 0 ? firstChunk.slice(0, firstNewline) : firstChunk
      if (firstLine.trim()) {
        try {
          const first = JSON.parse(firstLine)
          if (first.type === 'summary') {
            meta.title = first.summary ?? first.title
            meta.model = first.model
            meta.startedAt = first.timestamp
            meta.totalCost = first.costUSD ?? first.cost
            meta.totalTokens = first.totalTokens
          } else {
            meta.startedAt = first.timestamp
            meta.model = first.model
          }
        } catch {
          // not valid JSON
        }
      }

      // Read last few KB for session end info
      if (stat.size > 4096) {
        const tailSize = Math.min(4096, stat.size)
        const tailBuf = Buffer.alloc(tailSize)
        fs.readSync(fd, tailBuf, 0, tailSize, stat.size - tailSize)
        const tailStr = tailBuf.toString('utf-8')
        const lines = tailStr.split('\n').filter((l) => l.trim())
        const lastLine = lines[lines.length - 1]
        if (lastLine) {
          try {
            const last = JSON.parse(lastLine)
            meta.endedAt = last.timestamp
            if (last.type === 'summary') {
              meta.title = meta.title ?? last.summary ?? last.title
              meta.totalCost = last.costUSD ?? last.cost ?? meta.totalCost
              meta.totalTokens = last.totalTokens ?? meta.totalTokens
              meta.model = last.model ?? meta.model
            }
          } catch {
            // not valid JSON
          }
        }
      }
    } finally {
      fs.closeSync(fd)
    }
  } catch {
    // file read error
  }

  return {
    id: makeId('session'),
    agentId: 'claude-code',
    category: 'state',
    type: 'session',
    scope: 'session',
    name: (meta.title as string) ?? sessionId,
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
