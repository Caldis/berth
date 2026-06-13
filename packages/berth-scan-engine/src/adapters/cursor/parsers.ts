import * as fs from 'fs'
import * as path from 'path'
import { assetEntityId, dedupePathKey } from '@shared/asset-dedupe'
import type { Asset, AssetScope } from '../types'
import { extractAtImports, splitFrontmatter } from '../_shared/markdown'
import { isRecord, readString } from '../_shared/parser-helpers'
import { stampSourceKey, stampSourceKeys } from '../source-key'

const SENSITIVE_KEY = /(?:api[_-]?key|auth|authorization|credential|password|secret|token)/i

export function parseCursorRule(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  return stampSourceKey({
    id: assetEntityId('agents-md', scope, filePath),
    agentId: 'cursor',
    category: 'instruction',
    type: 'agents-md',
    scope,
    name: path.basename(filePath, path.extname(filePath)),
    path: filePath,
    meta: {
      provider: 'cursor',
      origin: 'cursor-rule',
      ...(frontmatter ?? {}),
      bodyLength: body.length
    },
    raw
  })
}

export function parseCursorAgentsMd(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const imports = extractAtImports(raw)
  return {
    id: assetEntityId('agents-md', scope, filePath),
    agentId: 'cursor',
    category: 'instruction',
    type: 'agents-md',
    scope,
    name: path.basename(filePath),
    path: filePath,
    meta: {
      provider: 'cursor',
      origin: 'cursor-agents-md',
      imports,
      lineCount: raw.split('\n').length,
      dedupeKey: dedupePathKey(filePath),
      sourceKey: dedupePathKey(filePath),
      readByAgentIds: ['cursor']
    },
    raw
  }
}

export function parseCursorSkill(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  const name = readString(frontmatter ?? {}, 'name') ?? path.basename(path.dirname(filePath))
  return stampSourceKey({
    id: assetEntityId('skill', scope, filePath),
    agentId: 'cursor',
    category: 'instruction',
    type: 'skill',
    scope,
    name,
    path: filePath,
    meta: {
      provider: 'cursor',
      ...(frontmatter ?? {}),
      bodyLength: body.length
    },
    raw
  })
}

export function parseCursorAgent(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  const name = readString(frontmatter ?? {}, 'name') ?? path.basename(filePath, path.extname(filePath))
  return stampSourceKey({
    id: assetEntityId('agent', scope, filePath),
    agentId: 'cursor',
    category: 'instruction',
    type: 'agent',
    scope,
    name,
    path: filePath,
    meta: {
      provider: 'cursor',
      ...(frontmatter ?? {}),
      bodyLength: body.length
    },
    raw
  })
}

export function parseCursorCommand(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  const name = readString(frontmatter ?? {}, 'name') ?? path.basename(filePath, path.extname(filePath))
  return stampSourceKey({
    id: assetEntityId('command', scope, filePath),
    agentId: 'cursor',
    category: 'instruction',
    type: 'command',
    scope,
    name,
    path: filePath,
    meta: {
      provider: 'cursor',
      ...(frontmatter ?? {}),
      bodyLength: body.length
    },
    raw
  })
}

export function parseCursorMcpConfig(filePath: string, scope: AssetScope): Asset[] {
  const config = parseJsonLikeRecord(fs.readFileSync(filePath, 'utf-8'))
  const servers = asRecord(config.mcpServers) ?? asRecord(config.servers)
  if (!servers) return []
  return stampSourceKeys(Object.entries(servers)
    .filter(([, serverConfig]) => isRecord(serverConfig))
    .map(([name, serverConfig]) => ({
      id: assetEntityId('mcp-server', scope, filePath, name),
      agentId: 'cursor',
      category: 'capability' as const,
      type: 'mcp-server' as const,
      scope,
      name,
      path: filePath,
      meta: {
        provider: 'cursor',
        source: filePath,
        serverConfig: redactSensitiveValues(serverConfig)
      }
    })))
}

export function parseCursorHooksConfig(filePath: string, scope: AssetScope): Asset[] {
  const config = parseJsonLikeRecord(fs.readFileSync(filePath, 'utf-8'))
  const hooks = config.hooks ?? config
  if (Array.isArray(hooks)) {
    return stampSourceKeys(hooks
      .filter((hook) => isRecord(hook))
      .map((hook, index) => hookAsset(filePath, scope, `hook-${index + 1}`, index, hook)))
  }
  if (!isRecord(hooks)) return []
  return stampSourceKeys(Object.entries(hooks)
    .filter(([, hook]) => isRecord(hook) || Array.isArray(hook))
    .map(([name, hook], index) => hookAsset(filePath, scope, name, index, hook)))
}

export function parseCursorPolicyConfig(
  filePath: string,
  scope: AssetScope,
  kind: 'permissions' | 'sandbox'
): Asset {
  const config = parseJsonLikeRecord(fs.readFileSync(filePath, 'utf-8'))
  return stampSourceKey({
    id: assetEntityId('permission', scope, filePath, kind),
    agentId: 'cursor',
    category: 'capability',
    type: 'permission',
    scope,
    name: kind,
    path: filePath,
    meta: {
      provider: 'cursor',
      kind,
      config: redactSensitiveValues(config)
    }
  })
}

export function parseCursorPluginManifest(filePath: string, scope: AssetScope): Asset {
  const manifest = parseJsonLikeRecord(fs.readFileSync(filePath, 'utf-8'))
  const root = path.dirname(filePath)
  const name = readString(manifest, 'name') ?? path.basename(root)
  return stampSourceKey({
    id: assetEntityId('plugin', scope, filePath, name),
    agentId: 'cursor',
    category: 'capability',
    type: 'plugin',
    scope,
    name,
    path: root,
    meta: {
      provider: 'cursor',
      version: readString(manifest, 'version') ?? 'unknown',
      description: readString(manifest, 'description'),
      manifestPath: filePath,
      origin: 'cursor-plugin'
    }
  })
}

function hookAsset(
  filePath: string,
  scope: AssetScope,
  name: string,
  index: number,
  hook: unknown
): Asset {
  return {
    id: assetEntityId('hook', scope, filePath, `${name}:${index}`),
    agentId: 'cursor',
    category: 'capability',
    type: 'hook',
    scope,
    name,
    path: filePath,
    meta: {
      provider: 'cursor',
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
