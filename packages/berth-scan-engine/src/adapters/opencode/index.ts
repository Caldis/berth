import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { glob } from 'glob'
import type { AgentAdapterDefinition } from '../../adapter-api'
import type { AgentAdapter, Asset, AssetScope, DetectResult, ScanRoot } from '../types'
import type { ScanError } from '@shared/types/ipc'
import { declaredSourceFromPolicy } from '../_shared/declared-source-policy'
import { resolveProjectConfigRoots } from '../../project-config-roots'
import {
  parseOpenCodeAgent,
  parseOpenCodeAgentsMd,
  parseOpenCodeCommand,
  parseOpenCodeConfig,
  parseOpenCodeCredentialPresence,
  parseOpenCodePluginManifest,
  parseOpenCodeSkill
} from './parsers'

export interface OpenCodeAdapterOptions {
  homeDir?: string
  projectDir?: string
  env?: NodeJS.ProcessEnv
}

export class OpenCodeAdapter implements AgentAdapter {
  readonly id = 'opencode'
  readonly displayName = 'OpenCode'

  private readonly homeDir: string
  private readonly projectDirs: string[]
  private readonly env: NodeJS.ProcessEnv

  constructor(
    private readonly definition: AgentAdapterDefinition,
    options: OpenCodeAdapterOptions = {}
  ) {
    this.homeDir = options.homeDir ?? os.homedir()
    this.projectDirs = resolveProjectConfigRoots(options.projectDir)
    this.env = options.env ?? process.env
  }

  async detect(): Promise<DetectResult> {
    const paths = await this.scanRoots()
    return {
      installed: paths.length > 0,
      version: paths.length > 0 ? this.definition.version : undefined,
      paths
    }
  }

  async scanRoots(): Promise<ScanRoot[]> {
    return (await this.scanSourceCoverage()).filter((source) => source.status === 'scanned')
  }

  async scanSourceCoverage(): Promise<ScanRoot[]> {
    return this.definition.sources.map((source) =>
      declaredSourceFromPolicy(source, {
        homeDir: this.homeDir,
        projectDir: this.projectDirs[0],
        env: this.env
      })
    )
  }

  async scanAll(): Promise<{ assets: Asset[]; errors: ScanError[] }> {
    const errors: ScanError[] = []
    return {
      assets: [
        ...this.scanInstructions(errors),
        ...this.scanCapabilities(errors),
        ...this.scanIntegration(errors)
      ],
      errors
    }
  }

  private scanInstructions(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    const userConfigDir = this.configDir()
    const instructionSources: Array<[string, AssetScope]> = [
      [path.join(userConfigDir, 'AGENTS.md'), 'user']
    ]
    for (const projectDir of this.projectDirs) {
      instructionSources.push([path.join(projectDir, 'AGENTS.md'), 'project'])
    }
    for (const [filePath, scope] of instructionSources) {
      if (!fs.existsSync(filePath)) continue
      const asset = safeScan(errors, filePath, 'opencode-agents-md', () =>
        parseOpenCodeAgentsMd(filePath, scope)
      )
      if (asset) assets.push(asset)
    }

    assets.push(...this.scanInstructionDirs(errors, userConfigDir, 'user'))
    for (const projectDir of this.projectDirs) {
      assets.push(...this.scanInstructionDirs(errors, path.join(projectDir, '.opencode'), 'project'))
    }

    return assets
  }

  private scanCapabilities(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    for (const [filePath, scope] of this.configFiles()) {
      if (!fs.existsSync(filePath)) continue
      const configAssets = safeScan(errors, filePath, 'opencode-config', () =>
        parseOpenCodeConfig(filePath, scope)
      )
      if (configAssets) assets.push(...configAssets)
    }

    assets.push(...this.scanPluginManifests(errors, this.configDir(), 'user'))
    for (const projectDir of this.projectDirs) {
      assets.push(...this.scanPluginManifests(errors, path.join(projectDir, '.opencode'), 'project'))
    }

    return assets
  }

