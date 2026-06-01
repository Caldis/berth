import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'
import { buildHookHash, buildHookScenarioHash } from '@shared/hook-identity'
import type {
  ClearHookRecoveryRequest,
  ClearHookRecoveryResult,
  HookRecoveryIssue,
  HookRecoveryListResult,
  HookRecoveryPoint,
  HookRecoveryStatus,
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
  setHookEnabled: (request: SetHookEnabledRequest, homeDir: string, options: HookManagerOptions) => SetHookEnabledResult
}

interface HookManagerOptions {
  onBeforeClaudeSettingsWrite?: (context: {
    filePath: string
    attempt: number
    operation: 'disable' | 'restore'
  }) => void
}

class HookSourceChangedError extends Error {
  constructor(filePath: string) {
    super(`Claude Code hook source changed while Berth was updating it: ${filePath}`)
    this.name = 'HookSourceChangedError'
  }
}

class HookTargetConflictError extends Error {
  constructor() {
    super('Claude Code hook target changed or was removed before Berth could update it')
    this.name = 'HookTargetConflictError'
  }
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
  homeDir = os.homedir(),
  options: HookManagerOptions = {}
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
  if (plugin) return plugin.setHookEnabled(request, homeDir, options)
  throw new Error(`Single hook enablement is not supported for ${request.agentId}`)
}

export function getHookRecoveries(homeDir = os.homedir()): HookRecoveryListResult {
  const sidecarPath = getClaudeHookStatePath(homeDir)
  if (!fs.existsSync(sidecarPath)) return { points: [], issues: [] }

  try {
    const { state } = readClaudeHooksStateWithText(sidecarPath)
    const points = Object.entries(state.disabled)
      .map(([hookKey, entry]) => toClaudeHookRecoveryPoint(hookKey, entry))
      .sort(compareHookRecoveryPoints)
    return { points, issues: [] }
  } catch (error) {
    return {
      points: [],
      issues: [toHookRecoveryIssue(sidecarPath, formatErrorMessage(error))]
    }
  }
}

