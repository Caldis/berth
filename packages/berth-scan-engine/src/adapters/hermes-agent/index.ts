import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { glob } from 'glob'
import type { AgentAdapterDefinition } from '../../adapter-api'
import type { AgentAdapter, Asset, AssetScope, DetectResult, ScanRoot } from '../types'
import type { ScanError } from '@shared/types/ipc'
import { declaredSourceFromPolicy } from '../_shared/declared-source-policy'
import { detectedFromSources } from '../_shared/detect'
import { resolveProjectConfigRoots } from '../../project-config-roots'
import {
  parseHermesConfig,
  parseHermesContextFile,
  parseHermesCredentialPresence,
  parseHermesHookManifest,
  parseHermesPluginManifest,
  parseHermesSessionIndex,
  parseHermesSkill
} from './parsers'

export interface HermesAgentAdapterOptions {
  homeDir?: string
  projectDir?: string
  env?: NodeJS.ProcessEnv
}

export class HermesAgentAdapter implements AgentAdapter {
  readonly id = 'hermes-agent'
  readonly displayName = 'Hermes Agent'

  private readonly homeDir: string
  private readonly projectDirs: string[]
  private readonly env: NodeJS.ProcessEnv

  constructor(
    private readonly definition: AgentAdapterDefinition,
    options: HermesAgentAdapterOptions = {}
  ) {
    this.homeDir = options.homeDir ?? os.homedir()
    this.projectDirs = resolveProjectConfigRoots(options.projectDir)
    this.env = options.env ?? process.env
  }

  async detect(): Promise<DetectResult> {
    const paths = await this.scanRoots()
    const installed = detectedFromSources(paths, isHermesDetectionSource)
    return {
      installed,
      version: installed ? this.definition.version : undefined,
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
        ...this.scanState(errors),
        ...this.scanIntegration(errors)
      ],
      errors
    }
  }

  private scanInstructions(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    const hermesHome = this.hermesHome()

    assets.push(...scanFile(errors, path.join(hermesHome, 'SOUL.md'), 'user', 'hermes-context', (filePath, scope) =>
      parseHermesContextFile(filePath, scope, 'hermes-user-identity')
    ))
    assets.push(...scanDir(errors, path.join(hermesHome, 'skills'), 'user', '**/SKILL.md', 'hermes-skill', parseHermesSkill))

    for (const projectDir of this.projectDirs) {
      assets.push(...scanFile(errors, path.join(projectDir, '.hermes.md'), 'project', 'hermes-context', (filePath, scope) =>
        parseHermesContextFile(filePath, scope, 'hermes-project-context')
      ))
      assets.push(...scanFile(errors, path.join(projectDir, 'HERMES.md'), 'project', 'hermes-context', (filePath, scope) =>
        parseHermesContextFile(filePath, scope, 'hermes-project-context')
      ))
      assets.push(...scanFile(errors, path.join(projectDir, 'AGENTS.md'), 'project', 'hermes-context', (filePath, scope) =>
        parseHermesContextFile(filePath, scope, 'hermes-project-agents-md')
      ))
    }

    return assets
  }

  private scanCapabilities(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    const hermesHome = this.hermesHome()

    assets.push(...scanFileMany(errors, path.join(hermesHome, 'config.yaml'), 'user', 'hermes-config', parseHermesConfig))
    assets.push(...scanDir(errors, path.join(hermesHome, 'plugins'), 'user', '**/plugin.yaml', 'hermes-plugin', parseHermesPluginManifest))
    assets.push(...scanDir(errors, path.join(hermesHome, 'hooks'), 'user', '**/HOOK.yaml', 'hermes-hook', parseHermesHookManifest))

    return assets
  }

  private scanState(errors: ScanError[]): Asset[] {
    return scanFileMany(
      errors,
      path.join(this.hermesHome(), 'sessions', 'sessions.json'),
      'session',
      'hermes-session-index',
      parseHermesSessionIndex
    )
  }

  private scanIntegration(errors: ScanError[]): Asset[] {
    const hermesHome = this.hermesHome()
    return [
      ...scanFile(errors, path.join(hermesHome, '.env'), 'user', 'hermes-credential', parseHermesCredentialPresence),
      ...scanFile(errors, path.join(hermesHome, 'auth.json'), 'user', 'hermes-credential', parseHermesCredentialPresence)
    ]
  }

  private hermesHome(): string {
    const customHome = this.env.HERMES_HOME?.trim()
    if (customHome) return path.resolve(customHome)
    if (process.platform === 'win32') {
      const localAppData = this.env.LOCALAPPDATA?.trim() || path.join(this.homeDir, 'AppData', 'Local')
      return path.join(localAppData, 'hermes')
    }
    return path.join(this.homeDir, '.hermes')
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

function isHermesDetectionSource(source: ScanRoot): boolean {
  return source.code !== 'hermes.project.agents-md' &&
    source.code !== 'hermes.project.claude-md' &&
    source.code !== 'hermes.project.cursor-rules'
}
