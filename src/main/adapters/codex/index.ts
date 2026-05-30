import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { glob } from 'glob'
import type {
  AgentAdapter,
  Asset,
  AssetCategory,
  DetectResult,
  Relation,
  ScanRoot,
  WatchEvent
} from '../types'
import type { ScanError } from '@shared/types/ipc'
import {
  parseCodexAgentsMd,
  parseCodexConfig,
  parseCodexCustomAgent,
  parseCodexHooksJson,
  parseCodexSessionMeta,
  parseCodexSkill
} from './parsers'
import {
  resolveCodexHomeDir as resolvePrimaryCodexHomeDir,
  resolveCodexHomeDirs
} from '../../agent-homes'

export class CodexAdapter implements AgentAdapter {
  readonly id = 'codex'
  readonly displayName = 'Codex'

  private codexDirs: string[]
  private homeDir: string
  private projectDir?: string

  constructor(projectDir?: string, homeDir = os.homedir(), env = process.env) {
    this.homeDir = homeDir
    this.projectDir = projectDir
    this.codexDirs = resolveCodexHomeDirs(homeDir, env)
  }

  async detect(): Promise<DetectResult> {
    const roots = await this.scanRoots()
    const installed = roots.length > 0
    return {
      installed,
      paths: roots
    }
  }

  async scanRoots(): Promise<ScanRoot[]> {
    return (await this.scanSourceCoverage()).filter((source) => source.status === 'scanned')
  }

  async scanSourceCoverage(): Promise<ScanRoot[]> {
    const roots: ScanRoot[] = []
    for (const codexDir of this.codexDirs) {
      addRoot(
        roots,
        path.join(codexDir, 'config.toml'),
        'user',
        'file',
        'codex.user.config',
        ['capability']
      )
      addRoot(
        roots,
        path.join(codexDir, 'hooks.json'),
        'user',
        'file',
        'codex.user.hooks',
        ['capability']
      )
      addRoot(
        roots,
        path.join(codexDir, 'AGENTS.md'),
        'user',
        'file',
        'codex.user.agents-md',
        ['instruction']
      )
      addRoot(
        roots,
        path.join(codexDir, 'agents'),
        'user',
        'directory',
        'codex.user.agents-directory',
        ['instruction']
      )
      addRoot(
        roots,
        path.join(codexDir, 'skills'),
        'user',
        'directory',
        'codex.user.codex-home-skills',
        ['instruction']
      )
      addRoot(
        roots,
        path.join(codexDir, 'sessions'),
        'user',
        'directory',
        'codex.user.sessions',
        ['state']
      )
      addRoot(
        roots,
        path.join(codexDir, 'archived_sessions'),
        'session',
        'directory',
        'codex.session.archived-sessions',
        ['state']
      )
    }
    addRoot(
      roots,
      path.join(this.homeDir, '.agents', 'skills'),
      'user',
      'directory',
      'codex.user.shared-skills',
      ['instruction']
    )

    if (this.projectDir) {
      addRoot(
        roots,
        path.join(this.projectDir, 'AGENTS.md'),
        'project',
        'file',
        'codex.project.agents-md',
        ['instruction']
      )
      addRoot(
        roots,
        path.join(this.projectDir, '.codex', 'config.toml'),
        'project',
        'file',
        'codex.project.config',
        ['capability']
      )
      addRoot(
        roots,
        path.join(this.projectDir, '.codex', 'hooks.json'),
        'project',
        'file',
        'codex.project.hooks',
        ['capability']
      )
      addRoot(
        roots,
        path.join(this.projectDir, '.codex', 'agents'),
        'project',
        'directory',
        'codex.project.agents-directory',
        ['instruction']
      )
      addRoot(
        roots,
        path.join(this.projectDir, '.agents', 'skills'),
        'project',
        'directory',
        'codex.project.skills',
        ['instruction']
      )
    }

    return roots
  }

  async scanAssets(category: AssetCategory): Promise<Asset[]> {
    const errors: ScanError[] = []
    if (category === 'instruction') return this.scanInstructions(errors)
    if (category === 'capability') return this.scanCapabilities(errors)
    if (category === 'state') return this.scanSessions(errors)
    return []
  }

  async scanAll(): Promise<{ assets: Asset[]; errors: ScanError[] }> {
    const errors: ScanError[] = []
    return {
      assets: [
        ...this.scanInstructions(errors),
        ...this.scanCapabilities(errors),
        ...this.scanSessions(errors)
      ],
      errors
    }
  }

  watchAssets(callback: (event: WatchEvent) => void): { dispose(): void } {
    void callback
    return { dispose(): void {} }
  }

  async resolveRelations(_asset: Asset): Promise<Relation[]> {
    return []
  }