export function clearHookRecovery(
  request: ClearHookRecoveryRequest,
  homeDir = os.homedir()
): ClearHookRecoveryResult {
  if (request.agentId !== 'claude-code') {
    throw new Error(`Hook recovery cleanup is not supported for ${request.agentId}`)
  }
  if (!request.hookKey.trim()) {
    throw new Error('Hook recovery cleanup requires a hook key')
  }
  parseHookKey(request.hookKey, 'claude-code')

  const sidecarPath = getClaudeHookStatePath(homeDir)
  return withHookFileLock(sidecarPath, () => {
    const sidecar = readClaudeHooksStateWithText(sidecarPath)
    const entry = sidecar.state.disabled[request.hookKey]
    if (!entry) {
      return {
        hookKey: request.hookKey,
        sourcePath: request.sourcePath,
        changed: false
      }
    }
    if (!samePath(entry.sourcePath, request.sourcePath)) {
      throw new Error('Claude Code hook recovery source does not match the selected restore point')
    }

    delete sidecar.state.disabled[request.hookKey]
    writeJsonFileIfUnchanged(sidecarPath, sidecar.state, sidecar.text)
    return {
      hookKey: request.hookKey,
      sourcePath: request.sourcePath,
      changed: true
    }
  })
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
  homeDir: string,
  _options: HookManagerOptions
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

function toClaudeHookRecoveryPoint(hookKey: string, entry: ClaudeDisabledHookEntry): HookRecoveryPoint {
  const inspection = inspectClaudeRecoverySource(entry)
  const hookType = typeof entry.hook.type === 'string' ? entry.hook.type : 'unknown'
  const command = hookRecoveryCommand(entry.hook)

  return {
    hookKey,
    agentId: 'claude-code',
    agentName: 'Claude Code',
    sourcePath: entry.sourcePath,
    scope: 'user',
    event: entry.event,
    matcher: entry.matcher,
    hookType,
    command,
    summary: hookRecoverySummary(entry.hook),
    createdAt: entry.disabledAt,
    status: inspection.status,
    message: inspection.message
  }
}

function inspectClaudeRecoverySource(entry: ClaudeDisabledHookEntry): {
  status: HookRecoveryStatus
  message?: string
} {
  if (!fs.existsSync(entry.sourcePath)) {
    return {
      status: 'source-missing',
      message: `Source file is missing: ${entry.sourcePath}`
    }
  }

  try {
    const settings = readJsonObject(entry.sourcePath) ?? {}
    if (hasClaudeHook(settings, entry.scenarioHash, entry.hookHash)) {
      return {
        status: 'already-restored',
        message: 'An equivalent hook already exists in the source file.'
      }
    }
    return {
      status: 'recoverable',
      message: 'This restore point can be written back to the source file.'
    }
  } catch (error) {
    return {
      status: 'invalid',
      message: formatErrorMessage(error)
    }
  }
}

function toHookRecoveryIssue(sourcePath: string, message: string): HookRecoveryIssue {
  return {
    agentId: 'claude-code',
    sourcePath,
    severity: 'error',
    message
  }
}

function compareHookRecoveryPoints(left: HookRecoveryPoint, right: HookRecoveryPoint): number {
  return left.sourcePath.localeCompare(right.sourcePath) ||
    left.event.localeCompare(right.event) ||
    (left.matcher ?? '').localeCompare(right.matcher ?? '') ||
    left.hookKey.localeCompare(right.hookKey)
}

function hookRecoveryCommand(hook: Record<string, unknown>): string | undefined {
  if (typeof hook.command === 'string' && hook.command.trim()) return hook.command
  if (typeof hook.url === 'string' && hook.url.trim()) return hook.url
  if (typeof hook.server === 'string' && typeof hook.tool === 'string') return `${hook.server}.${hook.tool}`
  if (typeof hook.prompt === 'string' && hook.prompt.trim()) return truncateInline(hook.prompt, 120)
  return undefined
}

function hookRecoverySummary(hook: Record<string, unknown>): string {
  return hookRecoveryCommand(hook) ?? truncateInline(JSON.stringify(hook), 120)
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
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
  homeDir: string,
  options: HookManagerOptions
): SetHookEnabledResult {
  const sourcePath = path.join(homeDir, '.claude', 'settings.json')
  if (!samePath(request.sourcePath, sourcePath)) {
    throw new Error('Claude Code single hook changes only support the user settings.json source')
  }

  return withHookFileLock(sourcePath, () => {
    const hookKey = parseHookKey(request.hookKey, 'claude-code')
    return withClaudeHookRetry((attempt) => request.enabled
      ? restoreClaudeHook(request, sourcePath, hookKey, options, attempt)
      : disableClaudeHook(request, sourcePath, hookKey, homeDir, options, attempt)
    )
  })
}

function disableClaudeHook(
  request: SetHookEnabledRequest,
  sourcePath: string,
  hookKey: ParsedHookKey,
  homeDir: string,
  options: HookManagerOptions,
  attempt = 1
): SetHookEnabledResult {
  const sidecarPath = getClaudeHookStatePath(homeDir)
  const sidecar = readClaudeHooksStateWithText(sidecarPath)
  const state = sidecar.state
  const settingsDoc = readJsonObjectWithText(sourcePath)
  const settings = settingsDoc.value ?? {}
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
    throw new HookTargetConflictError()
  }

  state.disabled[request.hookKey] = buildClaudeDisabledHookEntry(
    sourcePath,
    hookKey,
    removed
  )
  const settingsText = toJsonText(settings)
  writeTextFileIfUnchanged(sourcePath, settingsText, settingsDoc.text, () =>
    options.onBeforeClaudeSettingsWrite?.({ filePath: sourcePath, attempt, operation: 'disable' })
  )
  try {
    writeJsonFileIfUnchanged(sidecarPath, state, sidecar.text)
  } catch (error) {
    restoreTextFileIfUnchanged(sourcePath, settingsDoc.text, settingsText)
    throw error
  }

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
  hookKey: ParsedHookKey,
  options: HookManagerOptions,
  attempt = 1
): SetHookEnabledResult {
  const sidecarPath = path.join(path.dirname(sourcePath), '.berth', 'hooks-state.json')
  const sidecar = readClaudeHooksStateWithText(sidecarPath)
  const state = sidecar.state
  const entry = state.disabled[request.hookKey]
  const settingsDoc = readJsonObjectWithText(sourcePath)
  const settings = settingsDoc.value ?? {}

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

  if (hasClaudeHook(settings, hookKey.scenarioHash, hookKey.hookHash)) {
    delete state.disabled[request.hookKey]
    writeJsonFileIfUnchanged(sidecarPath, state, sidecar.text)
    return {
      hookKey: request.hookKey,
      enabled: true,
      changed: false,
      sourcePath
    }
  }

  const inserted = insertClaudeHook(settings, entry)
  delete state.disabled[request.hookKey]

  let settingsText: string | null = null
  if (inserted) {
    settingsText = toJsonText(settings)
    writeTextFileIfUnchanged(sourcePath, settingsText, settingsDoc.text, () =>
      options.onBeforeClaudeSettingsWrite?.({ filePath: sourcePath, attempt, operation: 'restore' })
    )
  }
  try {
    writeJsonFileIfUnchanged(sidecarPath, state, sidecar.text)
  } catch (error) {
    if (settingsText) restoreTextFileIfUnchanged(sourcePath, settingsDoc.text, settingsText)
    throw error
  }

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

function readJsonObjectWithText(filePath: string): { value: Record<string, unknown> | null; text: string | null } {
  if (!fs.existsSync(filePath)) return { value: null, text: null }
  const text = fs.readFileSync(filePath, 'utf-8')
  const parsed: unknown = JSON.parse(text)
  if (!isRecord(parsed)) throw new Error(`${filePath} must contain a JSON object`)
  return { value: parsed, text }
}

function readTomlObject(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null
  const parsed = parseToml(fs.readFileSync(filePath, 'utf-8'))
  if (!isRecord(parsed)) throw new Error(`${filePath} must contain a TOML object`)
  return parsed
}

function writeJsonFile(filePath: string, value: unknown): void {
  writeTextFile(filePath, toJsonText(value))
}

function writeJsonFileIfUnchanged(filePath: string, value: unknown, expectedText: string | null): void {
  writeTextFileIfUnchanged(filePath, toJsonText(value), expectedText)
}

function writeTextFileIfUnchanged(
  filePath: string,
  content: string,
  expectedText: string | null,
  beforeWrite?: () => void
): void {
  beforeWrite?.()
  if (readTextIfExists(filePath) !== expectedText) {
    throw new HookSourceChangedError(filePath)
  }
  writeTextFile(filePath, content)
}

function restoreTextFileIfUnchanged(filePath: string, originalText: string | null, writtenText: string): void {
  if (readTextIfExists(filePath) !== writtenText) return
  if (originalText === null) {
    fs.rmSync(filePath, { force: true })
    return
  }
  writeTextFile(filePath, originalText)
}

function readTextIfExists(filePath: string): string | null {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null
}

function toJsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
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

function withClaudeHookRetry(operation: (attempt: number) => SetHookEnabledResult): SetHookEnabledResult {
  const maxAttempts = 3
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return operation(attempt)
    } catch (error) {
      if (!(error instanceof HookSourceChangedError)) throw error
      lastError = error
    }
  }
  throw lastError
}

function readClaudeHooksStateWithText(sidecarPath: string): { state: ClaudeHooksStateFile; text: string | null } {
  if (!fs.existsSync(sidecarPath)) {
    return { state: { version: 1, disabled: {} }, text: null }
  }
  const { value: parsed, text } = readJsonObjectWithText(sidecarPath)
  if (!parsed || parsed.version !== 1 || !isRecord(parsed.disabled)) {
    throw new Error('Invalid Claude hooks state file')
  }
  const disabled: Record<string, ClaudeDisabledHookEntry> = {}
  for (const [key, value] of Object.entries(parsed.disabled)) {
    const entry = parseClaudeDisabledHookEntry(value)
    if (!entry) throw new Error(`Invalid Claude hooks state entry: ${key}`)
    disabled[key] = entry
  }
  return { state: { version: 1, disabled }, text }
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

function truncateInline(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value
}

function readBoolean(record: unknown, key: string): boolean | undefined {
  if (!isRecord(record)) return undefined
  const value = record[key]
  return typeof value === 'boolean' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}
