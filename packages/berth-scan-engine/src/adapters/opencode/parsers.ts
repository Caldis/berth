import * as fs from 'fs'
import * as path from 'path'
import { assetEntityId, dedupePathKey } from '@shared/asset-dedupe'
import type { Asset, AssetScope } from '../types'
import { extractAtImports, splitFrontmatter } from '../_shared/markdown'
import { isRecord, readString } from '../_shared/parser-helpers'
import { stampSourceKey, stampSourceKeys } from '../source-key'

export function parseOpenCodeAgentsMd(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const imports = extractAtImports(raw)
  const sourceKey = dedupePathKey(filePath)
  return {
    id: assetEntityId('agents-md', scope, filePath),
    agentId: 'opencode',
    category: 'instruction',
    type: 'agents-md',
    scope,
    name: path.basename(filePath),
    path: filePath,
    meta: {
      provider: 'opencode',
      imports,
      lineCount: raw.split('\n').length,
      dedupeKey: sourceKey,
      sourceKey,
      readByAgentIds: ['opencode']
    },
    raw
  }
}

export function parseOpenCodeSkill(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  const name = readString(frontmatter ?? {}, 'name') ?? path.basename(path.dirname(filePath))
  return stampSourceKey({
    id: assetEntityId('skill', scope, filePath),
    agentId: 'opencode',
    category: 'instruction',
    type: 'skill',
    scope,
    name,
    path: filePath,
    meta: {
      provider: 'opencode',
      ...(frontmatter ?? {}),
      bodyLength: body.length
    },
    raw
  })
}

export function parseOpenCodeAgent(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  const name = readString(frontmatter ?? {}, 'name') ?? path.basename(filePath, path.extname(filePath))
  return stampSourceKey({
    id: assetEntityId('agent', scope, filePath),
    agentId: 'opencode',
    category: 'instruction',
    type: 'agent',
    scope,
    name,
    path: filePath,
    meta: {
      provider: 'opencode',
      ...(frontmatter ?? {}),
      bodyLength: body.length
    },
    raw
  })
}

export function parseOpenCodeCommand(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { frontmatter, body } = splitFrontmatter(raw)
  const name = path.basename(filePath, path.extname(filePath))
  return stampSourceKey({
    id: assetEntityId('command', scope, filePath),
    agentId: 'opencode',
    category: 'instruction',
    type: 'command',
    scope,
    name,
    path: filePath,
    meta: {
      provider: 'opencode',
      ...(frontmatter ?? {}),
      bodyLength: body.length
    },
    raw
  })
}

export function parseOpenCodeConfig(filePath: string, scope: AssetScope): Asset[] {
  const config = parseJsonLikeRecord(fs.readFileSync(filePath, 'utf-8'))
  return stampSourceKeys([
    ...parseOpenCodeMcpServers(filePath, scope, config),
    ...parseOpenCodeConfigAgents(filePath, scope, config),
    ...parseOpenCodeConfigCommands(filePath, scope, config)
  ])
}

export function parseOpenCodePluginManifest(filePath: string, scope: AssetScope): Asset {
  const manifest = parseJsonLikeRecord(fs.readFileSync(filePath, 'utf-8'))
  const root = path.dirname(filePath)
  const name = readString(manifest, 'name') ?? path.basename(root)
  return stampSourceKey({
    id: assetEntityId('plugin', scope, filePath, name),
    agentId: 'opencode',
    category: 'capability',
    type: 'plugin',
    scope,
    name,
    path: root,
    meta: {
      provider: 'opencode',
      version: readString(manifest, 'version') ?? 'unknown',
      description: readString(manifest, 'description'),
      manifestPath: filePath,
      origin: 'opencode-plugin'
    }
  })
}

export function parseOpenCodeCredentialPresence(filePath: string): Asset {
  return {
    id: assetEntityId('credential', 'user', filePath),
    agentId: 'opencode',
    category: 'integration',
    type: 'credential',
    scope: 'user',
    name: path.basename(filePath),
    path: filePath,
    meta: {
      provider: 'opencode',
      exists: true
    },
    sensitive: true
  }
}

function parseOpenCodeMcpServers(
  filePath: string,
  scope: AssetScope,
  config: Record<string, unknown>
): Asset[] {
  const servers = asRecord(config.mcp) ?? asRecord(config.mcpServers)
  if (!servers) return []
  return Object.entries(servers)
    .filter(([, serverConfig]) => isRecord(serverConfig))
    .map(([name, serverConfig]) => ({
      id: assetEntityId('mcp-server', scope, filePath, name),
      agentId: 'opencode',
      category: 'capability',
      type: 'mcp-server',
      scope,
      name,
      path: filePath,
      meta: {
        provider: 'opencode',
        serverConfig: cloneJson(serverConfig),
        source: filePath
      }
    }))
}

function parseOpenCodeConfigAgents(
  filePath: string,
  scope: AssetScope,
  config: Record<string, unknown>
): Asset[] {
  const agents = asRecord(config.agent) ?? asRecord(config.agents)
  if (!agents) return []
  return Object.entries(agents)
    .filter(([, agentConfig]) => isRecord(agentConfig))
    .map(([name, agentConfig]) => ({
      id: assetEntityId('agent', scope, filePath, `config:${name}`),
      agentId: 'opencode',
      category: 'instruction',
      type: 'agent',
      scope,
      name,
      path: filePath,
      meta: {
        provider: 'opencode',
        source: filePath,
        origin: 'opencode-config',
        config: cloneJson(agentConfig)
      }
    }))
}

function parseOpenCodeConfigCommands(
  filePath: string,
  scope: AssetScope,
  config: Record<string, unknown>
): Asset[] {
  const commands = asRecord(config.command) ?? asRecord(config.commands)
  if (!commands) return []
  return Object.entries(commands)
    .filter(([, commandConfig]) => isRecord(commandConfig))
    .map(([name, commandConfig]) => ({
      id: assetEntityId('command', scope, filePath, `config:${name}`),
      agentId: 'opencode',
      category: 'instruction',
      type: 'command',
      scope,
      name,
      path: filePath,
      meta: {
        provider: 'opencode',
        source: filePath,
        origin: 'opencode-config',
        config: cloneJson(commandConfig)
      }
    }))
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

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
