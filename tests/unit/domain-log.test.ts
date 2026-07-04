import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setMainLogWriter } from '@berth/scan-engine/log'
import {
  isFileMissingError,
  logDomainFailureOnce,
  resetDomainFailureLogForTests
} from '../../src/main/domain-log'

// GH-152 T4: rule-8 accounting seam for the read-only IPC domains. Failure
// tolerance stays (callers keep skipping/degrading); this pins the trace side.

describe('domain-log', () => {
  let lines: string[]

  beforeEach(() => {
    lines = []
    resetDomainFailureLogForTests()
    setMainLogWriter({
      log: (scope, err) => lines.push(`${scope} ${String(err)}`),
      info: () => {}
    })
  })

  afterEach(() => {
    setMainLogWriter({ log: () => {}, info: () => {} })
    resetDomainFailureLogForTests()
  })

  it('logs a failure once per scope:key — corrupt files are re-read on every IPC list', () => {
    logDomainFailureOnce('agent-teams', '/x/config.json', new Error('boom'))
    logDomainFailureOnce('agent-teams', '/x/config.json', new Error('boom again'))
    logDomainFailureOnce('agent-teams', '/y/config.json', new Error('other file'))
    logDomainFailureOnce('memory-united', '/x/config.json', new Error('other scope'))

    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('agent-teams /x/config.json')
    expect(lines[1]).toContain('/y/config.json')
    expect(lines[2]).toContain('memory-united')
  })

  it('classifies ENOENT/ENOTDIR as normal absence, everything else as a failure', () => {
    const enoent = Object.assign(new Error('gone'), { code: 'ENOENT' })
    const enotdir = Object.assign(new Error('not a dir'), { code: 'ENOTDIR' })
    const eacces = Object.assign(new Error('denied'), { code: 'EACCES' })

    expect(isFileMissingError(enoent)).toBe(true)
    expect(isFileMissingError(enotdir)).toBe(true)
    expect(isFileMissingError(eacces)).toBe(false)
    expect(isFileMissingError(new SyntaxError('bad json'))).toBe(false)
    expect(isFileMissingError(null)).toBe(false)
  })
})
