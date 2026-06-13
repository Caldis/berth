import * as fs from 'fs'
import * as path from 'path'
import type { UpdatePreferences } from '@shared/types/ipc'

/**
 * GH-124/GH-134: auto-update preferences, persisted as a small JSON in userData.
 * Pure-fs root-level neutral module (log.ts precedent) — the dir is injected
 * by the host (`app.getPath('userData')`), so tests run against a temp dir.
 * autoCheck defaults true (preserve launch-time check); autoDownload/allowPrerelease
 * default false: the user opts in to background downloads and the beta channel.
 */
const FILE_NAME = 'update-preferences.json'

export const DEFAULT_UPDATE_PREFERENCES: UpdatePreferences = {
  autoCheck: true,
  autoDownload: false,
  allowPrerelease: false
}

export function readUpdatePreferences(userDataDir: string): UpdatePreferences {
  const prefs = { ...DEFAULT_UPDATE_PREFERENCES }
  try {
    const raw = fs.readFileSync(path.join(userDataDir, FILE_NAME), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      // Per-field merge so older files (e.g. only autoDownload) load cleanly and
      // unknown fields default — a missing/non-boolean field keeps its default.
      for (const key of Object.keys(prefs) as (keyof UpdatePreferences)[]) {
        const value = (parsed as Record<string, unknown>)[key]
        if (typeof value === 'boolean') prefs[key] = value
      }
    }
  } catch {
    // missing or corrupt file → defaults; writing happens on the next set.
  }
  return prefs
}

export function writeUpdatePreferences(userDataDir: string, prefs: UpdatePreferences): void {
  fs.mkdirSync(userDataDir, { recursive: true })
  fs.writeFileSync(path.join(userDataDir, FILE_NAME), JSON.stringify(prefs, null, 2), 'utf-8')
}
