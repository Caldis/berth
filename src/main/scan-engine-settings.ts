import * as fs from 'fs'
import * as path from 'path'
import type { ScanEngineSettings } from '@shared/types/ipc'
import {
  normalizeScanEngineSettings,
  type ScanEngineSettingsStore
} from '@berth/scan-engine/engine/assets/settings'

const FILE_NAME = 'scan-engine-settings.json'

export function createScanEngineSettingsStore(userDataDir: string): ScanEngineSettingsStore {
  return {
    load: () => readScanEngineSettings(userDataDir),
    save: (settings) => writeScanEngineSettings(userDataDir, settings)
  }
}

export function readScanEngineSettings(userDataDir: string): ScanEngineSettings {
  try {
    const raw = fs.readFileSync(path.join(userDataDir, FILE_NAME), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return normalizeScanEngineSettings(parsed as Partial<ScanEngineSettings>)
    }
  } catch {
    // missing or corrupt file -> defaults; writing happens on the next set.
  }
  return normalizeScanEngineSettings()
}

export function writeScanEngineSettings(userDataDir: string, settings: ScanEngineSettings): void {
  fs.mkdirSync(userDataDir, { recursive: true })
  fs.writeFileSync(
    path.join(userDataDir, FILE_NAME),
    JSON.stringify(normalizeScanEngineSettings(settings), null, 2),
    'utf-8'
  )
}
