import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { parse as parseToml } from 'smol-toml'
import { emptyTokenUsage, normalizeTokenUsage } from '@shared/token-usage'
import { buildHookHash, buildHookKey, buildHookScenarioHash } from '@shared/hook-identity'
import { extractCommandEntryPaths } from '../command-entry-paths'
import type { Asset, AssetScope } from '../types'
import type { TokenUsageBreakdown } from '@shared/types/asset'
import type {
  SessionArtifactFile,
  SessionArtifactPlan,
  SessionArtifactTodo,
  SessionArtifacts,
  SessionToolEvent,
  SessionToolEventCategory
} from '@shared/types/ipc'

export interface ParsedCodexSessionDetail {
  toolTimeline: SessionToolEvent[]
  artifacts: SessionArtifacts
}

export interface CodexHookStateEntry {
  enabled?: boolean
}

export type CodexHookState = Record<string, CodexHookStateEntry>

export function parseCodexToml(filePath: string): Record<string, unknown> {
  const parsed = parseToml(fs.readFileSync(filePath, 'utf-8'))
  return isRecord(parsed) ? parsed : {}
}

export function parseCodexConfig(filePath: string, scope: AssetScope): Asset[] {
  const config = parseCodexToml(filePath)
  const hookState = readCodexHookState(config)
  return [
    ...parseCodexMcpServers(filePath, scope, config),
    ...parseCodexHooks(filePath, scope, asRecord(config.hooks), hookState, filePath),
    ...parseCodexStatusLine(filePath, scope, config)
  ]
}

export function parseCodexCustomAgent(filePath: string, scope: AssetScope): Asset {
  const config = parseCodexToml(filePath)
  const name = readString(config, 'name') ?? path.basename(filePath, '.toml')
  return {
    id: `codex-agent-${safeId(name)}-${hashString(filePath)}`,
    agentId: 'codex',
    category: 'instruction',
    type: 'agent',
    scope,
    name,
    path: filePath,
    meta: config
  }
}

export function parseCodexHooksJson(
  filePath: string,
  scope: AssetScope,
  hookState?: CodexHookState,
  stateSourcePath?: string
): Asset[] {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const parsed: unknown = JSON.parse(raw)
  const root = asRecord(parsed)
  if (!root) return []
  const hooks = asRecord(root.hooks) ?? root
  const adjacentConfigPath = stateSourcePath ?? path.join(path.dirname(filePath), 'config.toml')
  const effectiveHookState = hookState ?? readCodexHookStateFromConfig(adjacentConfigPath)
  return parseCodexHooks(filePath, scope, hooks, effectiveHookState, adjacentConfigPath)
}

export function parseCodexAgentsMd(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const imports = extractAtImports(raw)
  return {
    id: `codex-agents-md-${safeId(scope)}-${hashString(filePath)}`,
    agentId: 'codex',
    category: 'instruction',
    type: 'agents-md',
    scope,
    name: path.basename(filePath),
    path: filePath,
    meta: { imports, lineCount: raw.split('\n').length },
    raw
  }
}

export function parseCodexSkill(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  const skillDir = path.basename(path.dirname(filePath))
  return {
    id: `codex-skill-${safeId((frontmatter?.name as string | undefined) ?? skillDir)}-${hashString(filePath)}`,
    agentId: 'codex',
    category: 'instruction',
    type: 'skill',
    scope,
    name: (frontmatter?.name as string | undefined) ?? skillDir,
    path: filePath,
    meta: {
      ...(frontmatter ?? {}),
      bodyLength: body.length
    },
    raw
  }
}

interface MutableArtifacts {
  plans: Map<string, SessionArtifactPlan>
  todos: Map<string, SessionArtifactTodo>
  files: Map<string, SessionArtifactFile>
}

