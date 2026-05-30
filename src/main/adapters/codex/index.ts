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
import { parseCodexSessionMeta } from './parsers'

export class CodexAdapter implements AgentAdapter {
  readonly id = 'codex'
  readonly displayName = 'Codex'

  private codexDir: string

  constructor() {
    this.codexDir = path.join(os.homedir(), '.codex')
  }

  async detect(): Promise<DetectResult> {
    const installed = fs.existsSync(this.codexDir)
    return {
      installed,
      paths: await this.scanRoots()
    }
  }

  async scanRoots(): Promise<ScanRoot[]> {
    if (!fs.existsSync(this.codexDir)) return []
    const sessionsDir = path.join(this.codexDir, 'sessions')
    if (!fs.existsSync(sessionsDir)) return []
    return [
      {
        path: sessionsDir,
        scope: 'user',
        description: 'Codex session history'
      }
    ]
  }

  async scanAssets(category: AssetCategory): Promise<Asset[]> {
    if (category !== 'state') return []
    return this.scanSessions([])
  }

  async scanAll(): Promise<{ assets: Asset[]; errors: ScanError[] }> {
    const errors: ScanError[] = []
    return {
      assets: this.scanSessions(errors),
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
