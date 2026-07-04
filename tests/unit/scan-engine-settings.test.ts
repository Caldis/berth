import { afterAll, describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  createScanEngineSettingsStore,
  readScanEngineSettings,
  writeScanEngineSettings
} from '../../src/main/scan-engine-settings'
import {
  DEFAULT_SCAN_ENGINE_SETTINGS,
  buildScanEngineSettingControls,
  normalizeScanEngineSettings
} from '@berth/scan-engine/engine/assets/settings'

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

describe('scan engine setting controls (GH-152 T3)', () => {
  it('marks unimplemented controls unsupported — no placebo settings', () => {
    // scanConcurrency / minFreeDiskMb / contentHash have ZERO consumers in the
    // engine: presenting them editable promises behavior that never happens.
    // supported:false renders as the panel's disabled state (osThrottle-on-win32
    // precedent); the setting keys stay persisted for forward compatibility.
    const byId = new Map(
      buildScanEngineSettingControls(DEFAULT_SCAN_ENGINE_SETTINGS, 'darwin').map((c) => [c.id, c])
    )

    expect(byId.get('scan-concurrency')?.supported).toBe(false)
    expect(byId.get('min-free-disk-mb')?.supported).toBe(false)
    expect(byId.get('content-hash')?.supported).toBe(false)

    // Implemented neighbours stay live.
    expect(byId.get('batch-pause-ms')?.supported).toBe(true)
    expect(byId.get('respect-gitignore')?.supported).toBe(true)
    expect(byId.get('os-throttle-enabled')?.supported).toBe(true) // darwin
  })
})