function parseCodexMcpServers(
  filePath: string,
  scope: AssetScope,
  config: Record<string, unknown>
): Asset[] {
  const servers = asRecord(config.mcp_servers)
  if (!servers) return []
  return Object.entries(servers)
    .filter(([, serverConfig]) => isRecord(serverConfig))
    .map(([name, serverConfig]) => ({
      id: `codex-mcp-server-${safeId(name)}-${hashString(filePath)}`,
      agentId: 'codex',
      category: 'capability',
      type: 'mcp-server',
      scope,
      name,
      path: filePath,
      meta: {
        serverConfig,
        source: filePath
      }
    }))
}

function parseCodexHooks(
  filePath: string,
  scope: AssetScope,
  hooks: Record<string, unknown> | undefined,
  hookState: CodexHookState = {},
  stateSourcePath?: string
): Asset[] {
  if (!hooks) return []
  const assets = new Map<string, Asset>()

  for (const [event, handlers] of Object.entries(hooks)) {
    if (isCodexHookMetadataKey(event)) continue
    const handlerList = Array.isArray(handlers) ? handlers : [handlers]
    handlerList.forEach((handler, handlerIndex) => {
      const handlerRecord = asRecord(handler) ?? {}
      const matcher = readString(handlerRecord, 'matcher')
      const nestedHooks = Array.isArray(handlerRecord.hooks)
        ? handlerRecord.hooks
        : [handlerRecord]
      const mode = Array.isArray(handlerRecord.hooks) ? 'nested' : 'direct'
      const scenarioHash = buildHookScenarioHash(event, matcher)

      nestedHooks.forEach((hook, hookIndex) => {
        const hookRecord = asRecord(hook) ?? {}
        const command = readString(hookRecord, 'command')
        const commandWindows =
          readString(hookRecord, 'commandWindows') ?? readString(hookRecord, 'command_windows')
        const hookType = readString(hookRecord, 'type')
        const asyncHook = readBoolean(hookRecord, 'async')
        const managed = readBoolean(hookRecord, 'managed') ?? readBoolean(handlerRecord, 'managed')
        const hookHash = buildHookHash(hookRecord)
        const scenarioHookKey = buildHookKey('codex', event, matcher, hookRecord)
        const legacyHookKey = buildCodexHookKey(filePath, event, handlerIndex, hookIndex)
        const stateEnabled =
          readBoolean(hookState[scenarioHookKey], 'enabled') ??
          readBoolean(hookState[legacyHookKey], 'enabled')
        const enabled = stateEnabled ?? readHookEnabled(hookRecord) ?? true
        const entryPaths = extractCommandEntryPaths(filePath, [command, commandWindows], { scope })
        const supportNote = readCodexHookSupportNote(hookType, asyncHook)
        const assetKey = `${scenarioHash}:${hookHash}`
        const occurrence = { handlerIndex, hookIndex, mode, legacyHookKey }
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
          existing.meta.enabled = existing.meta.enabled !== false || enabled
          existing.meta.effectiveEnabled = existing.meta.effectiveEnabled !== false || enabled
          return
        }
        assets.set(assetKey, {
          id: `codex-hook-${safeId(event)}-${safeId(scenarioHash)}-${safeId(hookHash)}-${hashString(filePath)}`,
          agentId: 'codex',
          category: 'capability',
          type: 'hook',
          scope,
          name: command ?? `${event} hook ${handlerIndex + 1}`,
          path: filePath,
          meta: {
            provider: 'codex',
            event,
            eventType: event,
            matcher,
            command,
            commandWindows,
            hookType,
            async: asyncHook,
            managed,
            enabled,
            effectiveEnabled: enabled,
            canToggleHook: scope === 'user' && managed !== true,
            toggleStrategy: scope === 'user' && managed !== true ? 'native-state' : 'read-only',
            hookKey: scenarioHookKey,
            legacyHookKey,
            scenarioHash,
            hookHash,
            stateSourcePath,
            entryPaths,
            supportNote,
            occurrences: [occurrence],
            occurrenceCount: 1,
            source: filePath
          }
        })
      })
    })
  }

  return Array.from(assets.values())
}

export function readCodexHookStateFromConfig(filePath: string): CodexHookState {
  if (!fs.existsSync(filePath)) return {}
  return readCodexHookState(parseCodexToml(filePath))
}

