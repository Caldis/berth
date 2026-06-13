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
  parseCopilotAgent,
  parseCopilotCredentialPresence,
  parseCopilotHookFile,
  parseCopilotInstructionFile,
  parseCopilotMcpConfig,
  parseCopilotPluginManifest,
  parseCopilotSettings,
  parseCopilotSkill
} from './parsers'

export interface GitHubCopilotCliAdapterOptions {
  homeDir?: string
  projectDir?: string
  env?: NodeJS.ProcessEnv
}

export class GitHubCopilotCliAdapter implements AgentAdapter {
  readonly id = 'github-copilot-cli'
  readonly displayName = 'GitHub Copilot CLI'

  private readonly homeDir: string
  private readonly projectDirs: string[]
  private readonly env: NodeJS.ProcessEnv

  constructor(
    private readonly definition: AgentAdapterDefinition,
    options: GitHubCopilotCliAdapterOptions = {}
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
    const copilotDir = this.copilotDir()

    assets.push(...scanFile(errors, path.join(copilotDir, 'copilot-instructions.md'), 'user', 'copilot-instruction', (filePath, scope) =>
      parseCopilotInstructionFile(filePath, scope, 'copilot-user-instructions')
    ))
    assets.push(...scanDir(errors, path.join(copilotDir, 'instructions'), 'user', '**/*.instructions.md', 'copilot-instruction', (filePath, scope) =>
      parseCopilotInstructionFile(filePath, scope, 'copilot-user-instructions-directory')
    ))
    assets.push(...scanDir(errors, path.join(copilotDir, 'agents'), 'user', '**/*.agent.md', 'copilot-agent', parseCopilotAgent))
    assets.push(...scanDir(errors, path.join(copilotDir, 'skills'), 'user', '**/SKILL.md', 'copilot-skill', parseCopilotSkill))
    assets.push(...scanDir(errors, path.join(this.homeDir, '.agents', 'skills'), 'user', '**/SKILL.md', 'copilot-shared-skill', parseCopilotSkill))

    for (const customDir of this.customInstructionDirs()) {
      assets.push(...scanFile(errors, path.join(customDir, 'AGENTS.md'), 'user', 'copilot-agents-md', (filePath, scope) =>
        parseCopilotInstructionFile(filePath, scope, 'copilot-custom-instructions-dir')
      ))
      assets.push(...scanDir(errors, path.join(customDir, '.github', 'instructions'), 'user', '**/*.instructions.md', 'copilot-instruction', (filePath, scope) =>
        parseCopilotInstructionFile(filePath, scope, 'copilot-custom-instructions-dir')
      ))
    }

    for (const projectDir of this.projectDirs) {
      assets.push(...scanFile(errors, path.join(projectDir, 'AGENTS.md'), 'project', 'copilot-agents-md', (filePath, scope) =>
        parseCopilotInstructionFile(filePath, scope, 'copilot-project-agents-md')
      ))
      assets.push(...scanFile(errors, path.join(projectDir, '.github', 'copilot-instructions.md'), 'project', 'copilot-instruction', (filePath, scope) =>
        parseCopilotInstructionFile(filePath, scope, 'copilot-project-instructions')
      ))
      assets.push(...scanDir(errors, path.join(projectDir, '.github', 'instructions'), 'project', '**/*.instructions.md', 'copilot-instruction', (filePath, scope) =>
        parseCopilotInstructionFile(filePath, scope, 'copilot-project-instructions-directory')
      ))
      assets.push(...scanDir(errors, path.join(projectDir, '.github', 'agents'), 'project', '**/*.agent.md', 'copilot-agent', parseCopilotAgent))
      assets.push(...scanDir(errors, path.join(projectDir, '.github', 'skills'), 'project', '**/SKILL.md', 'copilot-skill', parseCopilotSkill))
      assets.push(...scanDir(errors, path.join(projectDir, '.agents', 'skills'), 'project', '**/SKILL.md', 'copilot-shared-skill', parseCopilotSkill))
    }

    return assets
  }

  private scanCapabilities(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    const copilotDir = this.copilotDir()

    for (const filePath of [
      path.join(copilotDir, 'settings.json'),
      ...this.projectDirs.flatMap((projectDir) => [
        path.join(projectDir, '.github', 'copilot', 'settings.json'),
        path.join(projectDir, '.github', 'copilot', 'settings.local.json')
      ])
    ]) {
      const scope: AssetScope = isProjectPath(filePath, this.projectDirs) ? 'project' : 'user'
      assets.push(...scanFileMany(errors, filePath, scope, 'copilot-settings', parseCopilotSettings))
    }

    for (const [filePath, scope] of this.mcpConfigFiles()) {
      assets.push(...scanFileMany(errors, filePath, scope, 'copilot-mcp-config', parseCopilotMcpConfig))
    }

    assets.push(...scanDir(errors, path.join(copilotDir, 'hooks'), 'user', '**/*', 'copilot-hook', parseCopilotHookFile))
    for (const projectDir of this.projectDirs) {
      assets.push(...scanDir(errors, path.join(projectDir, '.github', 'hooks'), 'project', '**/*', 'copilot-hook', parseCopilotHookFile))
    }

    for (const manifestPath of safeGlob('**/{plugin.json,manifest.json,package.json}', path.join(copilotDir, 'installed-plugins'), errors, 'copilot-plugin')) {
      const plugin = safeScan(errors, manifestPath, 'copilot-plugin', () =>
        parseCopilotPluginManifest(manifestPath)
      )
      if (plugin) assets.push(plugin)
    }

    return assets
  }

  private scanIntegration(errors: ScanError[]): Asset[] {
    const configPath = path.join(this.copilotDir(), 'config.json')
    if (!fs.existsSync(configPath)) return []
    const credential = safeScan(errors, configPath, 'copilot-credential', () =>
      parseCopilotCredentialPresence(configPath)
    )
    return credential ? [credential] : []
  }

  private mcpConfigFiles(): Array<[string, AssetScope]> {
    const files: Array<[string, AssetScope]> = [
      [path.join(this.copilotDir(), 'mcp-config.json'), 'user']
    ]
    for (const projectDir of this.projectDirs) {
      files.push(
        [path.join(projectDir, '.github', 'mcp.json'), 'project'],
        [path.join(projectDir, '.mcp.json'), 'project']
      )
    }
    return files
  }

  private customInstructionDirs(): string[] {
    const raw = this.env.COPILOT_CUSTOM_INSTRUCTIONS_DIRS?.trim()
    if (!raw) return []
    return raw.split(',').map((item) => item.trim()).filter(Boolean)
  }

  private copilotDir(): string {
    const customHome = this.env.COPILOT_HOME?.trim()
    return customHome || path.join(this.homeDir, '.copilot')
  }
}

function scanFile(
  errors: ScanError[],
  filePath: string,
  scope: AssetScope,
  type: string,
  parser: (filePath: string, scope: AssetScope) => Asset
): Asset[] {
  if (!fs.existsSync(filePath)) return []
  const asset = safeScan(errors, filePath, type, () => parser(filePath, scope))
  return asset ? [asset] : []
}

function scanFileMany(
  errors: ScanError[],
  filePath: string,
  scope: AssetScope,
  type: string,
  parser: (filePath: string, scope: AssetScope) => Asset[]
): Asset[] {
  if (!fs.existsSync(filePath)) return []
  return safeScan(errors, filePath, type, () => parser(filePath, scope)) ?? []
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
      nodir: true,
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

function isProjectPath(filePath: string, projectDirs: string[]): boolean {
  return projectDirs.some((projectDir) => path.resolve(filePath).startsWith(path.resolve(projectDir)))
}
