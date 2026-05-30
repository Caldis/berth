import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type {
  AgentAdapter,
  Asset,
  AssetCategory,
  DetectResult,
  Relation,
  ScanRoot,
  WatchEvent
} from '../types'
import { extractAtImports } from './parsers'
import type { ScanError } from '@shared/types/ipc'
import {
  scanInstructions,
  scanCapabilities,
  scanState,
  scanObservability,
  scanIntegration,
  type ScanContext
} from './scanner'

interface ClaudeCodeAdapterOptions {
  managedDir?: string
}

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly id = 'claude-code'
  readonly displayName = 'Claude Code'

  private claudeDir: string
  private managedDir: string
  private projectDir: string | undefined

  constructor(projectDir?: string, options: ClaudeCodeAdapterOptions = {}) {
    this.claudeDir = path.join(os.homedir(), '.claude')
    this.managedDir = options.managedDir ?? resolveClaudeManagedDir()
    this.projectDir = projectDir
  }

  async detect(): Promise<DetectResult> {
    const paths = await this.scanRoots()
    const installed = fs.existsSync(this.claudeDir) || paths.length > 0
    let version: string | undefined
    if (installed) {
      // Try to read version from a known location
      const statsPath = path.join(this.claudeDir, 'stats-cache.json')
      if (fs.existsSync(statsPath)) {
        try {
          const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'))
          version = stats.version
        } catch {
          // ignore
        }
      }
    }
    return {
      installed,
      version,
      paths
    }
  }

  async scanRoots(): Promise<ScanRoot[]> {
    return (await this.scanSourceCoverage()).filter((source) => source.status === 'scanned')
  }

  async scanSourceCoverage(): Promise<ScanRoot[]> {
    const sources: ScanRoot[] = []
    if (fs.existsSync(this.claudeDir)) {
      sources.push({
        path: this.claudeDir,
        scope: 'user',
        description: 'Claude Code data directory',
        summary:
          'Includes instructions, skills, agents, commands, hooks, plugins, status line, sessions, plans, todos, usage data, and integration state.',
        categories: ['instruction', 'capability', 'state', 'observability', 'integration'],
        kind: 'directory',
        status: 'scanned'
      })
    }
    // ~/.claude.json (MCP config)
    const homeClaudeJson = path.join(os.homedir(), '.claude.json')
    if (fs.existsSync(homeClaudeJson)) {
      sources.push({
        path: homeClaudeJson,
        scope: 'user',
        description: 'Claude Code global config file',
        summary: 'Includes global MCP server definitions.',
        categories: ['capability'],
        kind: 'file',
        status: 'scanned'
      })
    }
    if (this.projectDir) {
      const projectDotClaude = path.join(this.projectDir, '.claude')
      if (fs.existsSync(projectDotClaude)) {
        sources.push({
          path: projectDotClaude,
          scope: 'project',
          description: 'Project Claude Code directory',
          summary:
            'Includes project instructions, skills, agents, commands, hooks, permissions, environment variables, and teams.',
          categories: ['instruction', 'capability'],
          kind: 'directory',
          status: 'scanned'
        })
      }
      const projectMcp = path.join(this.projectDir, '.mcp.json')
      if (fs.existsSync(projectMcp)) {
        sources.push({
          path: projectMcp,
          scope: 'project',
          description: 'Project MCP config file',
          summary: 'Includes project MCP server definitions.',
          categories: ['capability'],
          kind: 'file',
          status: 'scanned'
        })
      }
    }
    const managedSettings = path.join(this.managedDir, 'managed-settings.json')
    if (fs.existsSync(managedSettings)) {
      sources.push({
        path: managedSettings,
        scope: 'enterprise',
        description: 'Claude Code managed settings file',
        summary: 'Includes policy-managed hooks, permissions, environment variables, and status line settings.',
        categories: ['capability'],
        kind: 'file',
        status: 'scanned'
      })
    }
    const managedMcp = path.join(this.managedDir, 'managed-mcp.json')
    if (fs.existsSync(managedMcp)) {
      sources.push({
        path: managedMcp,
        scope: 'enterprise',
        description: 'Claude Code managed MCP file',
        summary: 'Includes policy-managed MCP server definitions.',
        categories: ['capability'],
        kind: 'file',
        status: 'scanned'
      })
    }
    return sources
  }

  async scanAssets(category: AssetCategory): Promise<Asset[]> {
    const ctx = this.createContext()
    switch (category) {
      case 'instruction':
        return scanInstructions(ctx)
      case 'capability':
        return scanCapabilities(ctx)
      case 'state':
        return scanState(ctx)
      case 'observability':
        return scanObservability(ctx)
      case 'integration':
        return scanIntegration(ctx)
    }
  }

  async scanAll(): Promise<{ assets: Asset[]; errors: ScanError[] }> {
    const ctx = this.createContext()
    const assets: Asset[] = [
      ...scanInstructions(ctx),
      ...scanCapabilities(ctx),
      ...scanState(ctx),
      ...scanObservability(ctx),
      ...scanIntegration(ctx)
    ]
    return { assets, errors: ctx.errors }
  }

  watchAssets(callback: (event: WatchEvent) => void): { dispose(): void } {
    // Watching is handled by the engine watcher — this is a no-op stub.
    // The adapter just needs to satisfy the interface.
    void callback
    return { dispose(): void {} }
  }

  async resolveRelations(asset: Asset): Promise<Relation[]> {
    const relations: Relation[] = []

    // @path import resolution for claude-md and agents-md
    if (asset.type === 'claude-md' || asset.type === 'agents-md') {
      const imports = (asset.meta.imports as string[]) ?? []
      if (asset.raw) {
        const freshImports = extractAtImports(asset.raw)
        for (const imp of freshImports) {
          if (!imports.includes(imp)) imports.push(imp)
        }
      }
      for (const imp of imports) {
        const resolved = path.resolve(path.dirname(asset.path), imp)
        relations.push({ from: asset.id, to: resolved, kind: 'imports' })
      }
    }

    return relations
  }

  private createContext(): ScanContext {
    return {
      claudeDir: this.claudeDir,
      projectDir: this.projectDir,
      managedDir: this.managedDir,
      errors: []
    }
  }
}

export function resolveClaudeManagedDir(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'darwin') return '/Library/Application Support/ClaudeCode'
  if (platform === 'win32') return path.join(process.env['ProgramFiles'] ?? 'C:\\Program Files', 'ClaudeCode')
  return '/etc/claude-code'
}
