import * as os from 'os'
import * as path from 'path'
import { describe, expect, it } from 'vitest'
import { buildWatchEvent, buildWatchOptions, getAssetWatchPaths, isIgnoredWatchPath } from '../../src/main/engine/watcher'
import { dedupePathKey } from '@shared/asset-dedupe'

// GH-111 R2: the watcher must not ignore its own dot-directory roots.
describe('isIgnoredWatchPath', () => {
  it('ignores node_modules and .git noise', () => {
    expect(isIgnoredWatchPath('/home/u/repo/node_modules/pkg/index.js')).toBe(true)
    expect(isIgnoredWatchPath('/home/u/repo/.git/HEAD')).toBe(true)
    expect(isIgnoredWatchPath('C:\\u\\repo\\node_modules\\x')).toBe(true)
  })

  it('does NOT ignore the .claude / .codex / .agents dot-directories', () => {
    expect(isIgnoredWatchPath('/home/u/.claude/skills/foo/SKILL.md')).toBe(false)
    expect(isIgnoredWatchPath('/home/u/.codex/agents/a.toml')).toBe(false)
    expect(isIgnoredWatchPath('/home/u/repo/.agents/skills/s/SKILL.md')).toBe(false)
    expect(isIgnoredWatchPath('/home/u/.claude/settings.json')).toBe(false)
  })

  it('none of the actual watch roots are self-ignored', () => {
    const roots = getAssetWatchPaths('/home/u/project', '/home/u', path.join(os.tmpdir(), 'managed'), {})
    for (const root of roots) {
      expect(isIgnoredWatchPath(root)).toBe(false)
    }
  })
})

// GH-113: hardened watcher options + per-source change events.
describe('buildWatchOptions', () => {
  it('waits for writes to finish and collapses editor atomic saves', () => {
    const opts = buildWatchOptions()
    expect(opts?.awaitWriteFinish).toMatchObject({ stabilityThreshold: 250, pollInterval: 100 })
    expect(opts?.atomic).toBe(true)
    expect(opts?.ignored).toBe(isIgnoredWatchPath)
    expect(opts?.ignoreInitial).toBe(true)
  })
})

describe('buildWatchEvent', () => {
  it('carries a normalized sourceKey for per-source replacement', () => {
    const event = buildWatchEvent('changed', 'C:\\Users\\me\\.claude\\settings.json')
    expect(event.type).toBe('changed')
    expect(event.sourceKey).toBe(dedupePathKey('C:\\Users\\me\\.claude\\settings.json'))
  })
})
