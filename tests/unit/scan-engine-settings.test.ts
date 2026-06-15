import { afterAll, describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  createScanEngineSettingsStore,
  readScanEngineSettings,
  writeScanEngineSettings
} from '../../src/main/scan-engine-settings'
import { DEFAULT_SCAN_ENGINE_SETTINGS, normalizeScanEngineSettings } from '@berth/scan-engine/engine/assets/settings'

const dirs: string[] = []

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-scan-engine-settings-'))
  dirs.push(dir)
  return dir
}

afterAll(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true })
})

describe('scan engine settings persistence', () => {
  it('defaults to the runtime scan settings when no file exists', () => {
    expect(readScanEngineSettings(tempDir())).toEqual(DEFAULT_SCAN_ENGINE_SETTINGS)
  })

  it('round-trips normalized scan settings through the store', () => {
    const dir = tempDir()
    const store = createScanEngineSettingsStore(dir)

    store.save(normalizeScanEngineSettings({ watcherDebounceMs: 1250, watcherMinIntervalMs: 31_200 }))

    expect(store.load()).toEqual(
      normalizeScanEngineSettings({ watcherDebounceMs: 1250, watcherMinIntervalMs: 31_200 })
    )
  })

  it('falls back to defaults on corrupt content and clamps wrong-shaped numbers', () => {
    const dir = tempDir()
    fs.writeFileSync(path.join(dir, 'scan-engine-settings.json'), '{not json', 'utf-8')
    expect(readScanEngineSettings(dir)).toEqual(DEFAULT_SCAN_ENGINE_SETTINGS)

    writeScanEngineSettings(dir, normalizeScanEngineSettings({ watcherDebounceMs: 999_999, watcherMinIntervalMs: -20 }))
    expect(readScanEngineSettings(dir)).toEqual(
      normalizeScanEngineSettings({ watcherDebounceMs: 999_999, watcherMinIntervalMs: -20 })
    )
  })
})