  private scanIntegration(errors: ScanError[]): Asset[] {
    const authPath = path.join(this.dataDir(), 'auth.json')
    if (!fs.existsSync(authPath)) return []
    const asset = safeScan(errors, authPath, 'opencode-credential', () =>
      parseOpenCodeCredentialPresence(authPath)
    )
    return asset ? [asset] : []
  }

  private scanInstructionDirs(errors: ScanError[], root: string, scope: AssetScope): Asset[] {
    return [
      ...scanDir(errors, path.join(root, 'skills'), scope, '**/SKILL.md', 'opencode-skill', parseOpenCodeSkill),
      ...scanDir(errors, path.join(root, 'agents'), scope, '**/*.md', 'opencode-agent', parseOpenCodeAgent),
      ...scanDir(errors, path.join(root, 'commands'), scope, '**/*.md', 'opencode-command', parseOpenCodeCommand)
    ]
  }

  private scanPluginManifests(errors: ScanError[], root: string, scope: AssetScope): Asset[] {
    const assets: Asset[] = []
    for (const manifestPath of safeGlob('plugins/**/plugin.json', root, errors, 'opencode-plugin')) {
      const plugin = safeScan(errors, manifestPath, 'opencode-plugin', () =>
        parseOpenCodePluginManifest(manifestPath, scope)
      )
      if (plugin) assets.push(plugin)
    }
    return assets
  }

  private configFiles(): Array<[string, AssetScope]> {
    const userConfigDir = this.configDir()
    const files: Array<[string, AssetScope]> = [
      [path.join(userConfigDir, 'opencode.jsonc'), 'user'],
      [path.join(userConfigDir, 'opencode.json'), 'user'],
      [path.join(userConfigDir, 'config.json'), 'user']
    ]
    const customConfig = this.env.OPENCODE_CONFIG?.trim()
    if (customConfig) files.push([customConfig, 'user'])
    for (const projectDir of this.projectDirs) {
      files.push(
        [path.join(projectDir, 'opencode.jsonc'), 'project'],
        [path.join(projectDir, 'opencode.json'), 'project'],
        [path.join(projectDir, '.opencode', 'opencode.jsonc'), 'project'],
        [path.join(projectDir, '.opencode', 'opencode.json'), 'project']
      )
    }
    return files
  }

  private configDir(): string {
    const customConfigDir = this.env.OPENCODE_CONFIG_DIR?.trim()
    if (customConfigDir) return customConfigDir
    const configHome = this.env.XDG_CONFIG_HOME?.trim() || path.join(this.homeDir, '.config')
    return path.join(configHome, 'opencode')
  }

  private dataDir(): string {
    const dataHome = this.env.XDG_DATA_HOME?.trim() || path.join(this.homeDir, '.local', 'share')
    return path.join(dataHome, 'opencode')
  }
}

function safeScan<T>(
  errors: ScanError[],
  filePath: string,
  type: string,
  fn: () => T
): T | null {
  try {
    return fn()
  } catch (err) {
    errors.push({
      path: filePath,
      type,
      message: err instanceof Error ? err.message : String(err)
    })
    return null
  }
}

function safeGlob(
  pattern: string,
  cwd: string,
  errors: ScanError[],
  type: string
): string[] {
  if (!fs.existsSync(cwd)) return []
  try {
    return glob.sync(pattern, {
      cwd,
      absolute: true,
      windowsPathsNoEscape: true
    })
  } catch (err) {
    errors.push({
      path: cwd,
      type,
      message: err instanceof Error ? err.message : String(err)
    })
    return []
  }
}

function scanDir(
  errors: ScanError[],
  dirPath: string,
  scope: AssetScope,
  pattern: string,
  type: string,
  parser: (filePath: string, scope: AssetScope) => Asset
): Asset[] {
  const assets: Asset[] = []
  for (const filePath of safeGlob(pattern, dirPath, errors, type)) {
    const asset = safeScan(errors, filePath, type, () => parser(filePath, scope))
    if (asset) assets.push(asset)
  }
  return assets
}
