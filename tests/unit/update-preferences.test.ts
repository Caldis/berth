import { describe, it, expect, afterAll } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  DEFAULT_UPDATE_PREFERENCES,
  readUpdatePreferences,
  writeUpdatePreferences
} from '../../src/main/update-preferences'

const dirs: string[] = []
function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-update-prefs-'))
  dirs.push(dir)
  return dir
}
afterAll(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true })
})

describe('update preferences persistence', () => {
  it('defaults to autoDownload: false when no file exists', () => {
    expect(readUpdatePreferences(tempDir())).toEqual(DEFAULT_UPDATE_PREFERENCES)
    expect(DEFAULT_UPDATE_PREFERENCES.autoDownload).toBe(false)
  })

  it('round-trips a write', () => {
    const dir = tempDir()
    writeUpdatePreferences(dir, { autoDownload: true })
    expect(readUpdatePreferences(dir)).toEqual({ autoDownload: true })
  })

  it('falls back to defaults on corrupt or wrong-shaped content', () => {
    const dir = tempDir()
    fs.writeFileSync(path.join(dir, 'update-preferences.json'), '{not json', 'utf-8')
    expect(readUpdatePreferences(dir)).toEqual(DEFAULT_UPDATE_PREFERENCES)

    fs.writeFileSync(path.join(dir, 'update-preferences.json'), JSON.stringify({ autoDownload: 'yes' }), 'utf-8')
    expect(readUpdatePreferences(dir)).toEqual(DEFAULT_UPDATE_PREFERENCES)
  })
})
