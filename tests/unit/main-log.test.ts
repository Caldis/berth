import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { createLogWriter } from '@berth/scan-engine/log'
import { AssetWatcher } from '@berth/scan-engine/engine/watcher'

// GH-115 T5: 主进程可观测性地基。日志只落本地文件 (无遥测边界), 滚动防膨胀。

let dir: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-log-'))
})

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('createLogWriter', () => {
  it('appends scoped lines with timestamp and error stack', () => {
    const writer = createLogWriter(dir)
    writer.log('scanner', new Error('boom'))
    writer.info('startup', 'ready')

    const text = fs.readFileSync(path.join(dir, 'main.log'), 'utf8')
    const lines = text.trim().split('\n')
    expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2}T.+ \[scanner\] Error: boom/)
    expect(text).toContain('at ') // stack 不在 runtime 一跳即丢
    expect(lines.at(-1)).toMatch(/\[startup\] ready$/)
  })

  it('rolls main.log to main.1.log past the size threshold and keeps writing', () => {
    const writer = createLogWriter(dir, { maxBytes: 200 })
    for (let i = 0; i < 20; i++) writer.info('fill', 'x'.repeat(40) + i)

    expect(fs.existsSync(path.join(dir, 'main.1.log'))).toBe(true)
    expect(fs.statSync(path.join(dir, 'main.log')).size).toBeLessThan(400)
  })

  it('never throws when the directory disappears (logging must not crash the host)', () => {
    const writer = createLogWriter(dir)
    fs.rmSync(dir, { recursive: true, force: true })
    expect(() => writer.log('x', new Error('y'))).not.toThrow()
  })
})

describe('AssetWatcher error seam', () => {
  it('routes listener throws to the error listener instead of crashing the process', () => {
    const watcher = new AssetWatcher()
    const errors: unknown[] = []
    watcher.setErrorListener((err) => errors.push(err))
    watcher.setListener(() => {
      throw new Error('applyWatchEvent failed')
    })

    expect(() => watcher.notifyChange('changed', '/tmp/x.json')).not.toThrow()
    expect(errors).toHaveLength(1)
    expect(String(errors[0])).toContain('applyWatchEvent failed')
  })
})
