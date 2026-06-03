import { describe, expect, it } from 'vitest'
import { EventEmitter } from 'node:events'
// @ts-expect-error mjs sin tipos
import { PREPUSH_TASKS, pnpmCommand, runPrepush } from '../../scripts/harness-prepush.mjs'

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
  it('uses pnpm.cmd on Windows', () => {
    expect(pnpmCommand('win32')).toBe('pnpm.cmd')
    expect(pnpmCommand('darwin')).toBe('pnpm')
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
