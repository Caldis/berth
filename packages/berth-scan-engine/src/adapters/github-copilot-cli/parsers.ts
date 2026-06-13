import * as fs from 'fs'
import * as path from 'path'
import { assetEntityId, dedupePathKey } from '@shared/asset-dedupe'
import type { Asset, AssetScope } from '../types'
import { extractAtImports, splitFrontmatter } from '../_shared/markdown'
import { isRecord, readString } from '../_shared/parser-helpers'
import { stampSourceKey, stampSourceKeys } from '../source-key'

const SENSITIVE_KEY = /(?:api[_-]?key|auth|authorization|credential|password|secret|token)/i

export function parseCopilotInstructionFile(
  filePath: string,
  scope: AssetScope,
  origin: string
): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  const imports = extractAtImports(raw)
  const name = path.basename(filePath)
  const meta: Record<string, unknown> = {
    provider: 'github-copilot-cli',
    origin,
    imports,
    lineCount: raw.split('\n').length,
    bodyLength: body.length,
    ...(frontmatter ?? {}),
    sourceKey: dedupePathKey(filePath)
  }
  if (path.basename(filePath).toLowerCase() === 'agents.md') {
    meta.dedupeKey = dedupePathKey(filePath)
    meta.readByAgentIds = ['github-copilot-cli']
  }
  return {
    id: assetEntityId('agents-md', scope, filePath),
    agentId: 'github-copilot-cli',
    category: 'instruction',
    type: 'agents-md',
    scope,
    name,
    path: filePath,
    meta,
    raw
  }
}

export function parseCopilotSkill(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  const name = readString(frontmatter ?? {}, 'name') ?? path.basename(path.dirname(filePath))
  return stampSourceKey({
    id: assetEntityId('skill', scope, filePath),
    agentId: 'github-copilot-cli',
    category: 'instruction',
    type: 'skill',
    scope,
    name,
    path: filePath,
    meta: {
      provider: 'github-copilot-cli',
      ...(frontmatter ?? {}),
      bodyLength: body.length
    },
    raw
  })
}

export function parseCopilotAgent(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  const name = readString(frontmatter ?? {}, 'name') ?? path.basename(filePath, path.extname(filePath))
  return stampSourceKey({
    id: assetEntityId('agent', scope, filePath),
    agentId: 'github-copilot-cli',
    category: 'instruction',
    type: 'agent',
    scope,
    name,
    path: filePath,
    meta: {
      provider: 'github-copilot-cli',
      ...(frontmatter ?? {}),
      bodyLength: body.length
    },
    raw
  })
}

export function parseCopilotMcpConfig(filePath: string, scope: AssetScope): Asset[] {
  const config = parseJsonLikeRecord(fs.readFileSync(filePath, 'utf-8'))
  const servers = asRecord(config.mcpServers)
  if (!servers) return []
  return stampSourceKeys(Object.entries(servers)
    .filter(([, serverConfig]) => isRecord(serverConfig))
    .map(([name, serverConfig]) => ({
      id: assetEntityId('mcp-server', scope, filePath, name),
      agentId: 'github-copilot-cli',
      category: 'capability' as const,
      type: 'mcp-server' as const,
      scope,
      name,
      path: filePath,
      meta: {
        provider: 'github-copilot-cli',
        source: filePath,
        serverConfig: redactSensitiveValues(serverConfig)
      }
    })))
}

export function parseCopilotSettings(filePath: string, scope: AssetScope): Asset[] {
  const settings = parseJsonLikeRecord(fs.readFileSync(filePath, 'utf-8'))
  return stampSourceKeys([
    ...parseInlineMcpServers(filePath, scope, settings),
    ...parseInlineHooks(filePath, scope, settings)
  ])
}

export function parseCopilotHookFile(filePath: string, scope: AssetScope): Asset {
  return stampSourceKey({
    id: assetEntityId('hook', scope, filePath),
    agentId: 'github-copilot-cli',
    category: 'capability',
    type: 'hook',
    scope,
    name: path.basename(filePath, path.extname(filePath)),
    path: filePath,
    meta: {
      provider: 'github-copilot-cli',
      origin: 'copilot-hook-file'
    }
  })
}

