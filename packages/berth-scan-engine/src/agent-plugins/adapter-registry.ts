import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type {
  AgentCapabilityPluginManifestEntry,
  AgentCapabilityPluginSourceDescriptor
} from '@shared/types/agent-plugin'
import type {
  AgentAdapter,
  Asset,
  AssetScope,
  DetectResult,
  ScanRoot
} from '@shared/types/asset'
import { ClaudeCodeAdapter } from '../adapters/claude-code'
import { CodexAdapter } from '../adapters/codex'
import { PLANNED_AGENT_ADAPTER_DEFINITIONS } from '../adapters/planned-agent-definitions'
import type { AgentAdapterDefinition, AgentAdapterSourcePolicy } from '../adapter-api'
import type { AssetFileCache } from '../engine/assets/file-cache'
import { loadAgentPluginManifests } from './manifest'

export interface AgentAdapterRegistryOptions {
  sessionCache?: AssetFileCache<Asset>
  homeDir?: string
  env?: NodeJS.ProcessEnv
  manifestPaths?: string[]
  loadManifests?: typeof loadAgentPluginManifests
}

export function createAgentAdapters(
  projectDir?: string,
  options: AgentAdapterRegistryOptions = {}
): AgentAdapter[] {
  const homeDir = options.homeDir ?? os.homedir()
  const env = options.env ?? process.env
  const adapters: AgentAdapter[] = [
    new ClaudeCodeAdapter(projectDir, { sessionCache: options.sessionCache, homeDir, env }),
    new CodexAdapter(projectDir, homeDir, env, options.sessionCache),
    ...PLANNED_AGENT_ADAPTER_DEFINITIONS.map((definition) =>
      new DeclaredAgentAdapter(definition, { homeDir, projectDir, env })
    )
  ]
  const loadManifests = options.loadManifests ?? loadAgentPluginManifests
  const manifests = loadManifests({
    homeDir,
    projectDir,
    env,
    manifestPaths: options.manifestPaths,
    reservedIds: ['claude-code', 'codex']
  })

  return [
    ...adapters,
    ...manifests
      .filter(isManifestRuntimeAdapterEnabled)
      .map((manifest) => new ManifestAgentAdapter(manifest, { homeDir, projectDir }))
  ]
}

export interface ManifestAgentAdapterOptions {
  homeDir?: string
  projectDir?: string
}

export class ManifestAgentAdapter implements AgentAdapter {
  readonly id: string
  readonly displayName: string

  private readonly homeDir: string
  private readonly projectDir?: string

  constructor(
    private readonly manifest: AgentCapabilityPluginManifestEntry,
    options: ManifestAgentAdapterOptions = {}
  ) {
    this.id = manifest.id ?? stableManifestId(manifest.path)
    this.displayName = manifest.displayName ?? this.id
    this.homeDir = options.homeDir ?? os.homedir()
    this.projectDir = options.projectDir
  }

  async detect(): Promise<DetectResult> {
    return {
      installed: fs.existsSync(this.manifest.path),
      version: this.manifest.version,
      paths: await this.scanRoots()
    }
  }

  async scanRoots(): Promise<ScanRoot[]> {
    return (await this.scanSourceCoverage()).filter((source) => source.status === 'scanned')
  }

  async scanSourceCoverage(): Promise<ScanRoot[]> {
    return (this.manifest.sourceDescriptors ?? []).map((descriptor) =>
      sourceFromDescriptor(descriptor, {
        homeDir: this.homeDir,
        projectDir: this.projectDir
      })
    )
  }

  async scanAll(): Promise<{ assets: Asset[]; errors: { path: string; type: string; message: string }[] }> {
    return {
      assets: [this.toPluginAsset()],
      errors: []
    }
  }

  private toPluginAsset(): Asset {
    return {
      id: `plugin-${stableManifestId(this.manifest.path)}`,
      agentId: this.manifest.agentCompatibility?.agentId ?? this.id,
      category: 'capability',
      type: 'plugin',
      scope: manifestScope(this.manifest.path, this.projectDir),
      name: this.displayName,
      path: this.manifest.path,
      meta: {
        id: this.manifest.id,
        version: this.manifest.version,
        manifestPath: this.manifest.path,
        implementation: this.manifest.implementation,
        activationReadiness: this.manifest.activationReadiness,
        sourceDescriptors: this.manifest.sourceDescriptors ?? [],
        assetDescriptors: this.manifest.assetDescriptors ?? [],
        references: this.manifest.references ?? []
      }
    }
  }
}

export interface DeclaredAgentAdapterOptions {
  homeDir?: string
  projectDir?: string
  env?: NodeJS.ProcessEnv
}

