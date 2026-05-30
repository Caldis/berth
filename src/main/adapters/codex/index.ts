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

export class CodexAdapter implements AgentAdapter {
  readonly id = 'codex'
  readonly displayName = 'Codex'

  private codexDir: string
  private homeDir: string
  private projectDir?: string

  constructor(projectDir?: string, homeDir = os.homedir()) {
    this.homeDir = homeDir
    this.projectDir = projectDir
    this.codexDir = path.join(homeDir, '.codex')
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
    const roots: ScanRoot[] = []
    addRoot(roots, path.join(this.codexDir, 'config.toml'), 'user', 'Codex user config')
    addRoot(roots, path.join(this.codexDir, 'hooks.json'), 'user', 'Codex user hooks')
    addRoot(roots, path.join(this.codexDir, 'AGENTS.md'), 'user', 'Codex user instructions')
    addRoot(roots, path.join(this.codexDir, 'agents'), 'user', 'Codex user agents')
    addRoot(roots, path.join(this.homeDir, '.agents', 'skills'), 'user', 'Codex user skills')
    addRoot(roots, path.join(this.codexDir, 'sessions'), 'user', 'Codex session history')

    if (this.projectDir) {
      addRoot(roots, path.join(this.projectDir, 'AGENTS.md'), 'project', 'Codex project instructions')
      addRoot(roots, path.join(this.projectDir, '.codex', 'config.toml'), 'project', 'Codex project config')
      addRoot(roots, path.join(this.projectDir, '.codex', 'hooks.json'), 'project', 'Codex project hooks')
      addRoot(roots, path.join(this.projectDir, '.codex', 'agents'), 'project', 'Codex project agents')
      addRoot(roots, path.join(this.projectDir, '.agents', 'skills'), 'project', 'Codex project skills')
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
    const userAgentsMd = path.join(this.codexDir, 'AGENTS.md')
    if (fs.existsSync(userAgentsMd)) {
      const asset = safeScan(errors, userAgentsMd, 'agents-md', () =>
        parseCodexAgentsMd(userAgentsMd, 'user')
      )
      if (asset) assets.push(asset)
    }

    assets.push(...scanDir(errors, path.join(this.codexDir, 'agents'), 'user', '**/*.toml', 'codex-agent', parseCodexCustomAgent))
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
    const userConfig = path.join(this.codexDir, 'config.toml')
    const userHooks = path.join(this.codexDir, 'hooks.json')
    if (fs.existsSync(userConfig)) {
      assets.push(...(safeScan(errors, userConfig, 'codex-config', () => parseCodexConfig(userConfig, 'user')) ?? []))
    }
    if (fs.existsSync(userHooks)) {
      assets.push(...(safeScan(errors, userHooks, 'codex-hooks', () => parseCodexHooksJson(userHooks, 'user')) ?? []))
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
    const sessionsDir = path.join(this.codexDir, 'sessions')
    if (!fs.existsSync(sessionsDir)) return []
    const assets: Asset[] = []
    let files: string[] = []
    try {
      files = glob.sync('**/rollout-*.jsonl', {
        cwd: sessionsDir,
        absolute: true,
        windowsPathsNoEscape: true
      })
    } catch (err) {
      errors.push({
        path: sessionsDir,
        type: 'session',
        message: err instanceof Error ? err.message : String(err)
      })
      return assets
    }

    for (const filePath of files) {
      try {
        assets.push(parseCodexSessionMeta(filePath))
      } catch (err) {
        errors.push({
          path: filePath,
          type: 'session',
          message: err instanceof Error ? err.message : String(err)
        })
      }
    }

    return assets
  }
}

function addRoot(
  roots: ScanRoot[],
  rootPath: string,
  scope: ScanRoot['scope'],
  description: string
): void {
  if (!fs.existsSync(rootPath)) return
  roots.push({ path: rootPath, scope, description })
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
