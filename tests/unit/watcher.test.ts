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

  it('uses CODEX_HOME when watching Codex session directories', () => {
    const homeDir = path.join(tempDir!, 'home')
    const managedDir = path.join(tempDir!, 'managed')
    const codexHome = path.join(tempDir!, 'custom-codex-home')
    fs.mkdirSync(path.join(homeDir, '.codex', 'sessions'), { recursive: true })
    fs.mkdirSync(path.join(codexHome, 'sessions'), { recursive: true })
    fs.mkdirSync(path.join(codexHome, 'archived_sessions'), { recursive: true })

    const watchPaths = getAssetWatchPaths(undefined, homeDir, managedDir, {
      CODEX_HOME: codexHome
    })

    expect(watchPaths).toEqual(
      expect.arrayContaining([
        path.join(codexHome, 'sessions'),
        path.join(codexHome, 'archived_sessions')
      ])
    )
    expect(watchPaths).not.toContain(path.join(homeDir, '.codex', 'sessions'))
  })

  it('includes explicit extra Claude and Codex homes', () => {
    const homeDir = path.join(tempDir!, 'home')
    const managedDir = path.join(tempDir!, 'managed')
    const extraClaudeDir = path.join(tempDir!, 'wsl-home', '.claude')
    const extraCodexDir = path.join(tempDir!, 'wsl-codex-home')
    fs.mkdirSync(extraClaudeDir, { recursive: true })
    fs.mkdirSync(path.join(extraCodexDir, 'sessions'), { recursive: true })

    const watchPaths = getAssetWatchPaths(undefined, homeDir, managedDir, {
      BERTH_EXTRA_CLAUDE_DIRS: extraClaudeDir,
      BERTH_EXTRA_CODEX_HOMES: extraCodexDir
    })

    expect(watchPaths).toEqual(
      expect.arrayContaining([
        extraClaudeDir,
        path.join(extraCodexDir, 'sessions')
      ])
    )
  })
})