export function parseCopilotPluginManifest(filePath: string): Asset {
  const manifest = parseJsonLikeRecord(fs.readFileSync(filePath, 'utf-8'))
  const root = path.dirname(filePath)
  const name = readString(manifest, 'name') ?? path.basename(root)
  return stampSourceKey({
    id: assetEntityId('plugin', 'user', filePath, name),
    agentId: 'github-copilot-cli',
    category: 'capability',
    type: 'plugin',
    scope: 'user',
    name,
    path: root,
    meta: {
      provider: 'github-copilot-cli',
      version: readString(manifest, 'version') ?? 'unknown',
      description: readString(manifest, 'description'),
      manifestPath: filePath,
      origin: 'copilot-installed-plugin'
    }
  })
}

export function parseCopilotCredentialPresence(filePath: string): Asset {
  return {
    id: assetEntityId('credential', 'user', filePath),
    agentId: 'github-copilot-cli',
    category: 'integration',
    type: 'credential',
    scope: 'user',
    name: path.basename(filePath),
    path: filePath,
    meta: {
      provider: 'github-copilot-cli',
      exists: true
    },
    sensitive: true
  }
}

function parseInlineMcpServers(
  filePath: string,
  scope: AssetScope,
  settings: Record<string, unknown>
): Asset[] {
  const servers = asRecord(settings.mcpServers)
  if (!servers) return []
  return Object.entries(servers)
    .filter(([, serverConfig]) => isRecord(serverConfig))
    .map(([name, serverConfig]) => ({
      id: assetEntityId('mcp-server', scope, filePath, `settings:${name}`),
      agentId: 'github-copilot-cli',
      category: 'capability',
      type: 'mcp-server',
      scope,
      name,
      path: filePath,
      meta: {
        provider: 'github-copilot-cli',
        origin: 'copilot-settings',
        serverConfig: redactSensitiveValues(serverConfig)
      }
    }))
}

function parseInlineHooks(
  filePath: string,
  scope: AssetScope,
  settings: Record<string, unknown>
): Asset[] {
  const hooks = settings.hooks
  if (Array.isArray(hooks)) {
    return hooks
      .filter((hook) => isRecord(hook))
      .map((hook, index) => inlineHookAsset(filePath, scope, `hook-${index + 1}`, index, hook))
  }
  if (!isRecord(hooks)) return []
  return Object.entries(hooks)
    .filter(([, hook]) => isRecord(hook) || Array.isArray(hook))
    .map(([name, hook], index) => inlineHookAsset(filePath, scope, name, index, hook))
}

function inlineHookAsset(
  filePath: string,
  scope: AssetScope,
  name: string,
  index: number,
  hook: unknown
): Asset {
  return {
    id: assetEntityId('hook', scope, filePath, `settings:${name}:${index}`),
    agentId: 'github-copilot-cli',
    category: 'capability',
    type: 'hook',
    scope,
    name,
    path: filePath,
    meta: {
      provider: 'github-copilot-cli',
      origin: 'copilot-settings',
      hook: redactSensitiveValues(hook)
    }
  }
}

function parseJsonLikeRecord(raw: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(stripJsonComments(raw))
  return isRecord(parsed) ? parsed : {}
}

function stripJsonComments(raw: string): string {
  let result = ''
  let inString = false
  let quote = ''
  let escaped = false
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    const next = raw[index + 1]
    if (inString) {
      result += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        inString = false
      }
      continue
    }
    if (char === '"' || char === "'") {
      inString = true
      quote = char
      result += char
      continue
    }
    if (char === '/' && next === '/') {
      while (index < raw.length && raw[index] !== '\n') index += 1
      result += '\n'
      continue
    }
    if (char === '/' && next === '*') {
      index += 2
      while (index < raw.length && !(raw[index] === '*' && raw[index + 1] === '/')) index += 1
      index += 1
      continue
    }
    result += char
  }
  return result
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function redactSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveValues)
  if (!isRecord(value)) return value
  const next: Record<string, unknown> = {}
  for (const [key, childValue] of Object.entries(value)) {
    next[key] = SENSITIVE_KEY.test(key) ? '<redacted>' : redactSensitiveValues(childValue)
  }
  return next
}
