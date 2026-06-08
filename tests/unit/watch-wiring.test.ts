import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { WatchEvent } from '../../src/shared/types/asset'
import { applyWatchEvent, type WatchableRuntime } from '../../src/main/engine/assets/watch-wiring'

// GH-113 I1: the watcher wiring routes a file change to an incremental snapshot
// fold (supported types) or a full refresh (everything else). Real fixtures back
// deriveAssetsForPath; the runtime is a spy.

let dir: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-wire-'))
})
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

function fakeRuntime(projectDir?: string): WatchableRuntime & {
  applyFileChange: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
} {
  return {
    getProjectDir: () => projectDir,
    applyFileChange: vi.fn(),
    refresh: vi.fn()
  }
}

function event(type: WatchEvent['type'], filePath?: string): WatchEvent {
  return {
    type,
    assetId: filePath ? path.basename(filePath) : '',
    sourceKey: filePath ? `key:${filePath}` : undefined,
    filePath
  }
}

describe('applyWatchEvent (GH-113 I1 watcher wiring)', () => {
  it('folds a supported convention file incrementally (no full refresh)', () => {
    const filePath = path.join(dir, 'CLAUDE.md')
    fs.writeFileSync(filePath, '# conventions')
    const runtime = fakeRuntime(dir)

    applyWatchEvent(event('changed', filePath), runtime)

    expect(runtime.applyFileChange).toHaveBeenCalledTimes(1)
    const [sourceKey, derived] = runtime.applyFileChange.mock.calls[0]
    expect(sourceKey).toBe(`key:${filePath}`)
    expect((derived as { type: string }[]).map((a) => a.type)).toEqual(['claude-md'])
    expect(runtime.refresh).not.toHaveBeenCalled()
  })

  it('folds a supported capability config (settings.json) incrementally (cap-1)', () => {
    const filePath = path.join(dir, '.claude', 'settings.json')
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify({ mcpServers: { g: { command: 'x' } } }))
    const runtime = fakeRuntime(dir)

    applyWatchEvent(event('changed', filePath), runtime)

    expect(runtime.applyFileChange).toHaveBeenCalledTimes(1)
    const [sourceKey, derived] = runtime.applyFileChange.mock.calls[0]
    expect(sourceKey).toBe(`key:${filePath}`)
    expect((derived as { type: string }[]).some((a) => a.type === 'mcp-server')).toBe(true)
    expect(runtime.refresh).not.toHaveBeenCalled()
  })

  it('folds a glob-class capability (SKILL.md) incrementally (cap-2)', () => {
    const filePath = path.join(dir, '.claude', 'skills', 'x', 'SKILL.md')
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, '---\nname: x\ndescription: d\n---\nbody')
    const runtime = fakeRuntime(dir)

    applyWatchEvent(event('changed', filePath), runtime)

    expect(runtime.applyFileChange).toHaveBeenCalledTimes(1)
    const [, derived] = runtime.applyFileChange.mock.calls[0]
    expect((derived as { type: string }[]).some((a) => a.type === 'skill')).toBe(true)
    expect(runtime.refresh).not.toHaveBeenCalled()
  })

  it('still falls back to a full refresh for a genuinely unsupported file (session jsonl)', () => {
    const filePath = path.join(dir, 'sessions', 'rollout-x.jsonl')
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, '{}')
    const runtime = fakeRuntime(dir)

    applyWatchEvent(event('changed', filePath), runtime)

    expect(runtime.refresh).toHaveBeenCalledWith({ reason: 'watcher' })
    expect(runtime.applyFileChange).not.toHaveBeenCalled()
  })

  it('falls back to a refresh when the event carries no filePath', () => {
    const runtime = fakeRuntime(dir)

    applyWatchEvent(event('changed', undefined), runtime)

    expect(runtime.refresh).toHaveBeenCalledWith({ reason: 'watcher' })
    expect(runtime.applyFileChange).not.toHaveBeenCalled()
  })

  it('removes a deleted convention file via an empty derived set (still incremental)', () => {
    const filePath = path.join(dir, 'CLAUDE.md') // never written → parse fails → []
    const runtime = fakeRuntime(dir)

    applyWatchEvent(event('removed', filePath), runtime)

    expect(runtime.applyFileChange).toHaveBeenCalledWith(`key:${filePath}`, [])
    expect(runtime.refresh).not.toHaveBeenCalled()
  })
})
