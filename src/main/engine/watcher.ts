import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import { watch } from 'chokidar'
import type { FSWatcher } from 'chokidar'
import type { BrowserWindow } from 'electron'
import type { IpcEvents } from '@shared/types/ipc'
import { resolveClaudeManagedDir } from '../adapters/claude-code'
import { resolveCodexHomeDir } from '../adapters/codex'

export class AssetWatcher {
  private watcher: FSWatcher | null = null
  private mainWindow: BrowserWindow | null = null

  setWindow(win: BrowserWindow): void {
    this.mainWindow = win
  }

  start(projectDir?: string): void {
    if (this.watcher) return

    const watchPaths = getAssetWatchPaths(projectDir)

    this.watcher = watch(watchPaths, {
      ignoreInitial: true,
      depth: 5,
      ignorePermissionErrors: true,
      // Ignore very large or binary files
      ignored: [
        /(^|[/\\])\../, // dotfiles inside watched dirs are fine, this is default
        /node_modules/
      ]
    })

    this.watcher.on('add', (filePath) => this.emit('added', filePath))
    this.watcher.on('change', (filePath) => this.emit('changed', filePath))
    this.watcher.on('unlink', (filePath) => this.emit('removed', filePath))
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }

  private emit(type: IpcEvents['assets:changed']['type'], filePath: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return
    // Derive a simple assetId from the path
    const assetId = path.basename(filePath)
    this.mainWindow.webContents.send('assets:changed', { type, assetId, asset: undefined })
  }
}

export function getAssetWatchPaths(
  projectDir?: string,
  homeDir = os.homedir(),
  managedDir = resolveClaudeManagedDir(),
  env = process.env
): string[] {
  const claudeDir = path.join(homeDir, '.claude')
  const codexDir = resolveCodexHomeDir(homeDir, env)
  const watchPaths = [claudeDir]

  if (projectDir) {
    watchPaths.push(path.join(projectDir, '.claude'))
    watchPaths.push(path.join(projectDir, '.mcp.json'))
  }

  watchPaths.push(path.join(homeDir, '.claude.json'))

  for (const fileName of ['managed-settings.json', 'managed-mcp.json']) {
    const managedPath = path.join(managedDir, fileName)
    if (fs.existsSync(managedPath)) watchPaths.push(managedPath)
  }

  for (const dirName of ['sessions', 'archived_sessions']) {
    const codexSessionDir = path.join(codexDir, dirName)
    if (fs.existsSync(codexSessionDir)) watchPaths.push(codexSessionDir)
  }

  return watchPaths
}

let _watcherInstance: AssetWatcher | null = null

export function getWatcher(): AssetWatcher {
  if (!_watcherInstance) {
    _watcherInstance = new AssetWatcher()
  }
  return _watcherInstance
}
