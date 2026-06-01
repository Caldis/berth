import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'
import { buildHookHash, buildHookScenarioHash } from '@shared/hook-identity'
import type {
  SetHookEnabledRequest,
  SetHookEnabledResult,
  HooksAgentId,
  HooksEnablementStatus,
  SetHooksEnabledRequest,
  SetHooksEnabledResult
} from '@shared/types/ipc'

const hookFileLocks = new Set<string>()

interface AgentHookCapabilityPlugin {
  agentId: HooksAgentId
  setHookEnabled: (request: SetHookEnabledRequest, homeDir: string) => SetHookEnabledResult
}

export function getAgentHooksStatus(agentId: HooksAgentId, homeDir = os.homedir()): HooksEnablementStatus {
  if (agentId === 'claude-code') return getClaudeHooksStatus(homeDir)
  return getCodexHooksStatus(homeDir)
}

export function getAgentHooksStatuses(
  agentId: HooksAgentId,
  homeDir = os.homedir(),
  projectDir?: string
): HooksEnablementStatus[] {
  const statuses = [getAgentHooksStatus(agentId, homeDir)]
  if (!projectDir) return statuses
  statuses.push(agentId === 'claude-code'
    ? getClaudeProjectHooksStatus(projectDir)
    : getCodexProjectHooksStatus(projectDir))
  return statuses
}

export function setAgentHooksEnabled(
  request: SetHooksEnabledRequest,
  homeDir = os.homedir()
): SetHooksEnabledResult {
  if (request.scope !== 'user') {
    throw new Error(`Unsupported hooks scope: ${request.scope}`)
  }

  const before = getAgentHooksStatus(request.agentId, homeDir)
  if (!before.supported) {
    throw new Error(before.reason ?? `Hooks enablement is not supported for ${request.agentId}`)
  }

  if (request.agentId === 'claude-code') {
    writeClaudeHooksEnabled(homeDir, request.enabled)
  } else {
    writeCodexHooksEnabled(homeDir, request.enabled)
  }

  const status = getAgentHooksStatus(request.agentId, homeDir)
  return {
    status,
    changed: before.enabled !== status.enabled
  }
}

export function setHookEnabled(
  request: SetHookEnabledRequest,
  homeDir = os.homedir()
): SetHookEnabledResult {
  if (request.scope !== 'user') {
    throw new Error(`Unsupported hook state scope: ${request.scope}`)
  }
  if (!request.hookKey.trim()) {
    throw new Error('Hook state requires a hook key')
  }
  if (request.managed === true) {
    throw new Error('managed hooks cannot be changed from user hook state')
  }
  const plugin = hookCapabilityPlugins.find((item) => item.agentId === request.agentId)
  if (plugin) return plugin.setHookEnabled(request, homeDir)
  throw new Error(`Single hook enablement is not supported for ${request.agentId}`)
}

const hookCapabilityPlugins: AgentHookCapabilityPlugin[] = [
  {
    agentId: 'claude-code',
    setHookEnabled: setClaudeHookEnabled
  },
  {
    agentId: 'codex',
    setHookEnabled: setCodexHookEnabled
  }
]

function setCodexHookEnabled(
  request: SetHookEnabledRequest,
  homeDir: string
): SetHookEnabledResult {
  const sourcePath = path.join(homeDir, '.codex', 'config.toml')
  const config = readTomlObject(sourcePath) ?? {}
  const hooks = isRecord(config.hooks) ? config.hooks : {}
  const state = isRecord(hooks.state) ? hooks.state : {}
  const existingState = isRecord(state[request.hookKey]) ? state[request.hookKey] as Record<string, unknown> : {}
  const beforeEnabled = readBoolean(existingState, 'enabled') ?? true

  state[request.hookKey] = {
    ...existingState,
    enabled: request.enabled
  }
  hooks.state = state
  config.hooks = hooks
  writeTextFile(sourcePath, stringifyToml(config))

  return {
    hookKey: request.hookKey,
    enabled: request.enabled,
    changed: beforeEnabled !== request.enabled,
    sourcePath
  }
}

