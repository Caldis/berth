import * as fs from 'fs'
import * as path from 'path'
import { parse as parseToml } from 'smol-toml'
import {
  emptyTokenUsage,
  normalizeTokenUsage,
  TOKEN_BREAKDOWN_ALIAS_KEYS
} from '@shared/token-usage'
import { buildHookHash, buildHookKey, buildHookScenarioHash } from '@shared/hook-identity'
import { assetEntityId, dedupePathKey } from '@shared/asset-dedupe'
import { extractCommandEntryPaths } from '../command-entry-paths'
import { stampSourceKey, stampSourceKeys } from '../source-key'
import {
  firstString,
  isRecord,
  readBoolean,
  readNumber,
  readString,
  readValidDateString,
  safeId,
  uniqueStrings
} from '../_shared/parser-helpers'
import { extractAtImports, splitFrontmatter } from '../_shared/markdown'
import { extractPaths, parseMcpToolName, upsertFile } from '../_shared/session-artifacts'
import { calculateDurationSeconds, projectNameFromPath } from '../_shared/session-meta'
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

interface ParseCodexSessionMetaOptions {
  titleIndex?: ReadonlyMap<string, string>
}

const CODEX_SESSION_TITLE_MAX_LENGTH = 120

export function parseCodexToml(filePath: string): Record<string, unknown> {
  const parsed = parseToml(fs.readFileSync(filePath, 'utf-8'))
  return isRecord(parsed) ? parsed : {}
}

export function parseCodexConfig(filePath: string, scope: AssetScope): Asset[] {
  const config = parseCodexToml(filePath)
  const hookState = readCodexHookState(config)
  return stampSourceKeys([
    ...parseCodexMcpServers(filePath, scope, config),
    ...parseCodexHooks(filePath, scope, asRecord(config.hooks), hookState, filePath),
    ...parseCodexStatusLine(filePath, scope, config)
  ])
}

export function parseCodexCustomAgent(filePath: string, scope: AssetScope): Asset {
  const config = parseCodexToml(filePath)
  const name = readString(config, 'name') ?? path.basename(filePath, '.toml')
  return stampSourceKey({
    id: assetEntityId('agent', scope, filePath),
    agentId: 'codex',
    category: 'instruction',
    type: 'agent',
    scope,
    name,
    path: filePath,
    meta: config
  })
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
  return stampSourceKeys(parseCodexHooks(filePath, scope, hooks, effectiveHookState, adjacentConfigPath))
}

export function parseCodexAgentsMd(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const imports = extractAtImports(raw)
  // Same physical file as Claude's AGENTS.md — carry the identical `dedupeKey`
  // (computed by the shared helper) so `mergeSharedConventions` collapses the two
  // rows, and record this adapter in `readByAgentIds` (GH-113 T1).
  const sourceKey = dedupePathKey(filePath)
  return {
    id: assetEntityId('agents-md', scope, filePath),
    agentId: 'codex',
    category: 'instruction',
    type: 'agents-md',
    scope,
    name: path.basename(filePath),
    path: filePath,
    meta: {
      imports,
      lineCount: raw.split('\n').length,
      dedupeKey: sourceKey,
      sourceKey,
      readByAgentIds: ['codex']
    },
    raw
  }
}

