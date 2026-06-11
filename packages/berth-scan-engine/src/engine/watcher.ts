import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import { watch } from 'chokidar'
import { projectWatchTargets } from './agent-capabilities'
import type { FSWatcher } from 'chokidar'
import type { WatchEvent } from '@shared/types/asset'
import { dedupePathKey } from '@shared/asset-dedupe'

type WatchOptions = Parameters<typeof watch>[1]
import { resolveClaudeManagedDir } from '../adapters/claude-code'
import { resolveClaudeDirs, resolveCodexHomeDirs } from '../agent-homes'
import { resolveProjectConfigRoots } from '../project-config-roots'

export type AssetWatchListener = (event: WatchEvent) => void
export type AssetWatchErrorListener = (err: unknown) => void

export class AssetWatcher {
  private watcher: FSWatcher | null = null
  private listener: AssetWatchListener | null = null
  private errorListener: AssetWatchErrorListener | null = null

  /**
   * Register the change listener. Kept Electron-free: the host (Electron main,
   * CLI, or a test) decides what to do with the event. The Electron app wires
   * this to `webContents.send('assets:changed', event)`.
   */
  setListener(listener: AssetWatchListener | null): void {
    this.listener = listener
  }

  /** GH-115 T5: chokidar 'error' 与 listener 抛错的统一出口 — 此前 emit('error') 无监听者
   * 会直冲 uncaughtException 且 live 更新静默失效。宿主接到 log seam, 不在此决定策略。 */
  setErrorListener(listener: AssetWatchErrorListener | null): void {
    this.errorListener = listener
  }

  start(projectDir?: string): void {
    if (this.watcher) return

    const watchPaths = getAssetWatchPaths(projectDir)

    this.watcher = watch(watchPaths, buildWatchOptions())

    this.watcher.on('add', (filePath) => this.notifyChange('added', filePath))
    this.watcher.on('change', (filePath) => this.notifyChange('changed', filePath))
    this.watcher.on('unlink', (filePath) => this.notifyChange('removed', filePath))
    this.watcher.on('error', (err) => this.errorListener?.(err))
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      const watcher = this.watcher
      this.watcher = null
      await watcher.close()
    }
  }

  async restart(projectDir?: string): Promise<void> {
    await this.stop()
    this.start(projectDir)
  }

  /** Dispatch a filesystem change to the registered listener. Public for testing.
   * Listener 抛错走 errorListener (单文件事件失败不拖垮 watch 管线)。 */
  notifyChange(type: WatchEvent['type'], filePath: string): void {
    try {
      this.listener?.(buildWatchEvent(type, filePath))
    } catch (err) {
      this.errorListener?.(err)
    }
  }
}

/**
 * Watcher options (GH-113). `awaitWriteFinish` waits for a file to stop growing
 * before emitting, so the incremental indexer never parses a half-written config
 * (a JSON/TOML mid-write would parse-error and drop assets); `atomic` collapses
 * the editor "atomic save" unlink+add into a single change so a save is not seen
 * as a delete. `ignored` keeps watching the dot-directory roots themselves —
 * the old catch-all dotfile regex matched ~/.claude/.codex/.agents and silently
 * disabled live updates. (GH-111 R2)
 */
export function buildWatchOptions(): WatchOptions {
  return {
    ignoreInitial: true,
    depth: 5,
    ignorePermissionErrors: true,
    ignored: isIgnoredWatchPath,
    awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 100 },
    atomic: true
  }
}

/** Build the change event for a filesystem path. Pure; exported for tests. The
 * `sourceKey` is the normalized per-source replacement key (GH-113). */
export function buildWatchEvent(type: WatchEvent['type'], filePath: string): WatchEvent {
  return { type, assetId: path.basename(filePath), sourceKey: dedupePathKey(filePath), filePath, asset: undefined }
}

/**
 * Watcher ignore predicate (GH-111 R2). Ignores only build/VCS noise
 * (node_modules, .git) anywhere in the path — crucially NOT the dot-directory
 * watch roots (.claude/.codex/.agents), which the previous catch-all dotfile
 * regex wrongly matched, disabling live updates entirely.
 */
export function isIgnoredWatchPath(testPath: string): boolean {
  return /[/\\](?:node_modules|\.git)(?:[/\\]|$)/.test(testPath)
}

export function getAssetWatchPaths(
  projectDir?: string,
  homeDir = os.homedir(),
  managedDir = resolveClaudeManagedDir(),
  env = process.env
): string[] {
  const watchPaths = [...resolveClaudeDirs(homeDir, env)]

  // GH-115 T9: 项目级监听目标从 agent-capabilities 单源取 (per-agent 声明在 adapter 侧)
  for (const projectRoot of resolveProjectConfigRoots(projectDir)) {
    for (const target of projectWatchTargets()) {
      watchPaths.push(path.join(projectRoot, target))
    }
  }

  watchPaths.push(path.join(homeDir, '.claude.json'))

  for (const fileName of ['managed-settings.json', 'managed-mcp.json']) {
    const managedPath = path.join(managedDir, fileName)
    if (fs.existsSync(managedPath)) watchPaths.push(managedPath)
  }

  for (const codexDir of resolveCodexHomeDirs(homeDir, env)) {
    for (const dirName of ['sessions', 'archived_sessions']) {
      const codexSessionDir = path.join(codexDir, dirName)
      if (fs.existsSync(codexSessionDir)) watchPaths.push(codexSessionDir)
    }
  }

  return uniquePaths(watchPaths)
}

function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const filePath of paths) {
    const key = process.platform === 'win32' ? path.resolve(filePath).toLowerCase() : path.resolve(filePath)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(filePath)
  }
  return result
}

let _watcherInstance: AssetWatcher | null = null

export function getWatcher(): AssetWatcher {
  if (!_watcherInstance) {
    _watcherInstance = new AssetWatcher()
  }
  return _watcherInstance
}
