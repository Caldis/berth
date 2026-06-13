import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { glob } from 'glob'
import type { AgentAdapterDefinition } from '../../adapter-api'
import type { AgentAdapter, Asset, AssetScope, DetectResult, ScanRoot } from '../types'
import type { ScanError } from '@shared/types/ipc'
import { isRecord, readString } from '../_shared/parser-helpers'
import { declaredSourceFromPolicy } from '../_shared/declared-source-policy'
import {
  parseOpenClawConfig,
  parseOpenClawCredentialPresence,
  parseOpenClawInstructionFile,
  parseOpenClawPluginManifest,
  parseOpenClawSessionIndex,
  parseOpenClawSkill
} from './parsers'

const WORKSPACE_CONTEXT_FILES = [
  'AGENTS.md',
  'SOUL.md',
  'TOOLS.md',
  'IDENTITY.md',
  'USER.md',
  'HEARTBEAT.md',
  'BOOTSTRAP.md',
  'MEMORY.md'
] as const

export interface OpenClawAdapterOptions {
  homeDir?: string
  projectDir?: string
  env?: NodeJS.ProcessEnv
}

export class OpenClawAdapter implements AgentAdapter {
  readonly id = 'openclaw'
  readonly displayName = 'OpenClaw'

  private readonly homeDir: string
  private readonly env: NodeJS.ProcessEnv

  constructor(
    private readonly definition: AgentAdapterDefinition,
    options: OpenClawAdapterOptions = {}
  ) {
    this.homeDir = options.homeDir ?? os.homedir()
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
    for (const workspaceDir of this.workspaceDirs()) {
      for (const fileName of WORKSPACE_CONTEXT_FILES) {
        assets.push(...scanFile(errors, path.join(workspaceDir, fileName), 'user', 'openclaw-context', parseOpenClawInstructionFile))
      }
      assets.push(...scanDir(errors, path.join(workspaceDir, 'skills'), 'user', '**/SKILL.md', 'openclaw-skill', parseOpenClawSkill))
      assets.push(...scanDir(errors, path.join(workspaceDir, '.agents', 'skills'), 'user', '**/SKILL.md', 'openclaw-skill', parseOpenClawSkill))
    }

    assets.push(...scanDir(errors, path.join(this.stateDir(), 'skills'), 'user', '**/SKILL.md', 'openclaw-skill', parseOpenClawSkill))
    assets.push(...scanDir(errors, path.join(this.homeDir, '.agents', 'skills'), 'user', '**/SKILL.md', 'openclaw-shared-skill', parseOpenClawSkill))
    return assets
  }

  private scanCapabilities(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    assets.push(...scanFileMany(errors, this.configPath(), 'user', 'openclaw-config', parseOpenClawConfig))

    assets.push(...this.scanPluginManifests(errors, path.join(this.stateDir(), 'extensions')))
    assets.push(...this.scanPluginManifests(errors, path.join(this.stateDir(), 'plugins')))
    for (const workspaceDir of this.workspaceDirs()) {
      assets.push(...this.scanPluginManifests(errors, path.join(workspaceDir, '.openclaw', 'extensions')))
    }

    return assets
  }

  private scanState(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    for (const sessionIndex of safeGlob('agents/*/sessions/sessions.json', this.stateDir(), errors, 'openclaw-session-index')) {
      assets.push(...scanFileMany(errors, sessionIndex, 'session', 'openclaw-session-index', parseOpenClawSessionIndex))
    }
    return assets
  }

  private scanIntegration(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    assets.push(...scanFile(errors, path.join(this.stateDir(), 'secrets.json'), 'user', 'openclaw-credential', parseOpenClawCredentialPresence))
    assets.push(...scanDir(errors, path.join(this.stateDir(), 'credentials'), 'user', '**/*', 'openclaw-credential', parseOpenClawCredentialPresence))
    for (const authProfile of safeGlob('agents/*/agent/auth-profiles.json', this.stateDir(), errors, 'openclaw-credential')) {
      assets.push(...scanFile(errors, authProfile, 'user', 'openclaw-credential', parseOpenClawCredentialPresence))
    }
    return assets
  }

  private scanPluginManifests(errors: ScanError[], root: string): Asset[] {
    const assets: Asset[] = []
    for (const manifestPath of safeGlob('**/{openclaw.plugin.json,package.json}', root, errors, 'openclaw-plugin')) {
      const pluginAssets = safeScan(errors, manifestPath, 'openclaw-plugin', () =>
        parseOpenClawPluginManifest(manifestPath)
      )
      if (pluginAssets) assets.push(...pluginAssets)
    }
    return assets
  }

  private stateDir(): string {
    const stateDir = this.env.OPENCLAW_STATE_DIR?.trim()
    if (stateDir) return path.resolve(stateDir)
    const openClawHome = this.env.OPENCLAW_HOME?.trim()
    if (openClawHome) return path.join(path.resolve(openClawHome), '.openclaw')
    return path.join(this.homeDir, '.openclaw')
  }

  private configPath(): string {
    const configPath = this.env.OPENCLAW_CONFIG_PATH?.trim()
    return configPath ? path.resolve(configPath) : path.join(this.stateDir(), 'openclaw.json')
  }

  private workspaceDirs(): string[] {
    const dirs = [path.join(this.stateDir(), 'workspace')]
    const configured = readConfiguredWorkspace(this.configPath())
    if (configured) dirs.push(path.isAbsolute(configured) ? configured : path.resolve(this.stateDir(), configured))
    return Array.from(new Set(dirs.map((dir) => path.normalize(dir))))
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

function readConfiguredWorkspace(configPath: string): string | undefined {
  if (!fs.existsSync(configPath)) return undefined
  try {
    const config = JSON.parse(stripJsonComments(fs.readFileSync(configPath, 'utf-8'))) as unknown
    const agents = isRecord(config) && isRecord(config.agents) ? config.agents : undefined
    const defaults = agents && isRecord(agents.defaults) ? agents.defaults : undefined
    return defaults ? readString(defaults, 'workspace') : undefined
  } catch {
    return undefined
  }
}

function stripJsonComments(raw: string): string {
  let result = ''
  let inString = false
  let quote = ''
  let escaped = false
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    const next = raw[index + 1]
    if (inString) {
      result += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        inString = false
      }
      continue
    }
    if (char === '"' || char === "'") {
      inString = true
      quote = char
      result += char
      continue
    }
    if (char === '/' && next === '/') {
      while (index < raw.length && raw[index] !== '\n') index += 1
      result += '\n'
      continue
    }
    if (char === '/' && next === '*') {
      index += 2
      while (index < raw.length && !(raw[index] === '*' && raw[index + 1] === '/')) index += 1
      index += 1
      continue
    }
    result += char
  }
  return result
}
