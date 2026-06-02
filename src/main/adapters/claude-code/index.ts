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
import { resolveClaudeDirs } from '../../agent-homes'
import { resolveProjectConfigRoots } from '../../project-config-roots'

interface ClaudeCodeAdapterOptions {
  managedDir?: string
  env?: NodeJS.ProcessEnv
  homeDir?: string
}

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly id = 'claude-code'
  readonly displayName = 'Claude Code'

  private claudeDir: string
  private claudeDirs: string[]
  private managedDir: string
  private projectDir: string | undefined
  private projectDirs: string[]

  constructor(projectDir?: string, options: ClaudeCodeAdapterOptions = {}) {
    const homeDir = options.homeDir ?? os.homedir()
    this.claudeDirs = resolveClaudeDirs(homeDir, options.env ?? process.env)
    this.claudeDir = this.claudeDirs[0]
    this.managedDir = options.managedDir ?? resolveClaudeManagedDir()
    this.projectDir = projectDir
    this.projectDirs = resolveProjectConfigRoots(projectDir)
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
          version = typeof stats.version === 'string' ? stats.version : undefined
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
    for (const claudeDir of this.claudeDirs) {
      if (!fs.existsSync(claudeDir)) continue
      if (sources.some((source) => source.path === claudeDir)) continue
      sources.push({
        path: claudeDir,
        scope: 'user',
        code: 'claude.user.data-directory',
        categories: ['instruction', 'capability', 'state', 'observability', 'integration'],
        kind: 'directory',
        status: 'scanned'
      })
    }
    // ~/.claude.json (MCP config)
    for (const claudeDir of this.claudeDirs) {
      const homeClaudeJson = path.resolve(claudeDir, '..', '.claude.json')
      if (fs.existsSync(homeClaudeJson)) {
        sources.push({
          path: homeClaudeJson,
          scope: 'user',
          code: 'claude.user.global-config',
          categories: ['capability'],
          kind: 'file',
          status: 'scanned'
        })
      }
    }
    for (const projectDir of this.projectDirs) {
      const projectDotClaude = path.join(projectDir, '.claude')
      if (fs.existsSync(projectDotClaude)) {
        sources.push({
          path: projectDotClaude,
          scope: 'project',
          code: 'claude.project.directory',
          categories: ['instruction', 'capability'],
          kind: 'directory',
          status: 'scanned'
        })
      }
      const projectMcp = path.join(projectDir, '.mcp.json')
      if (fs.existsSync(projectMcp)) {
        sources.push({
          path: projectMcp,
          scope: 'project',
          code: 'claude.project.mcp-config',
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
        code: 'claude.enterprise.managed-settings',
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
        code: 'claude.enterprise.managed-mcp',
        categories: ['capability'],
        kind: 'file',
        status: 'scanned'
      })
    }
    return sources
  }

  async scanAssets(category: AssetCategory): Promise<Asset[]> {
    const errors: ScanError[] = []
    const contexts = this.createContexts(errors)
    const assets: Asset[] = []
    switch (category) {
      case 'instruction':
        for (const ctx of contexts) assets.push(...scanInstructions(ctx))
        return assets
      case 'capability':
        for (const ctx of contexts) assets.push(...scanCapabilities(ctx))
        return assets
      case 'state':
        for (const ctx of contexts) assets.push(...scanState(ctx))
        return assets
      case 'observability':
        for (const ctx of contexts) assets.push(...scanObservability(ctx))
        return assets
      case 'integration':
        for (const ctx of contexts) assets.push(...scanIntegration(ctx))
        return assets
    }
  }

  async scanAll(): Promise<{ assets: Asset[]; errors: ScanError[] }> {
    const errors: ScanError[] = []
    const assets: Asset[] = []
    for (const ctx of this.createContexts(errors)) {
      assets.push(
        ...scanInstructions(ctx),
        ...scanCapabilities(ctx),
        ...scanState(ctx),
        ...scanObservability(ctx),
        ...scanIntegration(ctx)
      )
    }
    return { assets, errors }
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

  private createContexts(errors: ScanError[]): ScanContext[] {
    return this.claudeDirs.map((claudeDir, index) => ({
      claudeDir,
      projectDir: index === 0 ? this.projectDir : undefined,
      projectDirs: index === 0 ? this.projectDirs : undefined,
      managedDir: index === 0 ? this.managedDir : undefined,
      errors
    }))
  }
}

export function resolveClaudeManagedDir(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'darwin') return '/Library/Application Support/ClaudeCode'
  if (platform === 'win32') return path.join(process.env['ProgramFiles'] ?? 'C:\\Program Files', 'ClaudeCode')
  return '/etc/claude-code'
}