function readCodexHookState(config: Record<string, unknown>): CodexHookState {
  const hooks = asRecord(config.hooks)
  const state = asRecord(hooks?.state)
  if (!state) return {}

  const result: CodexHookState = {}
  for (const [key, value] of Object.entries(state)) {
    if (!isRecord(value)) continue
    const enabled = readBoolean(value, 'enabled')
    if (enabled != null) result[key] = { enabled }
  }
  return result
}

function isCodexHookMetadataKey(key: string): boolean {
  return ['state', 'managed_dir', 'windows_managed_dir'].includes(key)
}

const CODEX_STATUS_LINE_ITEMS = new Set([
  'model',
  'model-name',
  'model-with-reasoning',
  'current-dir',
  'project-name',
  'project',
  'project-root',
  'git-branch',
  'pull-request-number',
  'branch-changes',
  'run-state',
  'status',
  'permissions',
  'approval-mode',
  'approval',
  'context-remaining',
  'context-used',
  'context-usage',
  'five-hour-limit',
  'weekly-limit',
  'codex-version',
  'context-window-size',
  'used-tokens',
  'total-input-tokens',
  'total-output-tokens',
  'thread-id',
  'session-id',
  'fast-mode',
  'raw-output',
  'thread-title',
  'task-progress'
])

function parseCodexStatusLine(
  filePath: string,
  scope: AssetScope,
  config: Record<string, unknown>
): Asset[] {
  const tui = asRecord(config.tui)
  if (!tui || !Array.isArray(tui.status_line)) return []

  const items = tui.status_line.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  const knownItems = items.filter((item) => CODEX_STATUS_LINE_ITEMS.has(item))
  const unknownItems = items.filter((item) => !CODEX_STATUS_LINE_ITEMS.has(item))
  const useThemeColors = readBoolean(tui, 'status_line_use_colors')

  return [
    {
      id: `codex-statusline-${safeId(scope)}-${hashString(filePath)}`,
      agentId: 'codex',
      category: 'capability',
      type: 'statusline',
      scope,
      name: 'TUI Status Line',
      path: filePath,
      meta: {
        provider: 'codex',
        settingKey: 'tui.status_line',
        statusLineKind: 'footer-items',
        items,
        knownItems,
        unknownItems,
        hidden: items.length === 0,
        useThemeColors: useThemeColors ?? true,
        source: filePath
      },
      raw: fs.readFileSync(filePath, 'utf-8')
    }
  ]
}

function readCodexHookSupportNote(hookType: string | undefined, asyncHook: boolean | undefined): string | undefined {
  if (hookType && hookType !== 'command') return 'capabilities.hooks.management.codexUnsupportedHookType'
  if (asyncHook === true) return 'capabilities.hooks.management.codexAsyncHookSkipped'
  return undefined
}

function readHookEnabled(hookRecord: Record<string, unknown>): boolean | undefined {
  const enabled = readBoolean(hookRecord, 'enabled')
  if (enabled != null) return enabled
  const disabled = readBoolean(hookRecord, 'disabled')
  return disabled == null ? undefined : !disabled
}

function buildCodexHookKey(
  filePath: string,
  event: string,
  handlerIndex: number,
  hookIndex: number
): string {
  return `${filePath}:${toSnakeCase(event)}:${handlerIndex}:${hookIndex}`
}

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()
}

function extractAtImports(content: string): string[] {
  const results: string[] = []
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (/^@[\w./\\]/.test(trimmed)) {
      results.push(trimmed.slice(1).trim())
    }
  }
  return results
}

function splitFrontmatter(raw: string): {
  frontmatter: Record<string, unknown> | null
  body: string
} {
  if (!raw.startsWith('---')) return { frontmatter: null, body: raw }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { frontmatter: null, body: raw }
  const yamlText = raw.slice(3, end).trim()
  const body = raw.slice(end + 4)
  try {
    const parsed = yaml.load(yamlText)
    return {
      frontmatter: isRecord(parsed) ? parsed : null,
      body
    }
  } catch {
    return { frontmatter: null, body }
  }
}

