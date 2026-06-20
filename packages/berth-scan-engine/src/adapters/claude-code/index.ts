import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { AdapterScanOptions, AgentAdapter, Asset, DetectResult, ScanRoot } from '../types'
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
import type { AssetFileCache } from '../../engine/assets/file-cache'
import { CLAUDE_SOURCE_DESCRIPTORS } from './descriptors'
import { scanRootFromDescriptor } from '../_shared/source-descriptors'

interface ClaudeCodeAdapterOptions {
  managedDir?: string
  env?: NodeJS.ProcessEnv
  homeDir?: string
  sessionCache?: AssetFileCache<Asset>
}

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly id = 'claude-code'
  readonly displayName = 'Claude Code'

  private claudeDir: string
  private claudeDirs: string[]
  private managedDir: string
  private projectDir: string | undefined
  private projectDirs: string[]
  private sessionCache: AssetFileCache<Asset> | undefined

  constructor(projectDir?: string, options: ClaudeCodeAdapterOptions = {}) {
    const homeDir = options.homeDir ?? os.homedir()
    this.claudeDirs = resolveClaudeDirs(homeDir, options.env ?? process.env)
    this.claudeDir = this.claudeDirs[0]
    this.managedDir = options.managedDir ?? resolveClaudeManagedDir()
    this.projectDir = projectDir
    this.projectDirs = resolveProjectConfigRoots(projectDir)
    this.sessionCache = options.sessionCache
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
      sources.push(scanRootFromDescriptor(CLAUDE_SOURCE_DESCRIPTORS, 'claude.user.data-directory', claudeDir))
    }
    // ~/.claude.json (MCP config)
    for (const claudeDir of this.claudeDirs) {
      const homeClaudeJson = path.resolve(claudeDir, '..', '.claude.json')
      if (fs.existsSync(homeClaudeJson)) {
        sources.push(scanRootFromDescriptor(CLAUDE_SOURCE_DESCRIPTORS, 'claude.user.global-config', homeClaudeJson))
      }
    }
    for (const projectDir of this.projectDirs) {
      const projectDotClaude = path.join(projectDir, '.claude')
      if (fs.existsSync(projectDotClaude)) {
        sources.push(scanRootFromDescriptor(CLAUDE_SOURCE_DESCRIPTORS, 'claude.project.directory', projectDotClaude))
      }
      const projectMcp = path.join(projectDir, '.mcp.json')
      if (fs.existsSync(projectMcp)) {
        sources.push(scanRootFromDescriptor(CLAUDE_SOURCE_DESCRIPTORS, 'claude.project.mcp-config', projectMcp))
      }
    }
    const managedSettings = path.join(this.managedDir, 'managed-settings.json')
    if (fs.existsSync(managedSettings)) {
      sources.push(scanRootFromDescriptor(CLAUDE_SOURCE_DESCRIPTORS, 'claude.enterprise.managed-settings', managedSettings))
    }
    const managedMcp = path.join(this.managedDir, 'managed-mcp.json')
    if (fs.existsSync(managedMcp)) {
      sources.push(scanRootFromDescriptor(CLAUDE_SOURCE_DESCRIPTORS, 'claude.enterprise.managed-mcp', managedMcp))
    }
    return sources
  }


  async scanAll(options: AdapterScanOptions = {}): Promise<{ assets: Asset[]; errors: ScanError[] }> {
    const errors: ScanError[] = []
    const assets: Asset[] = []
    for (const ctx of this.createContexts(errors, options)) {
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


  private createContexts(errors: ScanError[], options: AdapterScanOptions = {}): ScanContext[] {
    return this.claudeDirs.map((claudeDir, index) => ({
      claudeDir,
      projectDir: index === 0 ? this.projectDir : undefined,
      projectDirs: index === 0 ? this.projectDirs : undefined,
      managedDir: index === 0 ? this.managedDir : undefined,
      errors,
      sessionCache: this.sessionCache,
      excludePaths: options.excludePaths,
      respectGitignore: options.respectGitignore,
      onFileProgress: options.onFileProgress
    }))
  }
}

export function resolveClaudeManagedDir(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'darwin') return '/Library/Application Support/ClaudeCode'
  if (platform === 'win32') return path.join(process.env['ProgramFiles'] ?? 'C:\\Program Files', 'ClaudeCode')
  return '/etc/claude-code'
}
