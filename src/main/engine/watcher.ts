import * as path from 'path'
import * as os from 'os'
import { watch } from 'chokidar'
import type { FSWatcher } from 'chokidar'
import type { BrowserWindow } from 'electron'
import type { IpcEvents } from '@shared/types/ipc'

export class AssetWatcher {
  private watcher: FSWatcher | null = null
  private mainWindow: BrowserWindow | null = null

  setWindow(win: BrowserWindow): void {
    this.mainWindow = win
  }

  start(projectDir?: string): void {
    if (this.watcher) return

    const claudeDir = path.join(os.homedir(), '.claude')
    const watchPaths = [claudeDir]

    if (projectDir) {
      watchPaths.push(path.join(projectDir, '.claude'))
      const mcpJson = path.join(projectDir, '.mcp.json')
      watchPaths.push(mcpJson)
    }

    // Also watch ~/.claude.json
    watchPaths.push(path.join(os.homedir(), '.claude.json'))

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

let _watcherInstance: AssetWatcher | null = null

export function getWatcher(): AssetWatcher {
  if (!_watcherInstance) {
    _watcherInstance = new AssetWatcher()
  }
  return _watcherInstance
}
