#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const stateRoot = resolve(process.env.BERTH_AGENT_DEV_ROOT || join(tmpdir(), 'berth-agent-dev'))
const electronViteCli = join(root, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js')

function usage() {
  console.log(`Usage:
  pnpm dev:agent start [--id <id>]
  pnpm dev:agent stop <id>
  pnpm dev:agent stop --all
  pnpm dev:agent status [id]
`)
}

function normalizeId(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  if (!normalized || normalized === '.' || normalized === '..') return undefined
  return normalized
}

function parseArgs(argv) {
  const command = argv[0] || 'status'
  const options = { command, all: false }

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--id') {
      options.id = normalizeId(argv[index + 1])
      index += 1
      continue
    }
    if (arg?.startsWith('--id=')) {
      options.id = normalizeId(arg.slice('--id='.length))
      continue
    }
    if (arg === '--all') {
      options.all = true
      continue
    }
    if (!options.id) {
      options.id = normalizeId(arg)
    }
  }

  return options
}

function statePath(id) {
  return join(stateRoot, `${id}.json`)
}

function instanceDir(id) {
  return join(stateRoot, id)
}

function profileDir(id) {
  return join(instanceDir(id), 'profile')
}

function logPath(id) {
  return join(instanceDir(id), 'electron-vite.log')
}

function isInsideStateRoot(target) {
  const resolvedRoot = `${resolve(stateRoot).toLowerCase()}${sep}`
  const resolvedTarget = resolve(target).toLowerCase()
  return resolvedTarget.startsWith(resolvedRoot)
}

function safeRemove(target) {
  if (!isInsideStateRoot(target)) {
    throw new Error(`Refusing to remove path outside state root: ${target}`)
  }
  rmSync(target, { recursive: true, force: true })
}

function readState(id) {
  const file = statePath(id)
  if (!existsSync(file)) return undefined
  return JSON.parse(readFileSync(file, 'utf8'))
}

function listStates() {
  if (!existsSync(stateRoot)) return []
  return readdirSync(stateRoot)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readState(name.slice(0, -'.json'.length)))
    .filter(Boolean)
}

function isPidRunning(pid) {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

async function waitForStart(pid, logFile) {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    if (!isPidRunning(pid)) {
      throw new Error(`agent dev process exited early; see log: ${logFile}`)
    }

    if (existsSync(logFile)) {
      const log = readFileSync(logFile, 'utf8')
      if (log.includes('starting electron app') || log.includes('dev server running')) {
        return
      }
    }

    await sleep(250)
  }
}

async function start(options) {
  const id = options.id || normalizeId(`agent-${Date.now()}-${process.pid}`)
  if (!id) throw new Error('Invalid agent instance id')

  const existing = readState(id)
  if (existing && isPidRunning(existing.pid)) {
    throw new Error(`Agent dev instance already running: ${id} (pid ${existing.pid})`)
  }

  mkdirSync(instanceDir(id), { recursive: true })
  mkdirSync(profileDir(id), { recursive: true })

  const output = logPath(id)
  const logFd = openSync(output, 'a')
  const child = spawn(
    process.execPath,
    [
      electronViteCli,
      'dev',
      '--watch',
      '--',
      `--berth-agent-instance=${id}`,
      `--user-data-dir=${profileDir(id)}`
    ],
    {
      cwd: root,
      detached: true,
      env: {
        ...process.env,
        BERTH_AGENT_INSTANCE_ID: id,
        BERTH_AGENT_DEV_ROOT: stateRoot
      },
      stdio: ['ignore', logFd, logFd],
      windowsHide: false
    }
  )
  closeSync(logFd)
  child.unref()

  const state = {
    id,
    pid: child.pid,
    startedAt: new Date().toISOString(),
    cwd: root,
    profileDir: profileDir(id),
    logPath: output
  }
  writeFileSync(statePath(id), `${JSON.stringify(state, null, 2)}\n`)

  await waitForStart(child.pid, output)
  console.log(JSON.stringify({ status: 'started', ...state }, null, 2))
}

function killProcessTree(pid) {
  if (!isPidRunning(pid)) return

  if (process.platform === 'win32') {
    const result = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
      encoding: 'utf8',
      stdio: 'pipe'
    })
    if (result.status !== 0 && isPidRunning(pid)) {
      throw new Error(result.stderr || result.stdout || `taskkill failed for pid ${pid}`)
    }
    return
  }

  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    process.kill(pid, 'SIGTERM')
  }
}

async function stopOne(id) {
  const state = readState(id)
  if (!state) {
    console.log(JSON.stringify({ status: 'missing', id }, null, 2))
    return
  }

  killProcessTree(state.pid)
  const deadline = Date.now() + 5000
  while (Date.now() < deadline && isPidRunning(state.pid)) {
    await sleep(100)
  }

  if (isPidRunning(state.pid) && process.platform !== 'win32') {
    try {
      process.kill(-state.pid, 'SIGKILL')
    } catch {
      process.kill(state.pid, 'SIGKILL')
    }
  }

  safeRemove(statePath(id))
  safeRemove(instanceDir(id))
  console.log(JSON.stringify({ status: 'stopped', id, pid: state.pid }, null, 2))
}

async function stop(options) {
  if (options.all) {
    const states = listStates()
    for (const state of states) {
      await stopOne(state.id)
    }
    return
  }

  if (!options.id) {
    throw new Error('stop requires an id or --all')
  }
  await stopOne(options.id)
}

function status(options) {
  const states = options.id ? [readState(options.id)].filter(Boolean) : listStates()
  const payload = states.map((state) => ({
    ...state,
    running: isPidRunning(state.pid)
  }))
  console.log(JSON.stringify({ status: 'ok', instances: payload }, null, 2))
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.command === 'start') {
    await start(options)
    return
  }
  if (options.command === 'stop') {
    await stop(options)
    return
  }
  if (options.command === 'status') {
    status(options)
    return
  }

  usage()
  process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
