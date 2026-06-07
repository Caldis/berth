import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import { watch } from 'chokidar'
import type { FSWatcher } from 'chokidar'
import type { WatchEvent } from '@shared/types/asset'
import { resolveClaudeManagedDir } from '../adapters/claude-code'
import { resolveClaudeDirs, resolveCodexHomeDirs } from '../agent-homes'
import { resolveProjectConfigRoots } from '../project-config-roots'

export type AssetWatchListener = (event: WatchEvent) => void

export class AssetWatcher {
  private watcher: FSWatcher | null = null
  private listener: AssetWatchListener | null = null

  /**
   * Register the change listener. Kept Electron-free: the host (Electron main,
   * CLI, or a test) decides what to do with the event. The Electron app wires
   * this to `webContents.send('assets:changed', event)`.
   */
  setListener(listener: AssetWatchListener | null): void {
    this.listener = listener
  }

  start(projectDir?: string): void {
    if (this.watcher) return

    const watchPaths = getAssetWatchPaths(projectDir)

    this.watcher = watch(watchPaths, {
      ignoreInitial: true,
      depth: 5,
      ignorePermissionErrors: true,
      // Ignore only build/VCS noise. The old dotfile regex /(^|[/\\])\../ also
      // matched the watch roots themselves (~/.claude, .codex, .agents), so
      // chokidar silently ignored the very directories it was told to watch —
      // live asset updates never fired. (GH-111 R2)
      ignored: isIgnoredWatchPath
    })

    this.watcher.on('add', (filePath) => this.notifyChange('added', filePath))
    this.watcher.on('change', (filePath) => this.notifyChange('changed', filePath))
    this.watcher.on('unlink', (filePath) => this.notifyChange('removed', filePath))
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

  /** Dispatch a filesystem change to the registered listener. Public for testing. */
  notifyChange(type: WatchEvent['type'], filePath: string): void {
    this.listener?.(buildWatchEvent(type, filePath))
  }
}

/** Build the change event for a filesystem path. Pure; exported for tests. */
export function buildWatchEvent(type: WatchEvent['type'], filePath: string): WatchEvent {
  return { type, assetId: path.basename(filePath), asset: undefined }
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

  for (const projectRoot of resolveProjectConfigRoots(projectDir)) {
    watchPaths.push(path.join(projectRoot, '.claude'))
    watchPaths.push(path.join(projectRoot, '.mcp.json'))
    watchPaths.push(path.join(projectRoot, 'CLAUDE.md'))
    watchPaths.push(path.join(projectRoot, 'AGENTS.md'))
    watchPaths.push(path.join(projectRoot, '.codex'))
    watchPaths.push(path.join(projectRoot, '.agents', 'skills'))
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