export class DeclaredAgentAdapter implements AgentAdapter {
  readonly id: string
  readonly displayName: string

  private readonly homeDir: string
  private readonly projectDir?: string
  private readonly env: NodeJS.ProcessEnv

  constructor(
    private readonly definition: AgentAdapterDefinition,
    options: DeclaredAgentAdapterOptions = {}
  ) {
    this.id = definition.id
    this.displayName = definition.displayName
    this.homeDir = options.homeDir ?? os.homedir()
    this.projectDir = options.projectDir
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
        projectDir: this.projectDir,
        env: this.env
      })
    )
  }

  async scanAll(): Promise<{ assets: Asset[]; errors: { path: string; type: string; message: string }[] }> {
    return { assets: [], errors: [] }
  }
}

function isManifestRuntimeAdapterEnabled(manifest: AgentCapabilityPluginManifestEntry): boolean {
  return manifest.status === 'valid' &&
    Boolean(manifest.id) &&
    (manifest.activationReadiness.status === 'metadata-only' ||
      manifest.activationReadiness.status === 'activation-ready')
}

function sourceFromDescriptor(
  descriptor: AgentCapabilityPluginSourceDescriptor,
  options: { homeDir: string; projectDir?: string }
): ScanRoot {
  const resolved = resolvePathPattern(descriptor.pathPattern, options)
  const status = resolved.needsProject && !options.projectDir
    ? 'not-scanned'
    : sourceExists(resolved.path, descriptor.kind)
      ? 'scanned'
      : 'missing'

  return {
    path: resolved.path,
    scope: descriptor.scope,
    code: descriptor.code,
    categories: descriptor.categories,
    kind: descriptor.kind,
    status,
    reason: resolved.needsProject && !options.projectDir ? 'project-not-selected' : undefined
  }
}

function declaredSourceFromPolicy(
  policy: AgentAdapterSourcePolicy,
  options: { homeDir: string; projectDir?: string; env: NodeJS.ProcessEnv }
): ScanRoot {
  const resolved = resolvePathPattern(policy.pathPattern, options)
  const status = resolved.needsProject && !options.projectDir
    ? 'not-scanned'
    : sourceExists(resolved.path, policy.kind)
      ? 'scanned'
      : 'missing'
  const sensitivityReason = policy.sensitivity === 'normal' ? undefined : policy.sensitivity

  return {
    path: resolved.path,
    scope: policy.scope,
    code: policy.code,
    categories: policy.categories,
    kind: policy.kind,
    status,
    reason: resolved.needsProject && !options.projectDir
      ? 'project-not-selected'
      : sensitivityReason
  }
}

function resolvePathPattern(
  pathPattern: string,
  options: { homeDir: string; projectDir?: string; env?: NodeJS.ProcessEnv }
): { path: string; needsProject: boolean } {
  if (pathPattern === '~') return { path: options.homeDir, needsProject: false }
  if (pathPattern.startsWith('~/')) {
    return { path: path.resolve(options.homeDir, pathPattern.slice(2)), needsProject: false }
  }
  if (pathPattern.includes('<cursor-user-data>')) {
    return {
      path: path.normalize(pathPattern.replace(/<cursor-user-data>/g, resolveCursorUserDataDir(options.homeDir, options.env ?? process.env))),
      needsProject: false
    }
  }
  if (pathPattern.includes('<project>')) {
    return {
      path: options.projectDir
        ? path.normalize(pathPattern.replace(/<project>/g, options.projectDir))
        : pathPattern,
      needsProject: true
    }
  }
  return { path: path.normalize(pathPattern), needsProject: false }
}

function resolveCursorUserDataDir(homeDir: string, env: NodeJS.ProcessEnv): string {
  if (process.platform === 'win32') {
    const appData = env.APPDATA?.trim() || path.join(homeDir, 'AppData', 'Roaming')
    return path.join(appData, 'Cursor')
  }
  if (process.platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', 'Cursor')
  }
  const configHome = env.XDG_CONFIG_HOME?.trim() || path.join(homeDir, '.config')
  return path.join(configHome, 'Cursor')
}

function sourceExists(sourcePath: string, kind: ScanRoot['kind']): boolean {
  if (kind === 'policy') return true
  try {
    const stat = fs.statSync(sourcePath)
    return kind === 'directory' ? stat.isDirectory() : stat.isFile()
  } catch {
    return false
  }
}

function manifestScope(manifestPath: string, projectDir?: string): AssetScope {
  if (projectDir && isPathInside(manifestPath, projectDir)) return 'project'
  return 'user'
}

function isPathInside(candidate: string, parent: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate))
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative)
}

function stableManifestId(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
}
