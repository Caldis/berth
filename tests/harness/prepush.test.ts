import { describe, expect, it } from 'vitest'
import { EventEmitter } from 'node:events'
// @ts-expect-error mjs sin tipos
import { PREPUSH_TASKS, pnpmCommand, pnpmSpawnSpec, runPrepush } from '../../scripts/harness-prepush.mjs'

function spawnWithCodes(codes: number[]): (command: string, args: string[]) => EventEmitter {
  let index = 0
  return (_command: string, _args: string[]) => {
    const child = new EventEmitter()
    const code = codes[index] ?? 0
    index += 1
    queueMicrotask(() => child.emit('exit', code, null))
    return child
  }
}

describe('harness-prepush', () => {
  it('uses pnpm.cmd on Windows and direct pnpm on Unix-like platforms', () => {
    expect(pnpmCommand('win32')).toBe('pnpm.cmd')
    expect(pnpmCommand('darwin')).toBe('pnpm')
    expect(pnpmCommand('linux')).toBe('pnpm')
  })

  it('wraps pnpm.cmd in cmd.exe only on Windows', () => {
    expect(pnpmSpawnSpec(['lint'], 'win32', { ComSpec: 'C:\\Windows\\System32\\cmd.exe' })).toEqual({
      command: 'C:\\Windows\\System32\\cmd.exe',
      args: ['/d', '/s', '/c', 'pnpm.cmd', 'lint']
    })
    expect(pnpmSpawnSpec(['lint'], 'win32', {})).toEqual({
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'pnpm.cmd', 'lint']
    })
    expect(pnpmSpawnSpec(['lint'], 'darwin', {})).toEqual({
      command: 'pnpm',
      args: ['lint']
    })
  })

  it('runs all prepush tasks and resolves when they pass', async () => {
    const tasks = PREPUSH_TASKS.slice(0, 3)
    const results = await runPrepush(tasks, { spawn: spawnWithCodes([0, 0, 0]), command: 'pnpm' })

    expect(results.map((result: { task: { name: string } }) => result.task.name)).toEqual(tasks.map((task) => task.name))
  })

  it('reports failed tasks', async () => {
    const tasks = PREPUSH_TASKS.slice(0, 3)
    await expect(runPrepush(tasks, { spawn: spawnWithCodes([0, 1, 0]), command: 'pnpm' })).rejects.toThrow('typecheck')
  })
})