  private scanInstructions(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    for (const codexDir of this.codexDirs) {
      const userAgentsMd = path.join(codexDir, 'AGENTS.md')
      if (fs.existsSync(userAgentsMd)) {
        const asset = safeScan(errors, userAgentsMd, 'agents-md', () =>
          parseCodexAgentsMd(userAgentsMd, 'user')
        )
        if (asset) assets.push(asset)
      }

      assets.push(...scanDir(errors, path.join(codexDir, 'agents'), 'user', '**/*.toml', 'codex-agent', parseCodexCustomAgent))
      assets.push(...scanDir(errors, path.join(codexDir, 'skills'), 'user', '**/SKILL.md', 'codex-skill', parseCodexSkill))
    }

    assets.push(...scanDir(errors, path.join(this.homeDir, '.agents', 'skills'), 'user', '**/SKILL.md', 'codex-skill', parseCodexSkill))

    if (this.projectDir) {
      const projectAgentsMd = path.join(this.projectDir, 'AGENTS.md')
      if (fs.existsSync(projectAgentsMd)) {
        const asset = safeScan(errors, projectAgentsMd, 'agents-md', () =>
          parseCodexAgentsMd(projectAgentsMd, 'project')
        )
        if (asset) assets.push(asset)
      }

      assets.push(...scanDir(errors, path.join(this.projectDir, '.codex', 'agents'), 'project', '**/*.toml', 'codex-agent', parseCodexCustomAgent))
      assets.push(...scanDir(errors, path.join(this.projectDir, '.agents', 'skills'), 'project', '**/SKILL.md', 'codex-skill', parseCodexSkill))
    }

    return assets
  }

  private scanCapabilities(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    for (const codexDir of this.codexDirs) {
      const userConfig = path.join(codexDir, 'config.toml')
      const userHooks = path.join(codexDir, 'hooks.json')
      if (fs.existsSync(userConfig)) {
        assets.push(...(safeScan(errors, userConfig, 'codex-config', () => parseCodexConfig(userConfig, 'user')) ?? []))
      }
      if (fs.existsSync(userHooks)) {
        assets.push(...(safeScan(errors, userHooks, 'codex-hooks', () => parseCodexHooksJson(userHooks, 'user')) ?? []))
      }
    }

    if (this.projectDir) {
      const projectConfig = path.join(this.projectDir, '.codex', 'config.toml')
      const projectHooks = path.join(this.projectDir, '.codex', 'hooks.json')
      if (fs.existsSync(projectConfig)) {
        assets.push(...(safeScan(errors, projectConfig, 'codex-config', () => parseCodexConfig(projectConfig, 'project')) ?? []))
      }
      if (fs.existsSync(projectHooks)) {
        assets.push(...(safeScan(errors, projectHooks, 'codex-hooks', () => parseCodexHooksJson(projectHooks, 'project')) ?? []))
      }
    }

    return assets
  }

  private scanSessions(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    const sessionDirs = this.codexDirs.flatMap((codexDir) => [
      { path: path.join(codexDir, 'sessions'), archived: false },
      { path: path.join(codexDir, 'archived_sessions'), archived: true }
    ])

    for (const sessionDir of sessionDirs) {
      if (!fs.existsSync(sessionDir.path)) continue
      let files: string[] = []
      try {
        files = glob.sync('**/rollout-*.jsonl', {
          cwd: sessionDir.path,
          absolute: true,
          windowsPathsNoEscape: true
        })
      } catch (err) {
        errors.push({
          path: sessionDir.path,
          type: 'session',
          message: err instanceof Error ? err.message : String(err)
        })
        continue
      }

      for (const filePath of files) {
        try {
          const asset = parseCodexSessionMeta(filePath)
          if (sessionDir.archived) asset.meta.archived = true
          assets.push(asset)
        } catch (err) {
          errors.push({
            path: filePath,
            type: 'session',
            message: err instanceof Error ? err.message : String(err)
          })
        }
      }
    }

    return assets
  }
}

export function resolveCodexHomeDir(
  homeDir = os.homedir(),
  env: NodeJS.ProcessEnv = process.env
): string {
  return resolvePrimaryCodexHomeDir(homeDir, env)
}

function addRoot(
  roots: ScanRoot[],
  rootPath: string,
  scope: ScanRoot['scope'],
  kind: NonNullable<ScanRoot['kind']>,
  code: NonNullable<ScanRoot['code']>,
  categories: ScanRoot['categories']
): void {
  if (!fs.existsSync(rootPath)) return
  roots.push({ path: rootPath, scope, code, categories, kind, status: 'scanned' })
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

function scanDir(
  errors: ScanError[],
  dirPath: string,
  scope: ScanRoot['scope'],
  pattern: string,
  type: string,
  parser: (filePath: string, scope: ScanRoot['scope']) => Asset
): Asset[] {
  if (!fs.existsSync(dirPath)) return []
  let files: string[] = []
  try {
    files = glob.sync(pattern, {
      cwd: dirPath,
      absolute: true,
      windowsPathsNoEscape: true
    })
  } catch (err) {
    errors.push({
      path: dirPath,
      type,
      message: err instanceof Error ? err.message : String(err)
    })
    return []
  }

  const assets: Asset[] = []
  for (const filePath of files) {
    const asset = safeScan(errors, filePath, type, () => parser(filePath, scope))
    if (asset) assets.push(asset)
  }
  return assets
}
