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

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly id = 'claude-code'
  readonly displayName = 'Claude Code'

  private claudeDir: string
  private projectDir: string | undefined

  constructor(projectDir?: string) {
    this.claudeDir = path.join(os.homedir(), '.claude')
    this.projectDir = projectDir
  }

  async detect(): Promise<DetectResult> {
    const installed = fs.existsSync(this.claudeDir)
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
      paths: await this.scanRoots()
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
      errors: []
    }
  }
}
