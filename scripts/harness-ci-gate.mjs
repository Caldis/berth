// scripts/harness-ci-gate.mjs
// GitHub Actions gate for Harness push discipline.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const DEFAULT_WORKFLOW = 'CI'
const DEFAULT_LIMIT = 10
const DEFAULT_TIMEOUT_SECONDS = 180
const DEFAULT_POLL_SECONDS = 3

function execText(command, args, deps = {}) {
  const execFile = deps.execFileSync || execFileSync
  return String(execFile(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })).trim()
}

function execJson(command, args, deps = {}) {
  const output = execText(command, args, deps)
  return output ? JSON.parse(output) : null
}

function sleep(ms, deps = {}) {
  if (deps.sleep) return deps.sleep(ms)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function parseCliArgs(argv) {
  const cmd = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'baseline'
  const options = {
    cmd,
    workflow: DEFAULT_WORKFLOW,
    limit: DEFAULT_LIMIT,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    pollSeconds: DEFAULT_POLL_SECONDS,
    allowFailedBaseline: false
  }

  const start = cmd === argv[0] ? 1 : 0
  for (let i = start; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--allow-failed-baseline') {
      options.allowFailedBaseline = true
      continue
    }
    if (['--branch', '--workflow', '--sha', '--timeout', '--poll', '--limit'].includes(arg)) {
      const value = argv[i + 1]
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`)
      if (arg === '--branch') options.branch = value
      if (arg === '--workflow') options.workflow = value
      if (arg === '--sha') options.sha = value
      if (arg === '--timeout') options.timeoutSeconds = Number(value)
      if (arg === '--poll') options.pollSeconds = Number(value)
      if (arg === '--limit') options.limit = Number(value)
      i += 1
      continue
    }
    throw new Error(`unknown option: ${arg}`)
  }

  if (!['baseline', 'wait'].includes(options.cmd)) throw new Error(`unknown command: ${options.cmd}`)
  if (!Number.isFinite(options.limit) || options.limit <= 0) throw new Error('--limit must be a positive number')
  if (!Number.isFinite(options.timeoutSeconds) || options.timeoutSeconds <= 0) throw new Error('--timeout must be a positive number')
  if (!Number.isFinite(options.pollSeconds) || options.pollSeconds <= 0) throw new Error('--poll must be a positive number')
  return options
}

export function currentBranch(deps = {}) {
  return execText('git', ['rev-parse', '--abbrev-ref', 'HEAD'], deps)
}

export function currentSha(deps = {}) {
  return execText('git', ['rev-parse', 'HEAD'], deps)
}

export function ghRunListArgs({ branch, commit, limit = DEFAULT_LIMIT }) {
  const args = [
    'run',
    'list',
    '--branch',
    branch,
    '--limit',
    String(limit),
    '--json',
    'databaseId,headSha,status,conclusion,workflowName,url,createdAt'
  ]
  if (commit) args.splice(4, 0, '--commit', commit)
  return args
}

export function ghRunViewArgs(runId) {
  return [
    'run',
    'view',
    String(runId),
    '--json',
    'databaseId,headSha,status,conclusion,workflowName,url,createdAt'
  ]
}

export function findLatestWorkflowRun(runs, workflowName = DEFAULT_WORKFLOW) {
  return (runs || []).find((run) => run.workflowName === workflowName) || null
}

export function findWorkflowRunForSha(runs, { workflowName = DEFAULT_WORKFLOW, sha }) {
  const normalizedSha = String(sha || '').trim().toLowerCase()
  if (!normalizedSha) return null
  return (runs || []).find((run) => {
    const headSha = String(run.headSha || '').toLowerCase()
    return run.workflowName === workflowName && (headSha === normalizedSha || headSha.startsWith(normalizedSha))
  }) || null
}

export function describeRun(run) {
  if (!run) return 'no run'
  const conclusion = run.conclusion || 'pending'
  const sha = run.headSha ? String(run.headSha).slice(0, 7) : 'unknown-sha'
  const id = run.databaseId || 'unknown-id'
  const url = run.url ? ` ${run.url}` : ''
  return `${run.workflowName || DEFAULT_WORKFLOW}#${id} ${run.status}/${conclusion} ${sha}${url}`
}

export function evaluateBaselineRun(run, options = {}) {
  const workflow = options.workflow || DEFAULT_WORKFLOW
  if (!run) {
    return { ok: false, reason: `no ${workflow} run found for branch` }
  }
  if (run.status !== 'completed') {
    return { ok: false, reason: `latest ${workflow} run is ${run.status}: ${describeRun(run)}` }
  }
  if (run.conclusion !== 'success') {
    const reason = `latest ${workflow} run is ${run.conclusion || 'unknown'}: ${describeRun(run)}`
    if (options.allowFailedBaseline) return { ok: true, warning: `${reason}; allowed because this is an explicit CI-fix path` }
    return { ok: false, reason }
  }
  return { ok: true, reason: `latest ${workflow} run passed: ${describeRun(run)}` }
}

export function readRunsForBranch(options, deps = {}) {
  const branch = options.branch || currentBranch(deps)
  const runs = execJson('gh', ghRunListArgs({ branch, limit: options.limit }), deps)
  return { branch, runs }
}

export function baselineGate(options = {}, deps = {}) {
  const branch = options.branch || currentBranch(deps)
  const runs = execJson('gh', ghRunListArgs({ branch, limit: options.limit }), deps)
  const run = findLatestWorkflowRun(runs, options.workflow)
  const evaluation = evaluateBaselineRun(run, options)
  return { branch, run, evaluation }
}

export async function findRunForShaWithRetry(options = {}, deps = {}) {
  const branch = options.branch || currentBranch(deps)
  const sha = !options.sha || options.sha === 'HEAD' ? currentSha(deps) : options.sha
  const startedAt = Date.now()
  const timeoutMs = (options.timeoutSeconds || DEFAULT_TIMEOUT_SECONDS) * 1000
  const pollMs = (options.pollSeconds || DEFAULT_POLL_SECONDS) * 1000

  while (Date.now() - startedAt <= timeoutMs) {
    const runs = execJson('gh', ghRunListArgs({ branch, commit: sha, limit: options.limit }), deps)
    const run = findWorkflowRunForSha(runs, { workflowName: options.workflow, sha })
    if (run) return { branch, sha, run }
    await sleep(pollMs, deps)
  }

  throw new Error(`no ${options.workflow || DEFAULT_WORKFLOW} run found for ${sha} on ${branch}`)
}

export async function waitForShaRun(options = {}, deps = {}) {
  const { branch, sha, run } = await findRunForShaWithRetry(options, deps)
  const execFile = deps.execFileSync || execFileSync
  execFile('gh', ['run', 'watch', String(run.databaseId), '--exit-status'], { stdio: 'inherit' })
  const updatedRun = execJson('gh', ghRunViewArgs(run.databaseId), deps) || run
  return { branch, sha, run: updatedRun }
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2))
  if (options.cmd === 'baseline') {
    const { branch, run, evaluation } = baselineGate(options)
    if (!evaluation.ok) throw new Error(`harness-ci-gate: ${evaluation.reason}`)
    const message = evaluation.warning || evaluation.reason
    console.log(`harness-ci-gate: baseline ok on ${branch}: ${message}`)
    if (run && run.url) console.log(`harness-ci-gate: ${run.url}`)
    return
  }

  const { branch, sha, run } = await waitForShaRun(options)
  console.log(`harness-ci-gate: CI passed for ${sha} on ${branch}: ${describeRun(run)}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error && error.message ? error.message : error)
    process.exit(1)
  })
}
