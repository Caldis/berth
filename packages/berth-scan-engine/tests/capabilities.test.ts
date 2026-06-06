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
      'status'
    ])
  })

  it('every command is side-effect free (read-only engine)', () => {
    expect(engineCommandManifest().every((c) => c.sideEffectFree)).toBe(true)
  })

  it('declares package identity', () => {
    expect(SCAN_ENGINE_NAME).toBe('@berth/scan-engine')
    expect(SCAN_ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
