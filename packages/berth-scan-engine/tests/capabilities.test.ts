import { describe, it, expect } from 'vitest'
import { engineCommandManifest } from '../src/capabilities'
import { SCAN_ENGINE_NAME, SCAN_ENGINE_VERSION } from '../src/index'

describe('engine command manifest', () => {
  it('exposes the agent-facing command surface in order', () => {
    const names = engineCommandManifest().map((c) => c.name)
    expect(names).toEqual([
      'scan',
      'snapshot',
      'assets',
      'sessions',
      'search',
      'inspect',
      'health',
      'usage',
      'sources',
      'status',
      'version',
      'help'
    ])
  })

  it('every command is side-effect free (read-only engine)', () => {
    expect(engineCommandManifest().every((c) => c.sideEffectFree)).toBe(true)
  })

  it('every command carries a usage string for the agent manual (CLI completion)', () => {
    // help/manual completeness: each command is self-documenting via `usage`.
    expect(engineCommandManifest().every((c) => typeof c.usage === 'string' && c.usage.length > 0)).toBe(true)
  })

  it('declares package identity', () => {
    expect(SCAN_ENGINE_NAME).toBe('@berth/scan-engine')
    expect(SCAN_ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