interface ParsedHookKey {
  scenarioHash: string
  hookHash: string
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

interface ClaudeHooksStateFile {
  version: 1
  disabled: Record<string, ClaudeDisabledHookEntry>
}

interface RemovedClaudeHook {
  event: string
  mode: 'nested' | 'direct'
  matcher?: string
  containerTemplate?: Record<string, unknown>
  hook: Record<string, unknown>
}

function setClaudeHookEnabled(
  request: SetHookEnabledRequest,
  homeDir: string
): SetHookEnabledResult {
  const sourcePath = path.join(homeDir, '.claude', 'settings.json')
  if (!samePath(request.sourcePath, sourcePath)) {
    throw new Error('Claude Code single hook changes only support the user settings.json source')
  }

  return withHookFileLock(sourcePath, () => {
    const hookKey = parseHookKey(request.hookKey, 'claude-code')
    return request.enabled
      ? restoreClaudeHook(request, sourcePath, hookKey)
      : disableClaudeHook(request, sourcePath, hookKey, homeDir)
  })
}

function disableClaudeHook(
  request: SetHookEnabledRequest,
  sourcePath: string,
  hookKey: ParsedHookKey,
  homeDir: string
): SetHookEnabledResult {
  const sidecarPath = getClaudeHookStatePath(homeDir)
  const state = readClaudeHooksState(sidecarPath)
  const settings = readJsonObject(sourcePath) ?? {}
  const removed = removeClaudeHookMatches(settings, hookKey.scenarioHash, hookKey.hookHash)

  if (removed.length === 0) {
    if (state.disabled[request.hookKey]) {
      return {
        hookKey: request.hookKey,
        enabled: false,
        changed: false,
        sourcePath
      }
    }
    throw new Error('Claude Code hook no longer exists in the target scenario')
  }

  state.disabled[request.hookKey] = buildClaudeDisabledHookEntry(
    sourcePath,
    hookKey,
    removed
  )
  writeJsonFile(sidecarPath, state)
  writeJsonFile(sourcePath, settings)

  return {
    hookKey: request.hookKey,
    enabled: false,
    changed: true,
    sourcePath
  }
}

function restoreClaudeHook(
  request: SetHookEnabledRequest,
  sourcePath: string,
  hookKey: ParsedHookKey
): SetHookEnabledResult {
  const sidecarPath = path.join(path.dirname(sourcePath), '.berth', 'hooks-state.json')
  const state = readClaudeHooksState(sidecarPath)
  const entry = state.disabled[request.hookKey]
  const settings = readJsonObject(sourcePath) ?? {}

  if (!entry) {
    if (hasClaudeHook(settings, hookKey.scenarioHash, hookKey.hookHash)) {
      return {
        hookKey: request.hookKey,
        enabled: true,
        changed: false,
        sourcePath
      }
    }
    throw new Error('Claude Code hook restore point was not found')
  }

  const inserted = insertClaudeHook(settings, entry)
  delete state.disabled[request.hookKey]

  if (inserted) writeJsonFile(sourcePath, settings)
  writeJsonFile(sidecarPath, state)

  return {
    hookKey: request.hookKey,
    enabled: true,
    changed: true,
    sourcePath
  }
}

function getClaudeHooksStatus(homeDir: string): HooksEnablementStatus {
  const sourcePath = path.join(homeDir, '.claude', 'settings.json')
  const settings = readJsonObject(sourcePath)
  return {
    agentId: 'claude-code',
    agentName: 'Claude Code',
    scope: 'user',
    enabled: settings?.disableAllHooks !== true,
    sourcePath,
    sourceExists: fs.existsSync(sourcePath),
    supported: true,
    writable: true
  }
}

function getCodexHooksStatus(homeDir: string): HooksEnablementStatus {
  const sourcePath = path.join(homeDir, '.codex', 'config.toml')
  const config = readTomlObject(sourcePath)
  const features = isRecord(config?.features) ? config.features : undefined
  return {
    agentId: 'codex',
    agentName: 'Codex',
    scope: 'user',
    enabled: features?.hooks !== false,
    sourcePath,
    sourceExists: fs.existsSync(sourcePath),
    supported: true,
    writable: true
  }
}

function getClaudeProjectHooksStatus(projectDir: string): HooksEnablementStatus {
  const sourcePath = path.join(projectDir, '.claude', 'settings.json')
  const settings = readJsonObject(sourcePath)
  return {
    agentId: 'claude-code',
    agentName: 'Claude Code',
    scope: 'project',
    enabled: settings?.disableAllHooks !== true,
    sourcePath,
    sourceExists: fs.existsSync(sourcePath),
    supported: true,
    writable: false,
    reasonKey: 'capabilities.hooks.management.projectReadOnly'
  }
}

function getCodexProjectHooksStatus(projectDir: string): HooksEnablementStatus {
  const sourcePath = path.join(projectDir, '.codex', 'config.toml')
  const config = readTomlObject(sourcePath)
  const features = isRecord(config?.features) ? config.features : undefined
  return {
    agentId: 'codex',
    agentName: 'Codex',
    scope: 'project',
    enabled: features?.hooks !== false,
    sourcePath,
    sourceExists: fs.existsSync(sourcePath),
    supported: true,
    writable: false,
    reasonKey: 'capabilities.hooks.management.projectReadOnly'
  }
}

function writeClaudeHooksEnabled(homeDir: string, enabled: boolean): void {
  const sourcePath = path.join(homeDir, '.claude', 'settings.json')
  const settings = readJsonObject(sourcePath) ?? {}
  settings.disableAllHooks = !enabled
  writeJsonFile(sourcePath, settings)
}

function writeCodexHooksEnabled(homeDir: string, enabled: boolean): void {
  const sourcePath = path.join(homeDir, '.codex', 'config.toml')
  const config = readTomlObject(sourcePath) ?? {}
  const features = isRecord(config.features) ? config.features : {}
  features.hooks = enabled
  config.features = features
  writeTextFile(sourcePath, stringifyToml(config))
}

function readJsonObject(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null
  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  if (!isRecord(parsed)) throw new Error(`${filePath} must contain a JSON object`)
  return parsed
}

function readTomlObject(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null
  const parsed = parseToml(fs.readFileSync(filePath, 'utf-8'))
  if (!isRecord(parsed)) throw new Error(`${filePath} must contain a TOML object`)
  return parsed
}

function writeJsonFile(filePath: string, value: unknown): void {
  writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function writeTextFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, `${filePath}.bak`)
    fs.copyFileSync(filePath, timestampBackupPath(filePath))
  }
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tempPath, content)
  try {
    fs.renameSync(tempPath, filePath)
  } catch (error) {
    fs.rmSync(tempPath, { force: true })
    throw error
  }
}

