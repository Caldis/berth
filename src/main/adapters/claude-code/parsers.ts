import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import {
  addTokenUsage,
  emptyTokenUsage,
  normalizeTokenUsage
} from '@shared/token-usage'
import { buildHookHash, buildHookKey, buildHookScenarioHash } from '@shared/hook-identity'
import { assetEntityId, dedupePathKey } from '@shared/asset-dedupe'
import { extractCommandEntryPaths } from '../command-entry-paths'
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
  // Deterministic id (not `makeId()`'s `Date.now()`) so the row is stable across
  // scans — important for shallow-indexed CLAUDE.md, which is re-scanned on every
  // global refresh and would otherwise re-key and lose selection. (GH-113 T4)
  return {
    id: assetEntityId('claude-md', scope, filePath),
    agentId: 'claude-code',
    category: 'instruction',
    type: 'claude-md',
    scope,
    name: path.basename(filePath),
    path: filePath,
    meta: { imports, lineCount: raw.split('\n').length, sourceKey: dedupePathKey(filePath) },
    raw
  }
}

export function parseAgentsMd(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const imports = extractAtImports(raw)
  // AGENTS.md is a cross-agent open standard scanned by both adapters. Carry a
  // `dedupeKey` + `readByAgentIds` so the engine can collapse the duplicate rows
  // (`mergeSharedConventions`), and use a DETERMINISTIC id (not `makeId()`'s
  // `Date.now()`) so the canonical row's id stays stable across scans — the id is
  // an opaque handle for renderer selection / raw refetch (GH-113 T1).
  const sourceKey = dedupePathKey(filePath)
  return {
    id: assetEntityId('agents-md', scope, filePath),
    agentId: 'claude-code',
    category: 'instruction',
    type: 'agents-md',
    scope,
    name: path.basename(filePath),
    path: filePath,
    meta: { imports, lineCount: raw.split('\n').length, dedupeKey: sourceKey, sourceKey, readByAgentIds: ['claude-code'] },
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

function skillNameFromPath(filePath: string): string {
  const base = path.basename(filePath, path.extname(filePath))
  // For the canonical `<name>/SKILL.md` form the filename is meaningless; the
  // skill's identity is its parent directory.
  return base === 'SKILL' ? path.basename(path.dirname(filePath)) : base
}

export function parseSkill(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  return {
    id: makeId('skill'),
    agentId: 'claude-code',
    category: 'instruction',
    type: 'skill',
    scope,
    name: (frontmatter?.name as string) ?? skillNameFromPath(filePath),
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
  if (path.extname(filePath).toLowerCase() === '.md') {
    const { frontmatter, body } = splitFrontmatter(raw)
    const meta = {
      ...(frontmatter ?? {}),
      bodyLength: body.length
    }
    return {
      id: makeId('agent'),
      agentId: 'claude-code',
      category: 'instruction',
      type: 'agent',
      scope,
      name: (frontmatter?.name as string) ?? path.basename(filePath, path.extname(filePath)),
      path: filePath,
      meta,
      raw
    }
  }

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

/**
 * MCP servers configured per-project inside `~/.claude.json` under
 * `projects["<dir>"].mcpServers` (written by `claude mcp add` at project scope).
 * These are project-scoped and carry their owning project path in meta.
 */
export function parseClaudeJsonProjectMcp(filePath: string): Asset[] {
  const assets: Asset[] = []
  let config: { projects?: Record<string, { mcpServers?: Record<string, Record<string, unknown>> }> }
  try {
    config = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return assets
  }
  const projects = config.projects ?? {}
  for (const [projectPath, projectConfig] of Object.entries(projects)) {
    const servers = projectConfig?.mcpServers ?? {}
    for (const [name, serverConfig] of Object.entries(servers)) {
      assets.push({
        id: makeId('mcp-server'),
        agentId: 'claude-code',
        category: 'capability',
        type: 'mcp-server',
        scope: 'project',
        name,
        path: filePath,
        meta: { serverConfig, source: filePath, projectPath }
      })
    }
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
  statusLine?: unknown
  subagentStatusLine?: unknown
  disableAllHooks?: boolean
  [key: string]: unknown
}

export interface ParseHooksOptions {
  sidecarPath?: string
  onSidecarError?: (error: Error, sidecarPath: string) => void
}

interface ClaudeDisabledHookEntry {
  agentId: 'claude-code'
  sourcePath: string
  scope: 'user'
  event: string
  mode: 'nested' | 'direct'
  matcher?: string
  scenarioHash: string
  containerTemplate?: Record<string, unknown>
  hook: Record<string, unknown>
  hookHash: string
  removedCount: number
  disabledAt: string
}

export function parseHooks(filePath: string, scope: AssetScope, options: ParseHooksOptions = {}): Asset[] {
  const settings = readSettingsJson(filePath)
  const assets = new Map<string, Asset>()
  if (settings?.hooks) {
    for (const [event, handlers] of Object.entries(settings.hooks)) {
      if (!Array.isArray(handlers)) continue

      handlers.forEach((handler, handlerIndex) => {
        const handlerRecord = isRecord(handler) ? handler : {}
        const matcher = typeof handlerRecord.matcher === 'string' ? handlerRecord.matcher : undefined
        const nestedHooks = Array.isArray(handlerRecord.hooks) ? handlerRecord.hooks : [handlerRecord]
        const mode = Array.isArray(handlerRecord.hooks) ? 'nested' : 'direct'
        const scenarioHash = buildHookScenarioHash(event, matcher)

        nestedHooks.forEach((hook, hookIndex) => {
          const hookRecord = isRecord(hook) ? hook : {}
          const command = typeof hookRecord.command === 'string' ? hookRecord.command : undefined
          const hookType = readString(hookRecord, 'type') ?? (command ? 'command' : 'unknown')
          const entryPaths = command ? extractCommandEntryPaths(filePath, command, { scope }) : []
          const hookHash = buildHookHash(hookRecord)
          const hookKey = buildHookKey('claude-code', event, matcher, hookRecord)
          const assetKey = `${scenarioHash}:${hookHash}`
          const occurrence = { handlerIndex, hookIndex, mode }
          const existing = assets.get(assetKey)
          if (existing) {
            const occurrences = Array.isArray(existing.meta.occurrences)
              ? existing.meta.occurrences
              : []
            const existingEntryPaths = Array.isArray(existing.meta.entryPaths)
              ? existing.meta.entryPaths.filter((value): value is string => typeof value === 'string')
              : []
            existing.meta.occurrences = [...occurrences, occurrence]
            existing.meta.occurrenceCount = occurrences.length + 1
            existing.meta.entryPaths = uniqueStrings([...existingEntryPaths, ...entryPaths])
            return
          }
          assets.set(assetKey, {
            id: makeId('hook'),
            agentId: 'claude-code',
            category: 'capability',
            type: 'hook',
            scope,
            name: command ?? `${event} hook ${handlerIndex + 1}`,
            path: filePath,
            meta: {
              provider: 'claude-code',
              event,
              eventType: event,
              matcher,
              command,
              hookType,
              ...readCommonHookConfig(hookRecord),
              ...readTypedHookConfig(hookRecord),
              rawHook: cloneJson(hookRecord),
              entryPaths,
              occurrences: [occurrence],
              occurrenceCount: 1,
              hookKey,
              scenarioHash,
              hookHash,
              enabled: true,
              effectiveEnabled: true,
              canToggleHook: scope === 'user',
              toggleStrategy: scope === 'user' ? 'soft-remove' : 'read-only',
              stateSourcePath: filePath,
              source: filePath
            }
          })
        })
      })
    }
  }
  appendDisabledClaudeHooks(assets, filePath, scope, options)
  return Array.from(assets.values())
}

function appendDisabledClaudeHooks(
  assets: Map<string, Asset>,
  filePath: string,
  scope: AssetScope,
  options: ParseHooksOptions
): void {
  if (scope !== 'user') return
  const sidecarPath = options.sidecarPath ?? path.join(path.dirname(filePath), '.berth', 'hooks-state.json')
  if (!fs.existsSync(sidecarPath)) return

  let entries: ClaudeDisabledHookEntry[]
  try {
    entries = readClaudeDisabledHookEntries(sidecarPath)
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error))
    if (options.onSidecarError) {
      options.onSidecarError(normalized, sidecarPath)
      return
    }
    throw normalized
  }

  for (const entry of entries) {
    if (!samePath(entry.sourcePath, filePath)) continue
    const hookHash = entry.hookHash || buildHookHash(entry.hook)
    const scenarioHash = entry.scenarioHash || buildHookScenarioHash(entry.event, entry.matcher)
    const assetKey = `${scenarioHash}:${hookHash}`
    if (assets.has(assetKey)) continue

    const command = typeof entry.hook.command === 'string' ? entry.hook.command : undefined
    const hookType = readString(entry.hook, 'type') ?? (command ? 'command' : 'unknown')
    const entryPaths = command ? extractCommandEntryPaths(entry.sourcePath, command, { scope }) : []
    assets.set(assetKey, {
      id: makeId('hook'),
      agentId: 'claude-code',
      category: 'capability',
      type: 'hook',
      scope,
      name: command ?? `${entry.event} hook`,
      path: entry.sourcePath,
      meta: {
        provider: 'claude-code',
        event: entry.event,
        eventType: entry.event,
        matcher: entry.matcher,
        command,
        hookType,
        ...readCommonHookConfig(entry.hook),
        ...readTypedHookConfig(entry.hook),
        rawHook: cloneJson(entry.hook),
        entryPaths,
        occurrences: [],
        occurrenceCount: Math.max(1, entry.removedCount),
        hookKey: buildHookKey('claude-code', entry.event, entry.matcher, entry.hook),
        scenarioHash,
        hookHash,
        enabled: false,
        effectiveEnabled: false,
        canToggleHook: true,
        toggleStrategy: 'soft-remove',
        stateSourcePath: sidecarPath,
        source: entry.sourcePath,
        disabledByBerth: true,
        disabledAt: entry.disabledAt,
        removedCount: entry.removedCount,
        containerTemplate: entry.containerTemplate
      }
    })
  }
}

function readClaudeDisabledHookEntries(sidecarPath: string): ClaudeDisabledHookEntry[] {
  const parsed = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'))
  if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.disabled)) {
    throw new Error('Invalid Claude hooks state file')
  }

  const entries: ClaudeDisabledHookEntry[] = []
  for (const [key, value] of Object.entries(parsed.disabled)) {
    const entry = parseClaudeDisabledHookEntry(value)
    if (!entry) throw new Error(`Invalid Claude hooks state entry: ${key}`)
    entries.push(entry)
  }
  return entries
}

function parseClaudeDisabledHookEntry(value: unknown): ClaudeDisabledHookEntry | null {
  if (!isRecord(value)) return null
  if (value.agentId !== 'claude-code' || value.scope !== 'user') return null
  if (value.mode !== 'nested' && value.mode !== 'direct') return null
  if (
    typeof value.sourcePath !== 'string' ||
    typeof value.event !== 'string' ||
    typeof value.scenarioHash !== 'string' ||
    typeof value.hookHash !== 'string' ||
    typeof value.disabledAt !== 'string' ||
    !isRecord(value.hook)
  ) {
    return null
  }
  return {
    agentId: 'claude-code',
    sourcePath: value.sourcePath,
    scope: 'user',
    event: value.event,
    mode: value.mode,
    matcher: typeof value.matcher === 'string' ? value.matcher : undefined,
    scenarioHash: value.scenarioHash,
    containerTemplate: isRecord(value.containerTemplate) ? value.containerTemplate : undefined,
    hook: value.hook,
    hookHash: value.hookHash,
    removedCount: typeof value.removedCount === 'number' && Number.isFinite(value.removedCount)
      ? value.removedCount
      : 1,
    disabledAt: value.disabledAt
  }
}

/**
 * Path equality consistent with the filesystem's case semantics. Only fold case
 * on Windows (case-insensitive); case-sensitive filesystems must compare exactly.
 * Uses `toLowerCase` (not locale-aware `toLocaleLowerCase`, which mangles e.g.
 * the Turkish dotted-İ). Mirrors `normalizePath` in scanner.ts.
 */
export function samePath(left: string, right: string, platform: NodeJS.Platform = process.platform): boolean {
  const a = path.resolve(left)
  const b = path.resolve(right)
  return platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
}

function readCommonHookConfig(hookRecord: Record<string, unknown>): Record<string, unknown> {
  return pruneUndefined({
    ifCondition: readString(hookRecord, 'if'),
    timeout: readNumber(hookRecord, 'timeout'),
    statusMessage: readString(hookRecord, 'statusMessage'),
    once: readBoolean(hookRecord, 'once')
  })
}

function readTypedHookConfig(hookRecord: Record<string, unknown>): Record<string, unknown> {
  return pruneUndefined({
    args: readStringArray(hookRecord.args),
    async: readBoolean(hookRecord, 'async'),
    asyncRewake: readBoolean(hookRecord, 'asyncRewake'),
    shell: readString(hookRecord, 'shell'),
    url: readString(hookRecord, 'url'),
    headers: isRecord(hookRecord.headers) ? cloneJson(hookRecord.headers) : undefined,
    allowedEnvVars: readStringArray(hookRecord.allowedEnvVars),
    server: readString(hookRecord, 'server'),
    tool: readString(hookRecord, 'tool'),
    input: isRecord(hookRecord.input) ? cloneJson(hookRecord.input) : undefined,
    prompt: readString(hookRecord, 'prompt'),
    model: readString(hookRecord, 'model')
  })
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
// Status line settings
// ---------------------------------------------------------------------------

export function parseStatuslinesFromSettings(filePath: string, scope: AssetScope): Asset[] {
  const settings = readSettingsJson(filePath)
  if (!settings) return []

  const raw = readRawFile(filePath)
  const disabledByDisableAllHooks = settings.disableAllHooks === true
  return [
    parseStatuslineSetting(filePath, scope, settings.statusLine, 'statusLine', 'main', disabledByDisableAllHooks, raw),
    parseStatuslineSetting(
      filePath,
      scope,
      settings.subagentStatusLine,
      'subagentStatusLine',
      'subagent',
      disabledByDisableAllHooks,
      raw
    )
  ].filter((asset): asset is Asset => asset != null)
}

function parseStatuslineSetting(
  filePath: string,
  scope: AssetScope,
  setting: unknown,
  settingKey: 'statusLine' | 'subagentStatusLine',
  statusLineKind: 'main' | 'subagent',
  disabledByDisableAllHooks: boolean,
  raw: string | undefined
): Asset | null {
  if (!isRecord(setting)) return null

  const commandType = readString(setting, 'type')
  const command = readString(setting, 'command')
  if (!commandType && !command) return null

  const padding = readNumber(setting, 'padding')
  const refreshInterval = readNumber(setting, 'refreshInterval')
  const hideVimModeIndicator = readBoolean(setting, 'hideVimModeIndicator')
  const entryPaths = command ? extractCommandEntryPaths(filePath, command, { scope }) : []

  return {
    id: makeId('statusline'),
    agentId: 'claude-code',
    category: 'capability',
    type: 'statusline',
    scope,
    name: settingKey === 'statusLine' ? 'Status Line' : 'Subagent Status Line',
    path: filePath,
    meta: {
      provider: 'claude-code',
      settingKey,
      statusLineKind,
      commandType: commandType ?? 'command',
      command,
      padding,
      refreshInterval,
      hideVimModeIndicator,
      disabledByDisableAllHooks,
      entryPaths,
      source: filePath
    },
    raw
  }
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
  const raw = readRawFile(filePath)
  return {
    id: makeId('statusline'),
    agentId: 'claude-code',
    category: 'capability',
    type: 'statusline',
    scope,
    name: path.basename(filePath),
    path: filePath,
    meta: {
      provider: 'claude-code',
      legacyFile: true,
      source: filePath
    },
    raw
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
  let usageStartedAt: string | undefined
  let usageEndedAt: string | undefined
  let title: string | undefined
  let model: string | undefined
  let projectPath: string | undefined
  let sawUsage = false
  let messageTokenUsage = emptyTokenUsage()
  let legacyTokenUsage = emptyTokenUsage()
  let totalCost: number | undefined
  let fileHistoryCount = 0
  let malformedLineCount = 0
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
        malformedLineCount += 1
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
          if (legacyTokens != null) legacyTokenUsage = normalizeTokenUsage({ totalTokens: legacyTokens })
        }
      }

      const message = isRecord(parsed.message) ? parsed.message : undefined
      model = readString(message, 'model') ?? model
      const usage = isRecord(message?.usage) ? message.usage : undefined
      if (usage) {
        sawUsage = true
        if (timestamp) {
          usageStartedAt ??= timestamp
          usageEndedAt = timestamp
        }
        messageTokenUsage = addTokenUsage(messageTokenUsage, normalizeTokenUsage(usage))
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
  } catch (err) {
    // Surface read/stat failure instead of silently returning a blank session.
    meta.parseError = err instanceof Error ? err.message : String(err)
  }

  const resolvedProjectPath = projectPath ?? decodeClaudeProjectDir(projectName)
  const project = projectNameFromPath(resolvedProjectPath, projectName)
  const duration = calculateDurationSeconds(firstTimestamp, lastTimestamp)
  const usageDuration = calculateDurationSeconds(usageStartedAt, usageEndedAt)
  const hookCountsObject = Object.fromEntries(hookEventCounts)
  const tokenUsage = sawUsage ? messageTokenUsage : legacyTokenUsage

  meta.sessionId = sessionId
  meta.project = project
  meta.projectPath = resolvedProjectPath
  meta.title = title
  meta.model = model
  meta.startedAt = firstTimestamp
  meta.endedAt = lastTimestamp
  meta.duration = duration
  meta.usageStartedAt = usageStartedAt
  meta.usageEndedAt = usageEndedAt
  meta.usageDuration = usageDuration
  meta.totalTokens = tokenUsage.totalTokens
  meta.tokenUsage = tokenUsage
  meta.hasUsage = tokenUsage.totalTokens > 0
  meta.skillsUsed = Array.from(skillsUsed).sort()
  meta.mcpServers = Array.from(mcpServers).sort()
  meta.hooksFired = Array.from(hookEventCounts.values()).reduce((sum, count) => sum + count, 0)
  meta.hookEventCounts = hookCountsObject
  meta.fileHistoryCount = fileHistoryCount
  if (malformedLineCount > 0) meta.malformedLineCount = malformedLineCount
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

function readBoolean(record: unknown, key: string): boolean | undefined {
  if (!isRecord(record)) return undefined
  const value = record[key]
  return typeof value === 'boolean' ? value : undefined
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

function readRawFile(filePath: string): string | undefined {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const strings = value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  return strings.length > 0 ? strings : undefined
}

function pruneUndefined(record: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) next[key] = value
  }
  return next
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
