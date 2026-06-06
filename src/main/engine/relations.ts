import * as fs from 'fs'
import * as path from 'path'
import type { Asset, Relation } from '@shared/types/asset'
import type { ImportChainNode } from '@shared/types/ipc'
import { extractAtImports } from '../adapters/claude-code/parsers'

/**
 * Resolve all relations for a given asset.
 */
export function resolveRelations(asset: Asset, allAssets: Asset[]): Relation[] {
  const relations: Relation[] = []

  // @path import relations for instruction files
  if (asset.type === 'claude-md' || asset.type === 'agents-md') {
    const imports = (asset.meta.imports as string[]) ?? []
    for (const imp of imports) {
      const resolvedPath = path.resolve(path.dirname(asset.path), imp)
      // Find matching asset by path
      const target = allAssets.find((a) => normalizePath(a.path) === normalizePath(resolvedPath))
      if (target) {
        relations.push({ from: asset.id, to: target.id, kind: 'imports' })
      } else {
        // Still record the relation with the path as target
        relations.push({ from: asset.id, to: resolvedPath, kind: 'imports' })
      }
    }
  }

  // Session -> skills/mcp relations from session meta
  if (asset.type === 'session') {
    const skillsUsed = (asset.meta.skillsUsed as string[]) ?? []
    for (const skillName of skillsUsed) {
      const skill = allAssets.find((a) => a.type === 'skill' && a.name === skillName)
      if (skill) {
        relations.push({ from: asset.id, to: skill.id, kind: 'uses' })
      }
    }
    const mcpServers = (asset.meta.mcpServers as string[]) ?? []
    for (const serverName of mcpServers) {
      const server = allAssets.find((a) => a.type === 'mcp-server' && a.name === serverName)
      if (server) {
        relations.push({ from: asset.id, to: server.id, kind: 'uses' })
      }
    }
  }

  // Plugin -> subcomponent relations
  if (asset.type === 'plugin') {
    // A plugin directory may contain skills, commands, etc.
    for (const a of allAssets) {
      if (a.id !== asset.id && a.path.startsWith(asset.path)) {
        relations.push({ from: asset.id, to: a.id, kind: 'contains' })
      }
    }
  }

  // Component -> plugin belongs-to (set by the plugin descent in the scanner).
  if (asset.type !== 'plugin') {
    const pluginId = typeof asset.meta.pluginId === 'string' ? asset.meta.pluginId : undefined
    if (pluginId) {
      relations.push({ from: asset.id, to: pluginId, kind: 'belongs-to' })
    }
  }

  // Hook -> triggered-by relations
  if (asset.type === 'hook') {
    const event = asset.meta.event as string | undefined
    if (event) {
      // Hooks are triggered by operations that match their event name
      relations.push({ from: asset.id, to: event, kind: 'triggered-by' })
    }
  }

  return relations
}

/**
 * Build the full import chain tree for a file (used by assets:import-chain IPC).
 */
export function buildImportChain(
  filePath: string,
  visited: Set<string> = new Set()
): ImportChainNode {
  const normalized = normalizePath(filePath)
  const node: ImportChainNode = { path: filePath, imports: [] }

  if (visited.has(normalized)) {
    node.errors = ['Circular import detected']
    return node
  }
  visited.add(normalized)

  if (!fs.existsSync(filePath)) {
    node.errors = ['File not found']
    return node
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    node.content = content
    const imports = extractAtImports(content)
    for (const imp of imports) {
      const resolvedPath = path.resolve(path.dirname(filePath), imp)
      node.imports.push(buildImportChain(resolvedPath, new Set(visited)))
    }
  } catch (err) {
    node.errors = [err instanceof Error ? err.message : String(err)]
  }

  return node
}

function normalizePath(p: string): string {
  return path.normalize(p).toLowerCase()
}
