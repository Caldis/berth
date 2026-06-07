import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AssetWatcher, buildWatchEvent, getAssetWatchPaths } from '../../src/main/engine/watcher'
import type { WatchEvent } from '../../src/shared/types/asset'
import { dedupePathKey } from '../../src/shared/asset-dedupe'

let tempDir: string | null = null

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-watcher-'))
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
        path.join(projectDir, 'CLAUDE.md'),
        path.join(projectDir, 'AGENTS.md'),
        path.join(projectDir, '.codex'),
        path.join(projectDir, '.agents', 'skills'),
        path.join(managedDir, 'managed-settings.json'),
        path.join(managedDir, 'managed-mcp.json'),
        path.join(homeDir, '.codex', 'sessions'),
        path.join(homeDir, '.codex', 'archived_sessions')
      ])
    )
  })

  it('includes parent project root paths when projectDir is a child cwd', () => {
    const homeDir = path.join(tempDir!, 'home')
    const managedDir = path.join(tempDir!, 'managed')
    const repoDir = path.join(tempDir!, 'repo')
    const cwd = path.join(repoDir, 'packages', 'app')
    fs.mkdirSync(path.join(repoDir, '.git'), { recursive: true })
    fs.mkdirSync(cwd, { recursive: true })

    expect(getAssetWatchPaths(cwd, homeDir, managedDir)).toEqual(
      expect.arrayContaining([
        path.join(repoDir, '.claude'),
        path.join(repoDir, '.mcp.json'),
        path.join(repoDir, 'CLAUDE.md'),
        path.join(repoDir, 'AGENTS.md'),
        path.join(repoDir, '.codex'),
        path.join(repoDir, '.agents', 'skills'),
        path.join(cwd, '.claude'),
        path.join(cwd, '.codex')
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

describe('AssetWatcher change dispatch (Electron-decoupled)', () => {
  it('derives assetId from the basename and a normalized sourceKey from the path', () => {
    const fp = path.join('a', 'b', 'CLAUDE.md')
    expect(buildWatchEvent('changed', fp)).toEqual({
      type: 'changed',
      assetId: 'CLAUDE.md',
      sourceKey: dedupePathKey(fp),
      filePath: fp,
      asset: undefined
    })
  })

  it('forwards filesystem events to the injected listener', () => {
    const events: WatchEvent[] = []
    const watcher = new AssetWatcher()
    watcher.setListener((event) => events.push(event))

    const skill = path.join('x', 'skills', 'foo.md')
    const mcp = path.join('x', '.mcp.json')
    watcher.notifyChange('added', skill)
    watcher.notifyChange('removed', mcp)

    expect(events).toEqual([
      { type: 'added', assetId: 'foo.md', sourceKey: dedupePathKey(skill), filePath: skill, asset: undefined },
      { type: 'removed', assetId: '.mcp.json', sourceKey: dedupePathKey(mcp), filePath: mcp, asset: undefined }
    ])
  })

  it('does not throw when no listener is registered', () => {
    expect(() => new AssetWatcher().notifyChange('changed', 'x')).not.toThrow()
  })
})
