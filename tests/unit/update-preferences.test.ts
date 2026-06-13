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
  it('defaults to autoCheck:true, autoDownload:false, allowPrerelease:false when no file exists', () => {
    expect(readUpdatePreferences(tempDir())).toEqual(DEFAULT_UPDATE_PREFERENCES)
    expect(DEFAULT_UPDATE_PREFERENCES).toEqual({ autoCheck: true, autoDownload: false, allowPrerelease: false })
  })

  it('round-trips a write of all three fields', () => {
    const dir = tempDir()
    writeUpdatePreferences(dir, { autoCheck: false, autoDownload: true, allowPrerelease: true })
    expect(readUpdatePreferences(dir)).toEqual({ autoCheck: false, autoDownload: true, allowPrerelease: true })
  })

  it('per-field merge: an old {autoDownload} file loads with new fields defaulted (GH-134)', () => {
    const dir = tempDir()
    fs.writeFileSync(path.join(dir, 'update-preferences.json'), JSON.stringify({ autoDownload: true }), 'utf-8')
    expect(readUpdatePreferences(dir)).toEqual({ autoCheck: true, autoDownload: true, allowPrerelease: false })
  })

  it('keeps the default for a non-boolean field, honors valid siblings', () => {
    const dir = tempDir()
    fs.writeFileSync(
      path.join(dir, 'update-preferences.json'),
      JSON.stringify({ autoCheck: false, autoDownload: 'yes', allowPrerelease: true }),
      'utf-8'
    )
    expect(readUpdatePreferences(dir)).toEqual({ autoCheck: false, autoDownload: false, allowPrerelease: true })
  })

  it('falls back to defaults on corrupt or non-object content', () => {
    const dir = tempDir()
    fs.writeFileSync(path.join(dir, 'update-preferences.json'), '{not json', 'utf-8')
    expect(readUpdatePreferences(dir)).toEqual(DEFAULT_UPDATE_PREFERENCES)

    fs.writeFileSync(path.join(dir, 'update-preferences.json'), JSON.stringify('nope'), 'utf-8')
    expect(readUpdatePreferences(dir)).toEqual(DEFAULT_UPDATE_PREFERENCES)
  })
})
