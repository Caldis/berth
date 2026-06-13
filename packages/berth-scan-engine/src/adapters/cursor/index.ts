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
  parseCursorAgent,
  parseCursorAgentsMd,
  parseCursorCommand,
  parseCursorHooksConfig,
  parseCursorMcpConfig,
  parseCursorPluginManifest,
  parseCursorPolicyConfig,
  parseCursorRule,
  parseCursorSkill
} from './parsers'

export interface CursorAdapterOptions {
  homeDir?: string
  projectDir?: string
  env?: NodeJS.ProcessEnv
}

export class CursorAdapter implements AgentAdapter {
  readonly id = 'cursor'
  readonly displayName = 'Cursor'

  private readonly homeDir: string
  private readonly projectDirs: string[]
  private readonly env: NodeJS.ProcessEnv

  constructor(
    private readonly definition: AgentAdapterDefinition,
    options: CursorAdapterOptions = {}
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
        ...this.scanCapabilities(errors)
      ],
      errors
    }
  }

  private scanInstructions(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    const cursorDir = this.cursorDir()

    assets.push(...scanDir(errors, path.join(cursorDir, 'skills'), 'user', '**/SKILL.md', 'cursor-skill', parseCursorSkill))
    assets.push(...scanDir(errors, path.join(cursorDir, 'agents'), 'user', '**/*.md', 'cursor-agent', parseCursorAgent))

    for (const projectDir of this.projectDirs) {
      assets.push(...scanDir(errors, path.join(projectDir, '.cursor', 'rules'), 'project', '**/*.{md,mdc}', 'cursor-rule', parseCursorRule))
      assets.push(...scanDir(errors, path.join(projectDir, '.cursor', 'skills'), 'project', '**/SKILL.md', 'cursor-skill', parseCursorSkill))
      assets.push(...scanDir(errors, path.join(projectDir, '.cursor', 'agents'), 'project', '**/*.md', 'cursor-agent', parseCursorAgent))
      assets.push(...scanDir(errors, path.join(projectDir, '.cursor', 'commands'), 'project', '**/*.md', 'cursor-command', parseCursorCommand))
      assets.push(...scanFile(errors, path.join(projectDir, 'AGENTS.md'), 'project', 'cursor-agents-md', parseCursorAgentsMd))
    }

    return assets
  }

  private scanCapabilities(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    const cursorDir = this.cursorDir()

    assets.push(...scanFileMany(errors, path.join(cursorDir, 'mcp.json'), 'user', 'cursor-mcp', parseCursorMcpConfig))
    assets.push(...scanFileMany(errors, path.join(cursorDir, 'hooks.json'), 'user', 'cursor-hooks', parseCursorHooksConfig))
    assets.push(...scanFile(errors, path.join(cursorDir, 'permissions.json'), 'user', 'cursor-permissions', (filePath, scope) =>
      parseCursorPolicyConfig(filePath, scope, 'permissions')
    ))
    assets.push(...scanFile(errors, path.join(cursorDir, 'sandbox.json'), 'user', 'cursor-sandbox', (filePath, scope) =>
      parseCursorPolicyConfig(filePath, scope, 'sandbox')
    ))
    assets.push(...this.scanPluginManifests(errors, path.join(cursorDir, 'plugins'), 'user'))

    for (const projectDir of this.projectDirs) {
      const projectCursorDir = path.join(projectDir, '.cursor')
      assets.push(...scanFileMany(errors, path.join(projectCursorDir, 'mcp.json'), 'project', 'cursor-mcp', parseCursorMcpConfig))
      assets.push(...scanFileMany(errors, path.join(projectCursorDir, 'hooks.json'), 'project', 'cursor-hooks', parseCursorHooksConfig))
      assets.push(...scanFile(errors, path.join(projectCursorDir, 'permissions.json'), 'project', 'cursor-permissions', (filePath, scope) =>
        parseCursorPolicyConfig(filePath, scope, 'permissions')
      ))
      assets.push(...scanFile(errors, path.join(projectCursorDir, 'sandbox.json'), 'project', 'cursor-sandbox', (filePath, scope) =>
        parseCursorPolicyConfig(filePath, scope, 'sandbox')
      ))
      assets.push(...this.scanPluginManifests(errors, path.join(projectCursorDir, 'plugins'), 'project'))
    }

    return assets
  }

  private scanPluginManifests(errors: ScanError[], root: string, scope: AssetScope): Asset[] {
    const assets: Asset[] = []
    for (const manifestPath of safeGlob('**/{plugin.json,manifest.json,package.json}', root, errors, 'cursor-plugin')) {
      const plugin = safeScan(errors, manifestPath, 'cursor-plugin', () =>
        parseCursorPluginManifest(manifestPath, scope)
      )
      if (plugin) assets.push(plugin)
    }
    return assets
  }

  private cursorDir(): string {
    const customHome = this.env.CURSOR_HOME?.trim()
    return customHome || path.join(this.homeDir, '.cursor')
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
