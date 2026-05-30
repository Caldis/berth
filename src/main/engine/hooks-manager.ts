import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'
import type {
  SetHookEnabledRequest,
  SetHookEnabledResult,
  HooksAgentId,
  HooksEnablementStatus,
  SetHooksEnabledRequest,
  SetHooksEnabledResult
} from '@shared/types/ipc'

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
  if (request.agentId !== 'codex') {
    throw new Error('Single hook enablement only supports Codex hooks')
  }
  if (request.scope !== 'user') {
    throw new Error(`Unsupported hook state scope: ${request.scope}`)
  }
  if (!request.hookKey.trim()) {
    throw new Error('Codex hook state requires a hook key')
  }
  if (request.managed === true) {
    throw new Error('managed hooks cannot be changed from user hook state')
  }

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

function writeJsonFile(filePath: string, value: Record<string, unknown>): void {
  writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function writeTextFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, `${filePath}.bak`)
  }
  fs.writeFileSync(filePath, content)
}

function readBoolean(record: unknown, key: string): boolean | undefined {
  if (!isRecord(record)) return undefined
  const value = record[key]
  return typeof value === 'boolean' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}
