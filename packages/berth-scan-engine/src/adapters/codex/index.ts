import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { glob } from 'glob'
import { parse as parseToml } from 'smol-toml'
import type { AgentAdapter, Asset, DetectResult, ScanRoot } from '../types'
import type { ScanError } from '@shared/types/ipc'
import {
  parseCodexAgentsMd,
  parseCodexConfig,
  parseCodexCustomAgent,
  parseCodexHooksJson,
  readCodexSessionTitleIndex,
  parseCodexSessionMeta,
  parseCodexSkill
} from './parsers'
import {
  resolveCodexHomeDirs
} from '../../agent-homes'
import { resolveProjectConfigRoots } from '../../project-config-roots'
import type { AssetFileCache } from '../../engine/assets/file-cache'
import { CODEX_SOURCE_DESCRIPTORS } from './descriptors'
import { scanRootFromDescriptor } from '../_shared/source-descriptors'

export class CodexAdapter implements AgentAdapter {
  readonly id = 'codex'
  readonly displayName = 'Codex'

  private codexDirs: string[]
  private homeDir: string
  private projectDirs: string[]
  private sessionCache: AssetFileCache<Asset> | undefined

  constructor(
    projectDir?: string,
    homeDir = os.homedir(),
    env = process.env,
    sessionCache?: AssetFileCache<Asset>
  ) {
    this.homeDir = homeDir
    this.projectDirs = resolveProjectConfigRoots(projectDir)
    this.codexDirs = resolveCodexHomeDirs(homeDir, env)
    this.sessionCache = sessionCache
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
      addRoot(roots, path.join(codexDir, 'config.toml'), 'codex.user.config')
      addRoot(roots, path.join(codexDir, 'hooks.json'), 'codex.user.hooks')
      addRoot(roots, path.join(codexDir, 'AGENTS.md'), 'codex.user.agents-md')
      addRoot(roots, path.join(codexDir, 'agents'), 'codex.user.agents-directory')
      addRoot(roots, path.join(codexDir, 'skills'), 'codex.user.codex-home-skills')
      addRoot(roots, path.join(codexDir, 'sessions'), 'codex.user.sessions')
      addRoot(roots, path.join(codexDir, 'archived_sessions'), 'codex.session.archived-sessions')
    }
    addRoot(roots, path.join(this.homeDir, '.agents', 'skills'), 'codex.user.shared-skills')

    for (const projectDir of this.projectDirs) {
      addRoot(roots, path.join(projectDir, 'AGENTS.md'), 'codex.project.agents-md')
      addRoot(roots, path.join(projectDir, '.codex', 'config.toml'), 'codex.project.config')
      addRoot(roots, path.join(projectDir, '.codex', 'hooks.json'), 'codex.project.hooks')
      addRoot(roots, path.join(projectDir, '.codex', 'agents'), 'codex.project.agents-directory')
      addRoot(roots, path.join(projectDir, '.agents', 'skills'), 'codex.project.skills')
    }

    return roots
  }


  async scanAll(): Promise<{ assets: Asset[]; errors: ScanError[] }> {
    const errors: ScanError[] = []
    return {
      assets: [
        ...this.scanInstructions(errors),
        ...this.scanCapabilities(errors),
        ...this.scanSessions(errors),
        ...this.scanCodexPlugins(errors)
      ],
      errors
    }
  }

  // Codex plugins: ~/.codex/plugins/<marketplace>/<plugin>/manifest.toml bundling
  // skills (skills/**/SKILL.md) and hooks (hooks.json). Components are tagged with
  // pluginId so the central relations resolver links them (contains / belongs-to).
  private scanCodexPlugins(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    for (const codexDir of this.codexDirs) {
      const pluginsRoot = path.join(codexDir, 'plugins')
      if (!fs.existsSync(pluginsRoot)) continue
      let manifests: string[] = []
      try {
        manifests = glob.sync('*/*/manifest.toml', {
          cwd: pluginsRoot,
          absolute: true,
          windowsPathsNoEscape: true
        })
      } catch (err) {
        errors.push({
          path: pluginsRoot,
          type: 'codex-plugin',
          message: err instanceof Error ? err.message : String(err)
        })
        continue
      }

      for (const manifestPath of manifests) {
        const root = path.dirname(manifestPath)
        const rel = path.relative(pluginsRoot, root).split(/[\\/]/).filter(Boolean)
        const marketplace = rel[0] ?? 'unknown'
        const manifest =
          safeScan(errors, manifestPath, 'codex-plugin', () => {
            const parsed = parseToml(fs.readFileSync(manifestPath, 'utf-8'))
            return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
          }) ?? {}
        const name = typeof manifest.name === 'string' ? manifest.name : path.basename(root)
        const version = typeof manifest.version === 'string' ? manifest.version : 'unknown'
        const pluginId = `codex-plugin:${marketplace}/${name}@${version}`
        const plugin: Asset = {
          id: pluginId,
          agentId: 'codex',
          category: 'capability',
          type: 'plugin',
          scope: 'user',
          name,
          path: root,
          meta: { marketplace, version, manifestPath, origin: 'codex-plugin' }
        }
        assets.push(plugin)

        const tag = (asset: Asset): Asset => ({
          ...asset,
          scope: 'user',
          meta: { ...asset.meta, pluginId, pluginName: name, marketplace, origin: 'codex-plugin' }
        })

        assets.push(
          ...scanDir(errors, path.join(root, 'skills'), 'user', '**/SKILL.md', 'codex-plugin-skill', parseCodexSkill).map(tag)
        )
        const hooksPath = path.join(root, 'hooks.json')
        if (fs.existsSync(hooksPath)) {
          const hooks = safeScan(errors, hooksPath, 'codex-plugin-hook', () => parseCodexHooksJson(hooksPath, 'user'))
          if (hooks) assets.push(...hooks.map(tag))
        }
      }
    }
    return assets
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

    for (const projectDir of this.projectDirs) {
      const projectAgentsMd = path.join(projectDir, 'AGENTS.md')
      if (fs.existsSync(projectAgentsMd)) {
        const asset = safeScan(errors, projectAgentsMd, 'agents-md', () =>
          parseCodexAgentsMd(projectAgentsMd, 'project')
        )
        if (asset) assets.push(asset)
      }

      assets.push(...scanDir(errors, path.join(projectDir, '.codex', 'agents'), 'project', '**/*.toml', 'codex-agent', parseCodexCustomAgent))
      assets.push(...scanDir(errors, path.join(projectDir, '.agents', 'skills'), 'project', '**/SKILL.md', 'codex-skill', parseCodexSkill))
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

    for (const projectDir of this.projectDirs) {
      const projectConfig = path.join(projectDir, '.codex', 'config.toml')
      const projectHooks = path.join(projectDir, '.codex', 'hooks.json')
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

    for (const codexDir of this.codexDirs) {
      const titleIndex = readCodexSessionTitleIndex(codexDir)
      const sessionDirs = [
        { path: path.join(codexDir, 'sessions'), archived: false },
        { path: path.join(codexDir, 'archived_sessions'), archived: true }
      ]

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
            const asset = this.sessionCache
              ? this.sessionCache.getOrParse(filePath, () => parseCodexSessionMeta(filePath, { titleIndex }))
              : parseCodexSessionMeta(filePath, { titleIndex })
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
    }

    return assets
  }
}


function addRoot(
  roots: ScanRoot[],
  rootPath: string,
  code: NonNullable<ScanRoot['code']>
): void {
  if (!fs.existsSync(rootPath)) return
  roots.push(scanRootFromDescriptor(CODEX_SOURCE_DESCRIPTORS, code, rootPath))
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
