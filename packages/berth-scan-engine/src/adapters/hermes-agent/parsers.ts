import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { assetEntityId, dedupePathKey } from '@shared/asset-dedupe'
import type { Asset, AssetScope } from '../types'
import { extractAtImports, splitFrontmatter } from '../_shared/markdown'
import { isRecord, readString } from '../_shared/parser-helpers'
import { stampSourceKey, stampSourceKeys } from '../source-key'

const SENSITIVE_KEY = /(?:api[_-]?key|auth|authorization|credential|password|secret|token)/i

export function parseHermesContextFile(filePath: string, scope: AssetScope, origin: string): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  const imports = extractAtImports(raw)
  const meta: Record<string, unknown> = {
    provider: 'hermes-agent',
    origin,
    imports,
    lineCount: raw.split('\n').length,
    bodyLength: body.length,
    ...(frontmatter ?? {}),
    sourceKey: dedupePathKey(filePath)
  }
  if (path.basename(filePath).toLowerCase() === 'agents.md') {
    meta.dedupeKey = dedupePathKey(filePath)
    meta.readByAgentIds = ['hermes-agent']
  }
  return {
    id: assetEntityId('agents-md', scope, filePath),
    agentId: 'hermes-agent',
    category: 'instruction',
    type: 'agents-md',
    scope,
    name: path.basename(filePath),
    path: filePath,
    meta,
    raw
  }
}

export function parseHermesSkill(filePath: string): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  const name = readString(frontmatter ?? {}, 'name') ?? path.basename(path.dirname(filePath))
  return stampSourceKey({
    id: assetEntityId('skill', 'user', filePath),
    agentId: 'hermes-agent',
    category: 'instruction',
    type: 'skill',
    scope: 'user',
    name,
    path: filePath,
    meta: {
      provider: 'hermes-agent',
      ...(frontmatter ?? {}),
      bodyLength: body.length
    },
    raw
  })
}

export function parseHermesConfig(filePath: string): Asset[] {
  const config = parseYamlRecord(fs.readFileSync(filePath, 'utf-8'))
  return stampSourceKeys([
    ...parseHermesMcpServers(filePath, config),
    ...parseHermesConfigHooks(filePath, config)
  ])
}

export function parseHermesPluginManifest(filePath: string): Asset {
  const manifest = parseYamlRecord(fs.readFileSync(filePath, 'utf-8'))
  const root = path.dirname(filePath)
  const name = readString(manifest, 'name') ?? path.basename(root)
  return stampSourceKey({
    id: assetEntityId('plugin', 'user', filePath, name),
    agentId: 'hermes-agent',
    category: 'capability',
    type: 'plugin',
    scope: 'user',
    name,
    path: root,
    meta: {
      provider: 'hermes-agent',
      version: readString(manifest, 'version') ?? 'unknown',
      description: readString(manifest, 'description'),
      manifestPath: filePath,
      origin: 'hermes-plugin'
    }
  })
}

export function parseHermesHookManifest(filePath: string): Asset {
  const manifest = parseYamlRecord(fs.readFileSync(filePath, 'utf-8'))
  const name = readString(manifest, 'name') ?? path.basename(path.dirname(filePath))
  return stampSourceKey({
    id: assetEntityId('hook', 'user', filePath, name),
    agentId: 'hermes-agent',
    category: 'capability',
    type: 'hook',
    scope: 'user',
    name,
    path: filePath,
    meta: {
      provider: 'hermes-agent',
      origin: 'hermes-hook-manifest',
      hook: redactSensitiveValues(manifest)
    }
  })
}

export function parseHermesSessionIndex(filePath: string): Asset[] {
  const parsed = parseJsonRecord(fs.readFileSync(filePath, 'utf-8'))
  const entries = readSessionEntries(parsed)
  return stampSourceKeys(entries.map(([key, value], index) => {
    const session = isRecord(value) ? value : {}
    const sessionId = readString(session, 'id') ?? readString(session, 'sessionId') ?? key
    return {
      id: assetEntityId('session', 'session', filePath, sessionId || `session-${index + 1}`),
      agentId: 'hermes-agent',
      category: 'state' as const,
      type: 'session' as const,
      scope: 'session' as const,
      name: sessionId || `session-${index + 1}`,
      path: filePath,
      meta: {
        provider: 'hermes-agent',
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

export function parseHermesCredentialPresence(filePath: string): Asset {
  return {
    id: assetEntityId('credential', 'user', filePath),
    agentId: 'hermes-agent',
    category: 'integration',
    type: 'credential',
    scope: 'user',
    name: path.basename(filePath),
    path: filePath,
    meta: {
      provider: 'hermes-agent',
      exists: true
    },
    sensitive: true
  }
}

function parseHermesMcpServers(filePath: string, config: Record<string, unknown>): Asset[] {
  const servers = asRecord(config.mcp_servers) ?? asRecord(config.mcpServers) ?? asRecord(asRecord(config.mcp)?.servers)
  if (!servers) return []
  return Object.entries(servers)
    .filter(([, serverConfig]) => isRecord(serverConfig))
    .map(([name, serverConfig]) => ({
      id: assetEntityId('mcp-server', 'user', filePath, name),
      agentId: 'hermes-agent',
      category: 'capability',
      type: 'mcp-server',
      scope: 'user',
      name,
      path: filePath,
      meta: {
        provider: 'hermes-agent',
        source: filePath,
        serverConfig: redactSensitiveValues(serverConfig)
      }
    }))
}

function parseHermesConfigHooks(filePath: string, config: Record<string, unknown>): Asset[] {
  const hooks = config.hooks
  if (Array.isArray(hooks)) {
    return hooks
      .filter((hook) => isRecord(hook))
      .map((hook, index) => configHookAsset(filePath, `hook-${index + 1}`, index, hook))
  }
  if (!isRecord(hooks)) return []
  return Object.entries(hooks)
    .filter(([, hook]) => isRecord(hook) || Array.isArray(hook))
    .map(([name, hook], index) => configHookAsset(filePath, name, index, hook))
}

function configHookAsset(filePath: string, name: string, index: number, hook: unknown): Asset {
  return {
    id: assetEntityId('hook', 'user', filePath, `config:${name}:${index}`),
    agentId: 'hermes-agent',
    category: 'capability',
    type: 'hook',
    scope: 'user',
    name,
    path: filePath,
    meta: {
      provider: 'hermes-agent',
      origin: 'hermes-config',
      hook: redactSensitiveValues(hook)
    }
  }
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

function parseYamlRecord(raw: string): Record<string, unknown> {
  const parsed = yaml.load(raw)
  return isRecord(parsed) ? parsed : {}
}

function parseJsonRecord(raw: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(raw)
  return isRecord(parsed) ? parsed : {}
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
