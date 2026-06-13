import * as fs from 'fs'
import * as path from 'path'
import { assetEntityId } from '@shared/asset-dedupe'
import type { Asset, AssetScope } from '../types'
import { splitFrontmatter } from '../_shared/markdown'
import { isRecord, readString } from '../_shared/parser-helpers'
import { stampSourceKey, stampSourceKeys } from '../source-key'

const SENSITIVE_KEY = /(?:api[_-]?key|auth|authorization|credential|password|secret|token)/i

export function parseOpenClawInstructionFile(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  return stampSourceKey({
    id: assetEntityId('agents-md', scope, filePath),
    agentId: 'openclaw',
    category: 'instruction',
    type: 'agents-md',
    scope,
    name: path.basename(filePath),
    path: filePath,
    meta: {
      provider: 'openclaw',
      origin: 'openclaw-workspace-context',
      ...(frontmatter ?? {}),
      bodyLength: body.length
    },
    raw
  })
}

export function parseOpenClawSkill(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  const name = readString(frontmatter ?? {}, 'name') ?? path.basename(path.dirname(filePath))
  return stampSourceKey({
    id: assetEntityId('skill', scope, filePath),
    agentId: 'openclaw',
    category: 'instruction',
    type: 'skill',
    scope,
    name,
    path: filePath,
    meta: {
      provider: 'openclaw',
      ...(frontmatter ?? {}),
      bodyLength: body.length
    },
    raw
  })
}

export function parseOpenClawConfig(filePath: string): Asset[] {
  const config = parseJsonLikeRecord(fs.readFileSync(filePath, 'utf-8'))
  return stampSourceKeys(parseOpenClawMcpServers(filePath, 'user', config))
}

export function parseOpenClawPluginManifest(filePath: string): Asset[] {
  const manifest = parseJsonLikeRecord(fs.readFileSync(filePath, 'utf-8'))
  const root = path.dirname(filePath)
  const embedded = isRecord(manifest.openclaw) ? manifest.openclaw : manifest
  const name = readString(embedded, 'name') ?? readString(manifest, 'name') ?? path.basename(root)
  return stampSourceKeys([
    {
      id: assetEntityId('plugin', 'user', filePath, name),
      agentId: 'openclaw',
      category: 'capability' as const,
      type: 'plugin' as const,
      scope: 'user' as const,
      name,
      path: root,
      meta: {
        provider: 'openclaw',
        version: readString(embedded, 'version') ?? readString(manifest, 'version') ?? 'unknown',
        description: readString(embedded, 'description') ?? readString(manifest, 'description'),
        manifestPath: filePath,
        origin: 'openclaw-plugin'
      }
    },
    ...parseOpenClawMcpServers(filePath, 'user', embedded, name)
  ])
}

export function parseOpenClawSessionIndex(filePath: string): Asset[] {
  const index = parseJsonLikeRecord(fs.readFileSync(filePath, 'utf-8'))
  const sessions = readSessionEntries(index)
  return stampSourceKeys(sessions.map(([key, value], index) => {
    const session = isRecord(value) ? value : {}
    const sessionId = readString(session, 'id') ?? readString(session, 'sessionId') ?? key
    return {
      id: assetEntityId('session', 'session', filePath, sessionId || `session-${index + 1}`),
      agentId: 'openclaw',
      category: 'state' as const,
      type: 'session' as const,
      scope: 'session' as const,
      name: sessionId || `session-${index + 1}`,
      path: filePath,
      meta: {
        provider: 'openclaw',
        source: filePath,
        sessionId,
        createdAt: readString(session, 'createdAt') ?? readString(session, 'created_at'),
        updatedAt: readString(session, 'updatedAt') ?? readString(session, 'updated_at'),
        messageCount: readNumber(session, 'messageCount') ?? readNumber(session, 'messages'),
        tokenCount: readNumber(session, 'tokenCount') ?? readNumber(session, 'tokens')
      },
      sensitive: true
    }
  }))
}

export function parseOpenClawCredentialPresence(filePath: string): Asset {
  return {
    id: assetEntityId('credential', 'user', filePath),
    agentId: 'openclaw',
    category: 'integration',
    type: 'credential',
    scope: 'user',
    name: path.basename(filePath),
    path: filePath,
    meta: {
      provider: 'openclaw',
      exists: true
    },
    sensitive: true
  }
}

function parseOpenClawMcpServers(
  filePath: string,
  scope: AssetScope,
  config: Record<string, unknown>,
  pluginName?: string
): Asset[] {
  const servers = asRecord(config.mcpServers) ?? asRecord(asRecord(config.mcp)?.servers) ?? asRecord(config.servers)
  if (!servers) return []
  return Object.entries(servers)
    .filter(([, serverConfig]) => isRecord(serverConfig))
    .map(([name, serverConfig]) => ({
      id: assetEntityId('mcp-server', scope, filePath, pluginName ? `${pluginName}:${name}` : name),
      agentId: 'openclaw',
      category: 'capability',
      type: 'mcp-server',
      scope,
      name,
      path: filePath,
      meta: {
        provider: 'openclaw',
        source: filePath,
        pluginName,
        serverConfig: redactSensitiveValues(serverConfig)
      }
    }))
}

function readSessionEntries(index: Record<string, unknown>): Array<[string, unknown]> {
  if (Array.isArray(index.sessions)) {
    return index.sessions.map((session, itemIndex) => [
      isRecord(session) ? readString(session, 'id') ?? readString(session, 'sessionId') ?? `session-${itemIndex + 1}` : `session-${itemIndex + 1}`,
      session
    ])
  }
  if (isRecord(index.sessions)) return Object.entries(index.sessions)
  return Object.entries(index).filter(([, value]) => isRecord(value))
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

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
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