export function parseCodexSessionMeta(filePath: string): Asset {
  const fallbackSessionId = path.basename(filePath, '.jsonl')
  let sessionId = fallbackSessionId
  let firstTimestamp: string | undefined
  let lastTimestamp: string | undefined
  let title: string | undefined
  let model: string | undefined
  let projectPath: string | undefined
  let tokenUsage = emptyTokenUsage()

  const meta: Record<string, unknown> = {
    sessionId,
    transcriptPath: filePath
  }

  try {
    const stat = fs.statSync(filePath)
    meta.sizeBytes = stat.size
    meta.modifiedAt = stat.mtime.toISOString()

    for (const record of readJsonLines(filePath)) {
      const timestamp = readValidDateString(record, 'timestamp')
      if (timestamp) {
        firstTimestamp ??= timestamp
        lastTimestamp = timestamp
      }

      const type = readString(record, 'type')
      const payload = isRecord(record.payload) ? record.payload : {}
      const payloadType = readString(payload, 'type')

      if (type === 'session_meta') {
        const payloadId = readString(payload, 'id')
        if (payloadId) sessionId = payloadId
        projectPath = readString(payload, 'cwd') ?? projectPath
        model = readString(payload, 'model') ?? model
        const cliVersion = readString(payload, 'cli_version') ?? readString(payload, 'cliVersion')
        if (cliVersion) meta.cliVersion = cliVersion
      }

      if (type === 'turn_context') {
        projectPath = readString(payload, 'cwd') ?? projectPath
        model = readString(payload, 'model') ?? model
      }

      if (type === 'event_msg') {
        if (payloadType === 'thread_name_updated') {
          title =
            firstString(payload, ['thread_name', 'threadName', 'name', 'title']) ??
            title
        }
        if (payloadType === 'token_count') {
          const candidate = readTokenUsage(payload)
          if (candidate.totalTokens >= tokenUsage.totalTokens) tokenUsage = candidate
        }
      }
    }
  } catch {
    // Active Codex rollout files can be locked; return the best metadata we have.
  }

  const resolvedProjectPath = projectPath ?? ''
  const project = projectNameFromPath(resolvedProjectPath, 'Codex')
  const duration = calculateDurationSeconds(firstTimestamp, lastTimestamp)

  meta.sessionId = sessionId
  meta.project = project
  meta.projectPath = resolvedProjectPath
  meta.title = title
  meta.model = model
  meta.startedAt = firstTimestamp
  meta.endedAt = lastTimestamp
  meta.duration = duration
  meta.totalTokens = tokenUsage.totalTokens
  meta.tokenUsage = tokenUsage
  meta.hasUsage = tokenUsage.totalTokens > 0
  meta.skillsUsed = []
  meta.mcpServers = []
  meta.hooksFired = 0
  meta.hookEventCounts = {}

  return {
    id: `codex-session-${sessionId}-${hashString(filePath)}`,
    agentId: 'codex',
    category: 'state',
    type: 'session',
    scope: 'session',
    name: title ?? `Codex Session ${sessionId.slice(0, 8)}`,
    path: filePath,
    meta
  }
}