export function parseCodexSkill(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  const skillDir = path.basename(path.dirname(filePath))
  return stampSourceKey({
    id: assetEntityId('skill', scope, filePath),
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
  })
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
      id: assetEntityId('mcp-server', scope, filePath, name),
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
        const hookType = readString(hookRecord, 'type') ?? (command ? 'command' : 'unknown')
        const asyncHook = readBoolean(hookRecord, 'async')
        const timeout = readNumber(hookRecord, 'timeout')
        const statusMessage = readString(hookRecord, 'statusMessage') ?? readString(hookRecord, 'status_message')
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
          id: assetEntityId('hook', scope, filePath, `${scenarioHash}:${hookHash}`),
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
            timeout,
            statusMessage,
            prompt: readString(hookRecord, 'prompt'),
            model: readString(hookRecord, 'model'),
            rawHook: cloneJson(hookRecord),
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
      id: assetEntityId('statusline', scope, filePath, 'tui'),
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

export function readCodexSessionTitleIndex(codexDir: string): Map<string, string> {
  const result = new Map<string, string>()
  try {
    for (const record of readJsonLines(path.join(codexDir, 'session_index.jsonl'))) {
      const id = readString(record, 'id')
      const title = normalizeSessionTitle(firstString(record, ['thread_name', 'threadName', 'name', 'title']))
      if (id && title) result.set(id, title)
    }
  } catch {
    // Codex does not always create the index; rollout parsing should still work.
  }
  return result
}

export function parseCodexSessionMeta(filePath: string, options: ParseCodexSessionMetaOptions = {}): Asset {
  const fallbackSessionId = path.basename(filePath, '.jsonl')
  let sessionId = fallbackSessionId
  let firstTimestamp: string | undefined
  let lastTimestamp: string | undefined
  let usageStartedAt: string | undefined
  let usageEndedAt: string | undefined
  let title: string | undefined
  let model: string | undefined
  let projectPath: string | undefined
  let tokenUsage = emptyTokenUsage()
  const skillsUsed = new Set<string>()
  const mcpServers = new Set<string>()
  const hookEventCounts = new Map<string, number>()

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
            normalizeSessionTitle(firstString(payload, ['thread_name', 'threadName', 'name', 'title'])) ??
            title
        }
        if (payloadType === 'token_count') {
          const candidate = readTokenUsage(payload)
          if (candidate.totalTokens >= tokenUsage.totalTokens) tokenUsage = candidate
          if (timestamp && candidate.totalTokens > 0) {
            usageStartedAt ??= timestamp
            usageEndedAt = timestamp
          }
        }
        const hookEvent = readCodexHookEventFromEvent(payload, payloadType)
        if (hookEvent) {
          addHookCount(hookEventCounts, hookEvent.event, hookEvent.count)
        }
      }

      if (type === 'response_item') {
        const itemType = readString(payload, 'type')
        if (isCodexToolCall(itemType)) {
          const args = readToolArguments(payload)
          const name = readToolName(payload, itemType)
          const mcp = parseMcpToolName(name)
          if (mcp) mcpServers.add(mcp.server)
          const skillName = readCodexSkillName(name, args)
          if (skillName) skillsUsed.add(skillName)
          const hookEvent = readCodexHookEventFromTool(name, args)
          if (hookEvent) addHookCount(hookEventCounts, hookEvent, 1)
        }
      }
    }
  } catch {
    // Active Codex rollout files can be locked; return the best metadata we have.
  }

  const resolvedProjectPath = projectPath ?? ''
  const project = projectNameFromPath(resolvedProjectPath, 'Codex')
  const duration = calculateDurationSeconds(firstTimestamp, lastTimestamp)
  const usageDuration = calculateDurationSeconds(usageStartedAt, usageEndedAt)
  const hookCountsObject = Object.fromEntries(hookEventCounts)
  const resolvedTitle = options.titleIndex?.get(sessionId) ?? title

  meta.sessionId = sessionId
  meta.project = project
  meta.projectPath = resolvedProjectPath
  meta.title = resolvedTitle
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

  return {
    id: `codex-session-${sessionId}-${hashString(filePath)}`,
    agentId: 'codex',
    category: 'state',
    type: 'session',
    scope: 'session',
    name: resolvedTitle ?? `Codex Session ${sessionId.slice(0, 8)}`,
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

export function isCodexToolCall(itemType: string | undefined): boolean {
  return (
    itemType === 'function_call' ||
    itemType === 'custom_tool_call' ||
    itemType === 'tool_search_call' ||
    itemType === 'web_search_call'
  )
}

export function isCodexToolOutput(itemType: string | undefined): boolean {
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

export function readToolName(payload: Record<string, unknown>, itemType: string | undefined): string {
  return (
    firstString(payload, ['name', 'tool_name', 'toolName', 'callable_name', 'callableName']) ??
    itemType ??
    'tool'
  )
}

export function readToolArguments(payload: Record<string, unknown>): Record<string, unknown> {
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

function readCodexSkillName(toolName: string, args: Record<string, unknown>): string | undefined {
  const normalized = toolName.toLowerCase()
  if (normalized === 'skill' || normalized === 'load_skill' || normalized === 'use_skill') {
    return firstString(args, ['skill', 'skill_name', 'skillName', 'name'])
  }
  if (!normalized.startsWith('skill__')) return undefined
  const suffix = toolName.slice('skill__'.length).split('__')[0]?.trim()
  return suffix || firstString(args, ['skill', 'skill_name', 'skillName', 'name'])
}

function readCodexHookEventFromTool(
  toolName: string,
  args: Record<string, unknown>
): string | undefined {
  const normalized = toolName.toLowerCase()
  if (!normalized.includes('hook')) return undefined
  return firstString(args, [
    'hook_event_name',
    'hookEventName',
    'event',
    'event_name',
    'hookEvent',
    'type'
  ]) ?? toolName
}

function readCodexHookEventFromEvent(
  payload: Record<string, unknown>,
  payloadType: string | undefined
): { event: string; count: number } | undefined {
  const explicitHookEvent = firstString(payload, [
    'hook_event_name',
    'hookEventName',
    'hookEvent'
  ])
  const payloadIsHookEvent = payloadType?.toLowerCase().includes('hook') === true
  const isHookEvent = Boolean(explicitHookEvent) || payloadIsHookEvent
  if (!isHookEvent) return undefined
  const event = explicitHookEvent ?? firstString(payload, ['event', 'event_name']) ?? payloadType
  if (!event) return undefined
  return {
    event,
    count: readPositiveCount(payload) ?? 1
  }
}

function readPositiveCount(record: Record<string, unknown>): number | undefined {
  const value =
    readNumber(record, 'hookCount') ??
    readNumber(record, 'hook_count') ??
    readNumber(record, 'count')
  if (value == null || value <= 0) return undefined
  return Math.max(1, Math.floor(value))
}

function addHookCount(counts: Map<string, number>, event: string, count: number): void {
  counts.set(event, (counts.get(event) ?? 0) + count)
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
  for (const [key, value] of Object.entries(record)) {
    if (
      typeof value === 'number' &&
      TOKEN_BREAKDOWN_ALIAS_KEYS.includes(key) &&
      Number.isFinite(value)
    ) {
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

function normalizeSessionTitle(value: string | undefined): string | undefined {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined
  return truncate(normalized, CODEX_SESSION_TITLE_MAX_LENGTH)
}

function hashString(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

