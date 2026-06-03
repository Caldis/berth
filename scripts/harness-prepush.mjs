// scripts/harness-prepush.mjs
// Runs independent pre-push gates in parallel to reduce wall time.
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const PREPUSH_TASKS = [
  { name: 'lint', args: ['lint'] },
  { name: 'typecheck', args: ['typecheck'] },
  { name: 'test', args: ['test'] },
  { name: 'harness:check', args: ['harness:check'] },
  { name: 'harness:ci:baseline', args: ['harness:ci:baseline'] }
]

export function pnpmCommand(platform = process.platform) {
  return platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
}

export function runTask(task, deps = {}) {
  const spawnProcess = deps.spawn || spawn
  const command = deps.command || pnpmCommand(deps.platform)
  const child = spawnProcess(command, task.args, {
    cwd: deps.cwd || process.cwd(),
    env: deps.env || process.env,
    stdio: 'inherit'
  })

  return new Promise((resolve) => {
    child.on('error', (error) => {
      resolve({ task, ok: false, code: null, error })
    })
    child.on('exit', (code, signal) => {
      resolve({ task, ok: code === 0, code, signal })
    })
  })
}

export async function runPrepush(tasks = PREPUSH_TASKS, deps = {}) {
  console.log(`harness-prepush: running ${tasks.map((task) => task.name).join(', ')} in parallel`)
  const results = await Promise.all(tasks.map((task) => runTask(task, deps)))
  const failed = results.filter((result) => !result.ok)
  if (failed.length > 0) {
    const summary = failed.map((result) => {
      const detail = result.error ? result.error.message : `exit ${result.code}${result.signal ? ` signal ${result.signal}` : ''}`
      return `${result.task.name}: ${detail}`
    })
    throw new Error(`harness-prepush failed:\n  - ${summary.join('\n  - ')}`)
  }
  console.log('harness-prepush: all checks passed')
  return results
}

async function main() {
  await runPrepush()
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error && error.message ? error.message : error)
    process.exit(1)
  })
}
