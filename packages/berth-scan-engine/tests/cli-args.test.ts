import { describe, it, expect } from 'vitest'
import { parseArgs, EXIT } from '../src/cli-args'

describe('parseArgs', () => {
  it('parses command + boolean --json', () => {
    const r = parseArgs(['scan', '--json'])
    expect(r.command).toBe('scan')
    expect(r.json).toBe(true)
    expect(r.positionals).toEqual([])
  })

  it('parses value flags (--type, --scope) and keeps --json boolean', () => {
    const r = parseArgs(['assets', '--type', 'skill', '--scope', 'user', '--json'])
    expect(r.command).toBe('assets')
    expect(r.flags.type).toBe('skill')
    expect(r.flags.scope).toBe('user')
    expect(r.json).toBe(true)
  })

  it('does not consume the command when a boolean flag precedes it', () => {
    const r = parseArgs(['--json', 'scan'])
    expect(r.command).toBe('scan')
    expect(r.json).toBe(true)
  })

  it('captures positionals after the command', () => {
    const r = parseArgs(['inspect', 'asset-123', '--relations'])
    expect(r.command).toBe('inspect')
    expect(r.positionals).toEqual(['asset-123'])
    expect(r.flags.relations).toBe(true)
  })

  it('supports --flag=value form', () => {
    const r = parseArgs(['usage', '--days=14', '--cost-mode=actual'])
    expect(r.flags.days).toBe('14')
    expect(r.flags['cost-mode']).toBe('actual')
  })

  it('parses value flag before the command (--home-dir /x scan)', () => {
    const r = parseArgs(['--home-dir', '/tmp/fix', 'scan'])
    expect(r.flags['home-dir']).toBe('/tmp/fix')
    expect(r.command).toBe('scan')
  })

  it('returns null command when none given', () => {
    expect(parseArgs([]).command).toBeNull()
  })

  it('exposes deterministic exit codes', () => {
    expect(EXIT).toEqual({ OK: 0, ERROR: 1, NO_DATA: 2, ATTENTION: 3 })
  })
})