export function parseCodexSessionDetail(filePath: string): ParsedCodexSessionDetail {
  const toolTimeline: SessionToolEvent[] = []
  const byCallId = new Map<string, SessionToolEvent>()
  const artifacts = createMutableArtifacts()
  let sequence = 0

  try {
    for (const record of readJsonLines(filePath)) {
      const timestamp = readValidDateString(record, 'timestamp') ?? null
      const type = readString(record, 'type')
      const payload = isRecord(record.payload) ? record.payload : {}

      if (type === 'response_item') {
        const itemType = readString(payload, 'type')
        if (isCodexToolCall(itemType)) {
          const args = readToolArguments(payload)
          const name = readToolName(payload, itemType)
          const callId =
            readString(payload, 'call_id') ??
            readString(payload, 'callId') ??
            readString(payload, 'id') ??
            `codex-call-${sequence}`
          const filePaths = uniqueStrings([
            ...extractPaths(args),
            ...extractPatchPaths(args)
          ])
          const mcp = parseMcpToolName(name)
          const event: SessionToolEvent = {
            id: `codex-tool-${sequence++}`,
            callId,
            name,
            category: classifyCodexTool(name, itemType),
            status: 'pending',
            startedAt: timestamp,
            endedAt: null,
            summary: summarizeCodexTool(name, args),
            filePaths,
            mcpServer: mcp?.server,
            mcpTool: mcp?.tool
          }
          toolTimeline.push(event)
          byCallId.set(callId, event)
          recordArtifactsFromCodexTool(artifacts, event, args)
        } else if (isCodexToolOutput(itemType)) {
          const callId =
            readString(payload, 'call_id') ??
            readString(payload, 'callId') ??
            readString(payload, 'id')
          if (!callId) continue
          const event = byCallId.get(callId)
          if (!event) continue
          event.status = payload.is_error === true ? 'error' : 'success'
          event.endedAt = timestamp
          event.durationMs = readToolOutputDurationMs(payload)
        }
      }

      if (type === 'event_msg') {
        const eventType = readString(payload, 'type')
        if (eventType === 'patch_apply_end') {
          const filePaths = uniqueStrings(extractPaths(payload))
          for (const filePath of filePaths) upsertFile(artifacts, filePath, 'patch')
          toolTimeline.push({
            id: `codex-tool-${sequence++}`,
            name: 'apply_patch',
            category: 'file',
            status: payload.success === false || payload.exit_code === 1 ? 'error' : 'success',
            startedAt: timestamp,
            endedAt: timestamp,
            summary: filePaths.length > 0 ? `${filePaths.length} file${filePaths.length === 1 ? '' : 's'}` : undefined,
            filePaths
          })
        } else if (eventType === 'mcp_tool_call_end') {
          const name = firstString(payload, ['tool', 'name']) ?? 'mcp_tool_call'
          const server = firstString(payload, ['server', 'server_name', 'serverName'])
          toolTimeline.push({
            id: `codex-tool-${sequence++}`,
            name,
            category: 'mcp',
            status: payload.is_error === true ? 'error' : 'success',
            startedAt: timestamp,
            endedAt: timestamp,
            summary: server,
            filePaths: [],
            mcpServer: server,
            mcpTool: name
          })
        } else if (eventType === 'web_search_end') {
          toolTimeline.push({
            id: `codex-tool-${sequence++}`,
            name: 'web_search',
            category: 'web',
            status: payload.is_error === true ? 'error' : 'success',
            startedAt: timestamp,
            endedAt: timestamp,
            summary: firstString(payload, ['query']),
            filePaths: []
          })
        }
      }
    }
  } catch {
    // Active Codex rollout files can be locked; keep the page usable.
  }

  return {
    toolTimeline,
    artifacts: {
      plans: Array.from(artifacts.plans.values()),
      todos: Array.from(artifacts.todos.values()),
      files: Array.from(artifacts.files.values()),
      checkpoints: []
    }
  }
}

function readJsonLines(filePath: string): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = []
  const raw = fs.readFileSync(filePath, 'utf-8')
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const parsed: unknown = JSON.parse(line)
      if (isRecord(parsed)) records.push(parsed)
    } catch {
      // Ignore partial or malformed rollout lines.
    }
  }
  return records
}

function isCodexToolCall(itemType: string | undefined): boolean {
  return (
    itemType === 'function_call' ||
    itemType === 'custom_tool_call' ||
    itemType === 'tool_search_call' ||
    itemType === 'web_search_call'
  )
}

function isCodexToolOutput(itemType: string | undefined): boolean {
  return (
    itemType === 'function_call_output' ||
    itemType === 'custom_tool_call_output' ||
    itemType === 'tool_search_output' ||
    itemType === 'web_search_output'
  )
}

