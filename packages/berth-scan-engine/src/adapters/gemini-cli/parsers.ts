import * as fs from 'fs'
import * as path from 'path'
import { assetEntityId, dedupePathKey } from '@shared/asset-dedupe'
import type { Asset, AssetScope } from '../types'
import { extractAtImports } from '../_shared/markdown'
import { isRecord, readString } from '../_shared/parser-helpers'
import { stampSourceKeys } from '../source-key'

export function parseGeminiContextFile(filePath: string, scope: AssetScope): Asset {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const imports = extractAtImports(raw)
  return {
    id: assetEntityId('gemini-md', scope, filePath),
    agentId: 'gemini-cli',
    category: 'instruction',
    type: 'gemini-md',
    scope,
    name: path.basename(filePath),
    path: filePath,
    meta: {
      provider: 'gemini-cli',
      imports,
      lineCount: raw.split('\n').length,
      sourceKey: dedupePathKey(filePath)
    },
    raw
  }
}

export function parseGeminiSettings(filePath: string, scope: AssetScope): Asset[] {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const settings = readJsonRecord(raw)
  return stampSourceKeys(parseMcpServersFromRecord(filePath, scope, settings, {
    provider: 'gemini-cli',
    source: filePath
  }))
}

export function parseGeminiExtensionManifest(filePath: string): Asset[] {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const manifest = readJsonRecord(raw)
  const root = path.dirname(filePath)
  const name = readString(manifest, 'name') ?? path.basename(root)
  const version = readString(manifest, 'version') ?? 'unknown'
  const pluginId = assetEntityId('plugin', 'user', filePath, name)
  const plugin: Asset = {
    id: pluginId,
    agentId: 'gemini-cli',
    category: 'capability',
    type: 'plugin',
    scope: 'user',
    name,
    path: root,
    meta: {
      provider: 'gemini-cli',
      version,
      description: readString(manifest, 'description'),
      manifestPath: filePath,
      origin: 'gemini-extension',
      contextFileName: manifest.contextFileName,
      mcpServerNames: Object.keys(asRecord(manifest.mcpServers) ?? {})
    }
  }
  const mcpServers = parseMcpServersFromRecord(filePath, 'user', manifest, {
    provider: 'gemini-cli',
    source: filePath,
    pluginId,
    pluginName: name,
    origin: 'gemini-extension'
  })
  return stampSourceKeys([plugin, ...mcpServers])
}

export function parseGeminiCredentialPresence(filePath: string): Asset {
  return {
    id: assetEntityId('credential', 'user', filePath),
    agentId: 'gemini-cli',
    category: 'integration',
    type: 'credential',
    scope: 'user',
    name: path.basename(filePath),
    path: filePath,
    meta: {
      provider: 'gemini-cli',
      exists: true
    },
    sensitive: true
  }
}

function parseMcpServersFromRecord(
  filePath: string,
  scope: AssetScope,
  record: Record<string, unknown>,
  baseMeta: Record<string, unknown>
): Asset[] {
  const servers = asRecord(record.mcpServers)
  if (!servers) return []

  const assets: Asset[] = []
  for (const [name, serverConfig] of Object.entries(servers)) {
    if (!isRecord(serverConfig)) continue
    assets.push({
      id: assetEntityId('mcp-server', scope, filePath, name),
      agentId: 'gemini-cli',
      category: 'capability',
      type: 'mcp-server',
      scope,
      name,
      path: filePath,
      meta: {
        ...baseMeta,
        serverConfig: cloneJson(serverConfig)
      }
    })
  }
  return assets
}

function readJsonRecord(raw: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(raw)
  return isRecord(parsed) ? parsed : {}
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
