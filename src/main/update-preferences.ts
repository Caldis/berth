import * as fs from 'fs'
import * as path from 'path'
import type { UpdatePreferences } from '@shared/types/ipc'

/**
 * GH-124: auto-update preferences, persisted as a small JSON in userData.
 * Pure-fs root-level neutral module (log.ts precedent) — the dir is injected
 * by the host (`app.getPath('userData')`), so tests run against a temp dir.
 * autoDownload defaults to false: the user opts in to background downloads.
 */
const FILE_NAME = 'update-preferences.json'

export const DEFAULT_UPDATE_PREFERENCES: UpdatePreferences = { autoDownload: false }

export function readUpdatePreferences(userDataDir: string): UpdatePreferences {
  try {
    const raw = fs.readFileSync(path.join(userDataDir, FILE_NAME), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && typeof (parsed as UpdatePreferences).autoDownload === 'boolean') {
      return { autoDownload: (parsed as UpdatePreferences).autoDownload }
    }
  } catch {
    // missing or corrupt file → defaults; writing happens on the next set.
  }
  return { ...DEFAULT_UPDATE_PREFERENCES }
}

export function writeUpdatePreferences(userDataDir: string, prefs: UpdatePreferences): void {
  fs.mkdirSync(userDataDir, { recursive: true })
  fs.writeFileSync(path.join(userDataDir, FILE_NAME), JSON.stringify(prefs, null, 2), 'utf-8')
}
