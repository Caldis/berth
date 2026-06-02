import { describe, expect, it, vi } from 'vitest'
// @ts-expect-error mjs sin tipos
import {
  baselineGate,
  describeRun,
  evaluateBaselineRun,
  findLatestWorkflowRun,
  findRunForShaWithRetry,
  findWorkflowRunForSha,
  ghRunListArgs,
  ghRunViewArgs,
  parseCliArgs,
  resolveCommitSha,
  waitForShaRun
} from '../../scripts/harness-ci-gate.mjs'

describe('harness-ci-gate helpers', () => {
  it('parses baseline and wait options', () => {
    expect(parseCliArgs(['baseline', '--branch', 'master', '--workflow', 'CI', '--allow-failed-baseline'])).toMatchObject({
      cmd: 'baseline',
      branch: 'master',
      workflow: 'CI',
      allowFailedBaseline: true
    })
    expect(parseCliArgs(['wait', '--sha', 'HEAD', '--timeout', '60', '--poll', '2'])).toMatchObject({
      cmd: 'wait',
      sha: 'HEAD',
      timeoutSeconds: 60,
      pollSeconds: 2
    })
  })

  it('builds gh run list args for branch and commit lookup', () => {
    expect(ghRunListArgs({ branch: 'master', limit: 5 })).toEqual([
      'run',
      'list',
      '--branch',
      'master',
      '--limit',
      '5',
      '--json',
      'databaseId,headSha,status,conclusion,workflowName,url,createdAt'
    ])
    expect(ghRunListArgs({ branch: 'master', commit: 'abc', limit: 5 })).toContain('--commit')
  })

  it('selects the latest matching workflow run', () => {
    const runs = [
      { workflowName: 'Deploy', databaseId: 1 },
      { workflowName: 'CI', databaseId: 2 },
      { workflowName: 'CI', databaseId: 3 }
    ]
    expect(findLatestWorkflowRun(runs, 'CI')?.databaseId).toBe(2)
  })

  it('finds a workflow run by exact or short sha', () => {
    const runs = [
      { workflowName: 'CI', headSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', databaseId: 1 },
      { workflowName: 'CI', headSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', databaseId: 2 }
    ]
    expect(findWorkflowRunForSha(runs, { workflowName: 'CI', sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' })?.databaseId).toBe(2)
    expect(findWorkflowRunForSha(runs, { workflowName: 'CI', sha: 'bbbbbbb' })?.databaseId).toBe(2)
    expect(findWorkflowRunForSha(runs, { workflowName: 'CI', sha: 'bbac' })).toBeNull()
  })

  it('requires completed success baseline by default', () => {
    expect(evaluateBaselineRun(null, { workflow: 'CI' })).toMatchObject({ ok: false })
    expect(evaluateBaselineRun({ workflowName: 'CI', status: 'in_progress' }, { workflow: 'CI' })).toMatchObject({ ok: false })
    expect(evaluateBaselineRun({ workflowName: 'CI', status: 'completed', conclusion: 'failure' }, { workflow: 'CI' })).toMatchObject({ ok: false })
    expect(evaluateBaselineRun({ workflowName: 'CI', status: 'completed', conclusion: 'success' }, { workflow: 'CI' })).toMatchObject({ ok: true })
  })

  it('allows failed baseline only for explicit CI-fix path', () => {
    const result = evaluateBaselineRun(
      { workflowName: 'CI', status: 'completed', conclusion: 'failure', databaseId: 10, headSha: 'abcdef' },
      { workflow: 'CI', allowFailedBaseline: true }
    )
    expect(result.ok).toBe(true)
    expect(result.warning).toContain('explicit CI-fix path')
  })

  it('baselineGate reads branch and runs through injected deps', () => {
    const execFileSync = vi.fn((command: string, args: string[]) => {
      if (command === 'git') return 'master\n'
      if (command === 'gh') {
        expect(args).toEqual(ghRunListArgs({ branch: 'master', limit: 10 }))
        return JSON.stringify([{ workflowName: 'CI', status: 'completed', conclusion: 'success', databaseId: 7, headSha: 'abcdef' }])
      }
      throw new Error('unexpected command')
    })
    const result = baselineGate({ workflow: 'CI', limit: 10 }, { execFileSync })
    expect(result.branch).toBe('master')
    expect(result.evaluation.ok).toBe(true)
  })

  it('findRunForShaWithRetry uses current HEAD and injected sleep', async () => {
    const execFileSync = vi.fn((command: string, args: string[]) => {
      if (command === 'git' && args.includes('--abbrev-ref')) return 'master\n'
      if (command === 'git') return 'abcdef\n'
      if (command === 'gh') return JSON.stringify([{ workflowName: 'CI', status: 'queued', databaseId: 8, headSha: 'abcdef' }])
      throw new Error('unexpected command')
    })
    const sleep = vi.fn(async () => undefined)

    const result = await findRunForShaWithRetry({ workflow: 'CI', sha: 'HEAD', limit: 5, timeoutSeconds: 1, pollSeconds: 1 }, { execFileSync, sleep })

    expect(result.run.databaseId).toBe(8)
    expect(execFileSync).toHaveBeenCalledWith('gh', ghRunListArgs({ branch: 'master', commit: 'abcdef', limit: 5 }), expect.anything())
    expect(sleep).not.toHaveBeenCalled()
  })

  it('findRunForShaWithRetry accepts short sha input', async () => {
    const fullSha = 'abcdef1234567890abcdef1234567890abcdef12'
    const execFileSync = vi.fn((command: string, args: string[]) => {
      if (command === 'git' && args.includes('--abbrev-ref')) return 'master\n'
      if (command === 'git' && args.includes('abcdef1')) return `${fullSha}\n`
      if (command === 'gh') return JSON.stringify([{ workflowName: 'CI', status: 'queued', databaseId: 18, headSha: fullSha }])
      throw new Error('unexpected command')
    })
    const sleep = vi.fn(async () => undefined)

    const result = await findRunForShaWithRetry({ workflow: 'CI', sha: 'abcdef1', limit: 5, timeoutSeconds: 1, pollSeconds: 1 }, { execFileSync, sleep })

    expect(result.run.databaseId).toBe(18)
    expect(execFileSync).toHaveBeenCalledWith('gh', ghRunListArgs({ branch: 'master', commit: fullSha, limit: 5 }), expect.anything())
    expect(sleep).not.toHaveBeenCalled()
  })

  it('resolveCommitSha falls back to the provided value when git cannot resolve it', () => {
    const execFileSync = vi.fn(() => {
      throw new Error('not found')
    })

    expect(resolveCommitSha('abcdef1', { execFileSync })).toBe('abcdef1')
  })

  it('waitForShaRun watches the discovered run', async () => {
    const execFileSync = vi.fn((command: string, args: string[]) => {
      if (command === 'git' && args.includes('--abbrev-ref')) return 'master\n'
      if (command === 'git') return 'abcdef\n'
      if (command === 'gh' && args[1] === 'list') {
        return JSON.stringify([{ workflowName: 'CI', status: 'in_progress', conclusion: '', databaseId: 9, headSha: 'abcdef' }])
      }
      if (command === 'gh' && args[1] === 'watch') return ''
      if (command === 'gh' && args[1] === 'view') {
        expect(args).toEqual(ghRunViewArgs(9))
        return JSON.stringify({ workflowName: 'CI', status: 'completed', conclusion: 'success', databaseId: 9, headSha: 'abcdef' })
      }
      throw new Error(`unexpected command: ${command} ${args.join(' ')}`)
    })

    const result = await waitForShaRun({ workflow: 'CI', sha: 'HEAD', limit: 5 }, { execFileSync })

    expect(execFileSync).toHaveBeenCalledWith('gh', ['run', 'watch', '9', '--exit-status'], { stdio: 'inherit' })
    expect(result.run.status).toBe('completed')
    expect(result.run.conclusion).toBe('success')
  })

  it('describeRun keeps workflow, id, status, conclusion, sha and url', () => {
    expect(describeRun({ workflowName: 'CI', databaseId: 1, status: 'completed', conclusion: 'success', headSha: 'abcdef123', url: 'https://example.test' })).toBe(
      'CI#1 completed/success abcdef1 https://example.test'
    )
  })
})
