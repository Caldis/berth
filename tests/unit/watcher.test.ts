import * as fs from 'fs'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getAssetWatchPaths } from '../../src/main/engine/watcher'

let tempDir: string | null = null

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(process.env['TEMP'] ?? process.cwd(), 'berth-watcher-'))
})

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

describe('getAssetWatchPaths', () => {
  it('includes managed Claude files and Codex archived sessions when they exist', () => {
    const homeDir = path.join(tempDir!, 'home')
    const managedDir = path.join(tempDir!, 'managed')
    const projectDir = path.join(tempDir!, 'project')
    fs.mkdirSync(path.join(homeDir, '.codex', 'sessions'), { recursive: true })
    fs.mkdirSync(path.join(homeDir, '.codex', 'archived_sessions'), { recursive: true })
    fs.mkdirSync(managedDir, { recursive: true })
    fs.writeFileSync(path.join(managedDir, 'managed-settings.json'), '{}')
    fs.writeFileSync(path.join(managedDir, 'managed-mcp.json'), '{}')

    expect(getAssetWatchPaths(projectDir, homeDir, managedDir)).toEqual(
      expect.arrayContaining([
        path.join(homeDir, '.claude'),
        path.join(homeDir, '.claude.json'),
        path.join(projectDir, '.claude'),
        path.join(projectDir, '.mcp.json'),
        path.join(managedDir, 'managed-settings.json'),
        path.join(managedDir, 'managed-mcp.json'),
        path.join(homeDir, '.codex', 'sessions'),
        path.join(homeDir, '.codex', 'archived_sessions')
      ])
    )
  })
})
