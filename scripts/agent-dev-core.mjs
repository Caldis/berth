import { spawn, spawnSync } from 'node:child_process'
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import process from 'node:process'

export function createAgentDevContext(options = {}) {
  const root = resolve(options.root || process.cwd())
  const stateRoot = resolve(options.stateRoot || process.env.BERTH_AGENT_DEV_ROOT || join(tmpdir(), 'berth-agent-dev'))
  return {
    root,
    stateRoot,
    electronViteCli:
      options.electronViteCli || join(root, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js')
  }
}

export function usageText() {
  return `Usage:
  pnpm dev:agent start [--id <id>] [--json]
  pnpm dev:agent stop <id> [--json]
  pnpm dev:agent stop --all [--json]
  pnpm dev:agent status [id] [--json]
  pnpm dev:agent guard before --id <id> [--json]
  pnpm dev:agent guard after --id <id> [--json]
`
}

export function normalizeId(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  if (!normalized || normalized === '.' || normalized === '..') return undefined
  return normalized
}

export function normalizeDebugPort(value) {
  const raw = String(value ?? '').trim()
  if (!/^\d+$/.test(raw)) {
    throw new Error(`Invalid debug port: ${raw || '<empty>'}`)
  }

  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid debug port: ${raw}`)
  }

  return port
}

function devtoolsUrlForPort(port) {
  return port ? `http://127.0.0.1:${port}` : undefined
}

export function parseArgs(argv) {
  const command = argv[0] || 'status'
  const options = { command, all: false, json: false }

  let startIndex = 1
  if (command === 'guard') {
    options.guardAction = argv[1]
    startIndex = 2
  }

  for (let index = startIndex; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--json') {
      options.json = true
      continue
    }
    if (arg === '--id') {
      options.id = normalizeId(argv[index + 1])
      index += 1
      continue
    }
    if (arg?.startsWith('--id=')) {
      options.id = normalizeId(arg.slice('--id='.length))
      continue
    }
    if (arg === '--debug-port' || arg === '--remote-debugging-port') {
      options.debugPort = normalizeDebugPort(argv[index + 1])
      index += 1
      continue
    }
    if (arg?.startsWith('--debug-port=')) {
      options.debugPort = normalizeDebugPort(arg.slice('--debug-port='.length))
      continue
    }
    if (arg?.startsWith('--remote-debugging-port=')) {
      options.debugPort = normalizeDebugPort(arg.slice('--remote-debugging-port='.length))
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

export function statePath(context, id) {
  return join(context.stateRoot, `${id}.json`)
}

export function instanceDir(context, id) {
  return join(context.stateRoot, id)
}

export function profileDir(context, id) {
  return join(instanceDir(context, id), 'profile')
}

export function logPath(context, id) {
  return join(instanceDir(context, id), 'electron-vite.log')
}

export function guardPath(context, id) {
  return join(context.stateRoot, `${id}.guard.json`)
}

export function isInsideStateRoot(context, target) {
  const resolvedRoot = `${resolve(context.stateRoot).toLowerCase()}${sep}`
  const resolvedTarget = resolve(target).toLowerCase()
  return resolvedTarget.startsWith(resolvedRoot)
}

export function safeRemove(context, target) {
  if (!isInsideStateRoot(context, target)) {
    throw new Error(`Refusing to remove path outside state root: ${target}`)
  }
  rmSync(target, { recursive: true, force: true })
}

export function readState(context, id) {
  const file = statePath(context, id)
  if (!existsSync(file)) return undefined
  return JSON.parse(readFileSync(file, 'utf8'))
}

export function writeState(context, state) {
  mkdirSync(context.stateRoot, { recursive: true })
  writeFileSync(statePath(context, state.id), `${JSON.stringify(state, null, 2)}\n`)
}

export function listStates(context) {
  if (!existsSync(context.stateRoot)) return []
  return readdirSync(context.stateRoot)
    .filter((name) => name.endsWith('.json') && !name.endsWith('.guard.json'))
    .map((name) => readState(context, name.slice(0, -'.json'.length)))
    .filter(Boolean)
}

export function cleanupState(context, state) {
  safeRemove(context, statePath(context, state.id))
  safeRemove(context, instanceDir(context, state.id))
}

export function isPidRunning(pid) {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function getProcessCommandLine(pid) {
  if (process.platform === 'win32') {
    const result = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `$p = Get-CimInstance Win32_Process -Filter "ProcessId = ${Number(pid)}"; if ($p) { $p.CommandLine }`
      ],
      { encoding: 'utf8', stdio: 'pipe' }
    )
    return result.stdout.trim()
  }

  const result = spawnSync('ps', ['-p', String(pid), '-o', 'command='], {
    encoding: 'utf8',
    stdio: 'pipe'
  })
  return result.stdout.trim()
}

function normalizeForCompare(value) {
  return String(value || '').replace(/\\/g, '/').toLowerCase()
}

export function commandOwnsAgentDevState(commandLine, state, context) {
  const command = normalizeForCompare(commandLine)
  return (
    command.includes(`--berth-agent-instance=${normalizeForCompare(state.id)}`) &&
    command.includes(normalizeForCompare(context.root)) &&
    command.includes('electron-vite')
  )
}

export function describeState(state, context, deps = {}) {
  const running = (deps.isPidRunning || isPidRunning)(state.pid)
  const commandLine = running
    ? (deps.getProcessCommandLine || getProcessCommandLine)(state.pid)
    : ''
  const owned = running ? commandOwnsAgentDevState(commandLine, state, context) : false
  return {
    ...state,
    running,
    stale: !running,
    owned,
    commandLine
  }
}

function assertOwnedRunningState(state, context, deps = {}) {
  const summary = describeState(state, context, deps)
  if (!summary.running) return summary
  if (!summary.owned) {
    throw new Error(`Refusing to stop pid ${state.pid}: command line does not match agent instance ${state.id}`)
  }
  return summary
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

export async function waitForStart(pid, logFile, deps = {}) {
  const deadline = Date.now() + 15000
  const pidRunning = deps.isPidRunning || isPidRunning
  while (Date.now() < deadline) {
    if (!pidRunning(pid)) {
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

export async function start(options, context = createAgentDevContext(), deps = {}) {
  const id = options.id || normalizeId(`agent-${Date.now()}-${process.pid}`)
  if (!id) throw new Error('Invalid agent instance id')

  const existing = readState(context, id)
  if (existing) {
    const summary = describeState(existing, context, deps)
    if (summary.running) {
      if (!summary.owned) {
        throw new Error(`Refusing to reuse running pid ${existing.pid}: it is not owned by agent instance ${id}`)
      }
      throw new Error(`Agent dev instance already running: ${id} (pid ${existing.pid})`)
    }
    cleanupState(context, existing)
  }

  mkdirSync(instanceDir(context, id), { recursive: true })
  mkdirSync(profileDir(context, id), { recursive: true })

  const debugPort = options.debugPort
  const devtoolsUrl = devtoolsUrlForPort(debugPort)
  const electronArgs = [
    `--berth-agent-instance=${id}`,
    `--user-data-dir=${profileDir(context, id)}`
  ]
  if (debugPort) electronArgs.push(`--remote-debugging-port=${debugPort}`)

  const output = logPath(context, id)
  const logFd = openSync(output, 'a')
  const child = (deps.spawn || spawn)(
    process.execPath,
    [
      context.electronViteCli,
      'dev',
      '--watch',
      '--',
      ...electronArgs
    ],
    {
      cwd: context.root,
      detached: true,
      env: {
        ...process.env,
        BERTH_AGENT_INSTANCE_ID: id,
        BERTH_AGENT_DEV_ROOT: context.stateRoot
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
    cwd: context.root,
    profileDir: profileDir(context, id),
    logPath: output,
    ...(debugPort ? { debugPort, devtoolsUrl } : {})
  }
  writeState(context, state)

  await (deps.waitForStart || waitForStart)(child.pid, output, deps)
  return { status: 'started', ...state }
}

export function killProcessTree(pid, deps = {}) {
  const pidRunning = deps.isPidRunning || isPidRunning
  if (!pidRunning(pid)) return

  if (process.platform === 'win32') {
    const result = (deps.spawnSync || spawnSync)('taskkill', ['/PID', String(pid), '/T', '/F'], {
      encoding: 'utf8',
      stdio: 'pipe'
    })
    if (result.status !== 0 && pidRunning(pid)) {
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

export async function stopOne(id, context = createAgentDevContext(), deps = {}) {
  const state = readState(context, id)
  if (!state) {
    return { status: 'missing', id }
  }

  const summary = assertOwnedRunningState(state, context, deps)
  if (summary.running) {
    killProcessTree(state.pid, deps)
    const deadline = Date.now() + 5000
    const pidRunning = deps.isPidRunning || isPidRunning
    while (Date.now() < deadline && pidRunning(state.pid)) {
      await sleep(100)
    }

    if (pidRunning(state.pid) && process.platform !== 'win32') {
      try {
        process.kill(-state.pid, 'SIGKILL')
      } catch {
        process.kill(state.pid, 'SIGKILL')
      }
    }
  }

  cleanupState(context, state)
  return { status: summary.stale ? 'cleaned-stale' : 'stopped', id, pid: state.pid }
}

export async function stop(options, context = createAgentDevContext(), deps = {}) {
  if (options.all) {
    const states = listStates(context)
    const results = []
    for (const state of states) {
      results.push(await stopOne(state.id, context, deps))
    }
    return { status: 'ok', results }
  }

  if (!options.id) {
    throw new Error('stop requires an id or --all')
  }
  return stopOne(options.id, context, deps)
}

export function status(options, context = createAgentDevContext(), deps = {}) {
  const states = options.id ? [readState(context, options.id)].filter(Boolean) : listStates(context)
  return {
    status: 'ok',
    instances: states.map((state) => describeState(state, context, deps))
  }
}

export function listProcesses() {
  if (process.platform === 'win32') {
    const result = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress'
      ],
      { encoding: 'utf8', stdio: 'pipe' }
    )
    if (!result.stdout.trim()) return []
    const parsed = JSON.parse(result.stdout)
    return (Array.isArray(parsed) ? parsed : [parsed]).map((item) => ({
      pid: Number(item.ProcessId),
      parentPid: Number(item.ParentProcessId),
      name: item.Name || '',
      commandLine: item.CommandLine || ''
    }))
  }

  const result = spawnSync('ps', ['-axo', 'pid=,ppid=,comm=,command='], {
    encoding: 'utf8',
    stdio: 'pipe'
  })
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/)
      if (!match) return undefined
      return {
        pid: Number(match[1]),
        parentPid: Number(match[2]),
        name: match[3],
        commandLine: match[4]
      }
    })
    .filter(Boolean)
}

export function isProtectedUserDevProcess(processInfo, context) {
  const command = normalizeForCompare(processInfo.commandLine)
  const name = normalizeForCompare(processInfo.name)
  if (!command.includes(normalizeForCompare(context.root))) return false
  if (command.includes('--berth-agent-instance=')) return false
  if (command.includes('--type=')) return false

  const isDevServer = command.includes('electron-vite') && command.includes(' dev')
  const isElectronMain = name.includes('electron') && command.includes('electron') && !command.includes('--type=')
  return isDevServer || isElectronMain
}

export function collectProtectedUserDevProcesses(processes, context) {
  return processes.filter((processInfo) => isProtectedUserDevProcess(processInfo, context))
}

function isElectronMainProcess(processInfo) {
  const command = normalizeForCompare(processInfo.commandLine)
  const name = normalizeForCompare(processInfo.name)
  return (
    name.includes('electron') &&
    command.includes('electron') &&
    !command.includes('--type=') &&
    !command.includes('--berth-agent-instance=')
  )
}

function findRestartedElectronReplacement(previousProcess, currentProcesses, currentPids) {
  if (!isElectronMainProcess(previousProcess)) return undefined
  if (!currentPids.has(Number(previousProcess.parentPid))) return undefined

  return currentProcesses.find(
    (processInfo) =>
      Number(processInfo.pid) !== Number(previousProcess.pid) &&
      Number(processInfo.parentPid) === Number(previousProcess.parentPid) &&
      isElectronMainProcess(processInfo)
  )
}

export function evaluateGuardAfter(snapshot, currentProcesses) {
  const currentPids = new Set(currentProcesses.map((processInfo) => Number(processInfo.pid)))
  const missing = []
  const restarted = []

  for (const processInfo of snapshot.protectedProcesses) {
    if (currentPids.has(Number(processInfo.pid))) continue

    const replacement = findRestartedElectronReplacement(processInfo, currentProcesses, currentPids)
    if (replacement) {
      restarted.push({ previous: processInfo, replacement })
      continue
    }

    missing.push(processInfo)
  }

  return {
    ok: missing.length === 0,
    missing,
    restarted
  }
}

export function guardBefore(options, context = createAgentDevContext(), deps = {}) {
  const id = options.id
  if (!id) throw new Error('guard before requires --id <id>')
  const processes = collectProtectedUserDevProcesses((deps.listProcesses || listProcesses)(), context)
  const snapshot = {
    id,
    createdAt: new Date().toISOString(),
    protectedProcesses: processes
  }
  mkdirSync(instanceDir(context, id), { recursive: true })
  writeFileSync(guardPath(context, id), `${JSON.stringify(snapshot, null, 2)}\n`)
  return { status: 'guarded', ...snapshot }
}

export function guardAfter(options, context = createAgentDevContext(), deps = {}) {
  const id = options.id
  if (!id) throw new Error('guard after requires --id <id>')
  const file = guardPath(context, id)
  if (!existsSync(file)) throw new Error(`guard snapshot not found for ${id}`)
  const snapshot = JSON.parse(readFileSync(file, 'utf8'))
  const result = evaluateGuardAfter(snapshot, (deps.listProcesses || listProcesses)())
  if (!result.ok) {
    throw new Error(`Protected user dev processes exited: ${result.missing.map((p) => p.pid).join(', ')}`)
  }
  safeRemove(context, file)
  return {
    status: 'guard-ok',
    id,
    protectedProcesses: snapshot.protectedProcesses,
    restarted: result.restarted
  }
}

export function formatResult(result, json = false) {
  if (json) return `${JSON.stringify(result, null, 2)}\n`

  if (result.status === 'started') {
    const devtools = result.devtoolsUrl ? `devtools=${result.devtoolsUrl}\n` : ''
    return `started ${result.id} pid=${result.pid}\nprofile=${result.profileDir}\nlog=${result.logPath}\n${devtools}`
  }
  if (result.status === 'stopped' || result.status === 'cleaned-stale') {
    return `${result.status} ${result.id} pid=${result.pid}\n`
  }
  if (result.status === 'missing') {
    return `missing ${result.id}\n`
  }
  if (result.status === 'ok' && Array.isArray(result.instances)) {
    if (result.instances.length === 0) return 'no agent dev instances\n'
    return `${result.instances
      .map((item) => {
        const devtools = item.devtoolsUrl ? ` devtools=${item.devtoolsUrl}` : ''
        return `${item.id} pid=${item.pid} running=${item.running} stale=${item.stale}${devtools}`
      })
      .join('\n')}\n`
  }
  if (result.status === 'guarded') {
    return `guarded ${result.id} protected=${result.protectedProcesses.length}\n`
  }
  if (result.status === 'guard-ok') {
    const restarted = result.restarted?.length ? ` restarted=${result.restarted.length}` : ''
    return `guard-ok ${result.id} protected=${result.protectedProcesses.length}${restarted}\n`
  }
  return `${result.status}\n`
}

export async function runCli(argv, context = createAgentDevContext(), deps = {}) {
  const options = parseArgs(argv)
  if (options.command === 'start') return start(options, context, deps)
  if (options.command === 'stop') return stop(options, context, deps)
  if (options.command === 'status') return status(options, context, deps)
  if (options.command === 'guard' && options.guardAction === 'before') {
    return guardBefore(options, context, deps)
  }
  if (options.command === 'guard' && options.guardAction === 'after') {
    return guardAfter(options, context, deps)
  }

  throw new Error(usageText())
}
