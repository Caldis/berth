import * as os from 'os'
import * as path from 'path'
import { describe, expect, it } from 'vitest'
import { getAssetWatchPaths, isIgnoredWatchPath } from '../../src/main/engine/watcher'

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