function readToolOutputDurationMs(payload: Record<string, unknown>): number | null {
  const directMs = readNonNegativeFiniteNumber(payload, 'duration_ms')
  if (directMs != null) return Math.round(directMs)

  const directSeconds = readNonNegativeFiniteNumber(payload, 'duration_seconds')
  if (directSeconds != null) return Math.round(directSeconds * 1000)

  const output = payload.output
  const parsedOutput = typeof output === 'string' ? parseMaybeJson(output) : output
  const metadata = isRecord(parsedOutput) && isRecord(parsedOutput.metadata)
    ? parsedOutput.metadata
    : isRecord(payload.metadata)
      ? payload.metadata
      : undefined

  if (!metadata) return null

  const metadataMs = readNonNegativeFiniteNumber(metadata, 'duration_ms')
  if (metadataMs != null) return Math.round(metadataMs)

  const metadataSeconds = readNonNegativeFiniteNumber(metadata, 'duration_seconds')
  return metadataSeconds == null ? null : Math.round(metadataSeconds * 1000)
}

function readNonNegativeFiniteNumber(
  record: Record<string, unknown>,
  key: string
): number | undefined {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined
  return value
}

function readToolName(payload: Record<string, unknown>, itemType: string | undefined): string {
  return (
    firstString(payload, ['name', 'tool_name', 'toolName', 'callable_name', 'callableName']) ??
    itemType ??
    'tool'
  )
}

function readToolArguments(payload: Record<string, unknown>): Record<string, unknown> {
  for (const key of ['arguments', 'args', 'input']) {
    const value = payload[key]
    if (isRecord(value)) return value
    if (typeof value === 'string') {
      const parsed = parseMaybeJson(value)
      if (isRecord(parsed)) return parsed
      return { text: value }
    }
  }
  return {}
}

function recordArtifactsFromCodexTool(
  artifacts: MutableArtifacts,
  event: SessionToolEvent,
  args: Record<string, unknown>
): void {
  if (event.name === 'update_plan' && Array.isArray(args.plan)) {
    args.plan.forEach((item, index) => {
      if (!isRecord(item)) return
      const title = firstString(item, ['step', 'title', 'content'])
      if (!title) return
      const status = firstString(item, ['status'])
      artifacts.todos.set(`plan-${index}-${safeId(title)}`, {
        id: `plan-${index}-${safeId(title)}`,
        title,
        done: status === 'completed'
      })
    })
    artifacts.plans.set(`plan-${event.id}`, {
      id: `plan-${event.id}`,
      title: `${args.plan.length} plan item${args.plan.length === 1 ? '' : 's'}`,
      path: ''
    })
  }

  for (const filePath of event.filePaths) {
    upsertFile(artifacts, filePath, operationForCodexTool(event.name))
  }
}

function classifyCodexTool(
  name: string,
  itemType: string | undefined
): SessionToolEventCategory {
  if (parseMcpToolName(name)) return 'mcp'
  if (name === 'update_plan') return 'task'
  if (name.includes('agent') || name === 'spawn_agent' || name === 'wait_agent') return 'agent'
  if (itemType === 'tool_search_call' || name.includes('search')) return 'search'
  if (itemType === 'web_search_call' || name.includes('web_search')) return 'web'
  if (name === 'apply_patch' || name.includes('patch') || name.includes('file')) return 'file'
  return 'builtin'
}

function summarizeCodexTool(name: string, args: Record<string, unknown>): string | undefined {
  if (name === 'shell_command') return truncate(firstString(args, ['command']) ?? '', 120)
  if (name === 'update_plan' && Array.isArray(args.plan)) {
    return `${args.plan.length} plan item${args.plan.length === 1 ? '' : 's'}`
  }
  const paths = uniqueStrings([...extractPaths(args), ...extractPatchPaths(args)])
  if (paths.length > 0) return paths.slice(0, 3).join(', ')
  return firstString(args, ['query', 'message', 'text'])
}