function getClaudeHookStatePath(homeDir: string): string {
  return path.join(homeDir, '.claude', '.berth', 'hooks-state.json')
}

function timestampBackupPath(filePath: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${filePath}.${stamp}.bak`
}

function parseHookKey(hookKey: string, expectedProvider: HooksAgentId): ParsedHookKey {
  const parts = hookKey.split(':')
  if (parts.length !== 3 || parts[0] !== expectedProvider || !parts[1] || !parts[2]) {
    throw new Error(`Invalid ${expectedProvider} hook key`)
  }
  return {
    scenarioHash: parts[1],
    hookHash: parts[2]
  }
}

function readClaudeHooksState(sidecarPath: string): ClaudeHooksStateFile {
  if (!fs.existsSync(sidecarPath)) return { version: 1, disabled: {} }
  const parsed = readJsonObject(sidecarPath)
  if (!parsed || parsed.version !== 1 || !isRecord(parsed.disabled)) {
    throw new Error('Invalid Claude hooks state file')
  }
  const disabled: Record<string, ClaudeDisabledHookEntry> = {}
  for (const [key, value] of Object.entries(parsed.disabled)) {
    const entry = parseClaudeDisabledHookEntry(value)
    if (!entry) throw new Error(`Invalid Claude hooks state entry: ${key}`)
    disabled[key] = entry
  }
  return { version: 1, disabled }
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

function buildClaudeDisabledHookEntry(
  sourcePath: string,
  hookKey: ParsedHookKey,
  removed: RemovedClaudeHook[]
): ClaudeDisabledHookEntry {
  const first = removed[0]
  return {
    agentId: 'claude-code',
    sourcePath,
    scope: 'user',
    event: first.event,
    mode: first.mode,
    matcher: first.matcher,
    scenarioHash: hookKey.scenarioHash,
    containerTemplate: first.containerTemplate,
    hook: first.hook,
    hookHash: hookKey.hookHash,
    removedCount: removed.length,
    disabledAt: new Date().toISOString()
  }
}

function removeClaudeHookMatches(
  settings: Record<string, unknown>,
  scenarioHash: string,
  hookHash: string
): RemovedClaudeHook[] {
  const hooks = isRecord(settings.hooks) ? settings.hooks : undefined
  if (!hooks) return []
  const removed: RemovedClaudeHook[] = []

  for (const [event, handlers] of Object.entries(hooks)) {
    if (!Array.isArray(handlers)) continue
    for (let handlerIndex = handlers.length - 1; handlerIndex >= 0; handlerIndex -= 1) {
      const handler = handlers[handlerIndex]
      const handlerRecord = isRecord(handler) ? handler : {}
      const matcher = typeof handlerRecord.matcher === 'string' ? handlerRecord.matcher : undefined
      if (buildHookScenarioHash(event, matcher) !== scenarioHash) continue

      if (Array.isArray(handlerRecord.hooks)) {
        const childHooks = handlerRecord.hooks
        for (let hookIndex = childHooks.length - 1; hookIndex >= 0; hookIndex -= 1) {
          const hookRecord = isRecord(childHooks[hookIndex]) ? childHooks[hookIndex] : {}
          if (buildHookHash(hookRecord) !== hookHash) continue
          removed.unshift({
            event,
            mode: 'nested',
            matcher,
            containerTemplate: withoutHooks(handlerRecord),
            hook: cloneJson(hookRecord)
          })
          childHooks.splice(hookIndex, 1)
        }
        if (childHooks.length === 0) handlers.splice(handlerIndex, 1)
        continue
      }

      if (buildHookHash(handlerRecord) !== hookHash) continue
      removed.unshift({
        event,
        mode: 'direct',
        matcher,
        hook: cloneJson(handlerRecord)
      })
      handlers.splice(handlerIndex, 1)
    }
    if (handlers.length === 0) delete hooks[event]
  }

  return removed
}

function insertClaudeHook(settings: Record<string, unknown>, entry: ClaudeDisabledHookEntry): boolean {
  if (hasClaudeHook(settings, entry.scenarioHash, entry.hookHash)) return false
  const hooks = isRecord(settings.hooks) ? settings.hooks : {}
  settings.hooks = hooks
  const handlers = Array.isArray(hooks[entry.event]) ? hooks[entry.event] as unknown[] : []
  hooks[entry.event] = handlers
  const count = Math.max(1, entry.removedCount)

  if (entry.mode === 'direct') {
    for (let index = 0; index < count; index += 1) handlers.push(cloneJson(entry.hook))
    return true
  }

  const targetHandler = findNestedClaudeScenarioHandler(handlers, entry.event, entry.matcher)
    ?? createNestedClaudeScenarioHandler(handlers, entry)
  const childHooks = targetHandler.hooks as unknown[]
  for (let index = 0; index < count; index += 1) childHooks.push(cloneJson(entry.hook))
  return true
}

function hasClaudeHook(
  settings: Record<string, unknown>,
  scenarioHash: string,
  hookHash: string
): boolean {
  const hooks = isRecord(settings.hooks) ? settings.hooks : undefined
  if (!hooks) return false
  for (const [event, handlers] of Object.entries(hooks)) {
    if (!Array.isArray(handlers)) continue
    for (const handler of handlers) {
      const handlerRecord = isRecord(handler) ? handler : {}
      const matcher = typeof handlerRecord.matcher === 'string' ? handlerRecord.matcher : undefined
      if (buildHookScenarioHash(event, matcher) !== scenarioHash) continue
      const childHooks = Array.isArray(handlerRecord.hooks) ? handlerRecord.hooks : [handlerRecord]
      for (const hook of childHooks) {
        const hookRecord = isRecord(hook) ? hook : {}
        if (buildHookHash(hookRecord) === hookHash) return true
      }
    }
  }
  return false
}

function findNestedClaudeScenarioHandler(
  handlers: unknown[],
  event: string,
  matcher: string | undefined
): Record<string, unknown> | null {
  const scenarioHash = buildHookScenarioHash(event, matcher)
  for (const handler of handlers) {
    if (!isRecord(handler) || !Array.isArray(handler.hooks)) continue
    const handlerMatcher = typeof handler.matcher === 'string' ? handler.matcher : undefined
    if (buildHookScenarioHash(event, handlerMatcher) === scenarioHash) return handler
  }
  return null
}

function createNestedClaudeScenarioHandler(
  handlers: unknown[],
  entry: ClaudeDisabledHookEntry
): Record<string, unknown> {
  const handler = isRecord(entry.containerTemplate)
    ? cloneJson(entry.containerTemplate)
    : {}
  if (entry.matcher !== undefined) handler.matcher = entry.matcher
  handler.hooks = []
  handlers.push(handler)
  return handler
}

function withoutHooks(record: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (key !== 'hooks') next[key] = cloneJson(value)
  }
  return next
}

function withHookFileLock<T>(filePath: string, fn: () => T): T {
  const key = path.resolve(filePath).toLocaleLowerCase()
  if (hookFileLocks.has(key)) {
    throw new Error(`Hook source is already being modified: ${filePath}`)
  }
  hookFileLocks.add(key)
  try {
    return fn()
  } finally {
    hookFileLocks.delete(key)
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function samePath(left: string, right: string): boolean {
  return path.resolve(left).toLocaleLowerCase() === path.resolve(right).toLocaleLowerCase()
}

function readBoolean(record: unknown, key: string): boolean | undefined {
  if (!isRecord(record)) return undefined
  const value = record[key]
  return typeof value === 'boolean' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}