function extractPatchPaths(args: Record<string, unknown>): string[] {
  const text = firstString(args, ['text', 'patch', 'input'])
  if (!text) return []
  const paths: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/)
    if (match?.[1]) paths.push(match[1].trim())
  }
  return paths
}

function operationForCodexTool(name: string): string {
  if (name === 'apply_patch') return 'patch'
  if (name === 'shell_command') return 'shell'
  return name
}

function createMutableArtifacts(): MutableArtifacts {
  return {
    plans: new Map(),
    todos: new Map(),
    files: new Map()
  }
}

function upsertFile(artifacts: MutableArtifacts, filePath: string, operation?: string): void {
  if (!filePath.trim()) return
  const existing = artifacts.files.get(filePath)
  if (existing) {
    existing.count += 1
    if (!existing.operation && operation) existing.operation = operation
    return
  }
  artifacts.files.set(filePath, {
    id: `file-${safeId(filePath)}`,
    path: filePath,
    operation,
    count: 1
  })
}

function extractPaths(value: unknown): string[] {
  const paths: string[] = []
  collectPaths(value, paths)
  return uniqueStrings(paths)
}

function collectPaths(value: unknown, paths: string[], keyHint?: string): void {
  if (typeof value === 'string') {
    if (keyHint && isPathKey(keyHint) && value.trim()) paths.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPaths(item, paths, keyHint)
    return
  }
  if (!isRecord(value)) return
  for (const [key, nested] of Object.entries(value)) {
    collectPaths(nested, paths, key)
  }
}

function isPathKey(key: string): boolean {
  return [
    'path',
    'paths',
    'file',
    'files',
    'filePath',
    'file_path',
    'filepath',
    'absolutePath',
    'absolute_path',
    'relativePath',
    'relative_path'
  ].includes(key)
}

function parseMcpToolName(name: string): { server: string; tool: string } | undefined {
  if (!name.startsWith('mcp__')) return undefined
  const rest = name.slice('mcp__'.length)
  const separator = rest.indexOf('__')
  if (separator <= 0) return undefined
  return {
    server: rest.slice(0, separator),
    tool: rest.slice(separator + 2)
  }
}

function readTokenUsage(payload: Record<string, unknown>): TokenUsageBreakdown {
  const info = isRecord(payload.info) ? payload.info : undefined
  const direct = normalizeTokenUsage(payload)
  if (info) {
    const nested = normalizeTokenUsage({ ...readNestedTokenRecord(info), ...info })
    if (nested.hasBreakdown) {
      const totalTokens = Math.max(direct.totalTokens, nested.totalTokens)
      return normalizeTokenUsage({ ...nested, totalTokens })
    }
  }
  if (direct.totalTokens > 0) return direct
  return normalizeTokenUsage(readNestedTokenRecord(payload))
}

function readNestedTokenRecord(record: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {}
  const tokenKeys = [
    'input_tokens',
    'output_tokens',
    'cached_input_tokens',
    'cache_read_input_tokens',
    'cache_creation_input_tokens',
    'reasoning_output_tokens'
  ]
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'number' && tokenKeys.includes(key) && Number.isFinite(value)) {
      result[key] = (result[key] ?? 0) + value
    } else if (isRecord(value)) {
      const nested = readNestedTokenRecord(value)
      for (const [nestedKey, nestedValue] of Object.entries(nested)) {
        result[nestedKey] = (result[nestedKey] ?? 0) + nestedValue
      }
    }
  }
  return result
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return undefined
}

function readString(record: unknown, key: string): string | undefined {
  if (!isRecord(record)) return undefined
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : undefined
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

function projectNameFromPath(projectPath: string, fallback: string): string {
  if (!projectPath) return fallback
  const trimmed = projectPath.replace(/[\\/]+$/, '')
  return path.win32.basename(trimmed) || path.posix.basename(trimmed) || fallback
}

function parseMaybeJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function truncate(value: string, maxLength: number): string | undefined {
  if (!value.trim()) return undefined
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

function safeId(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'unknown'
}

function hashString(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}
