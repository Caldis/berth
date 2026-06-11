import { describe, expect, it } from 'vitest'
import { samePath } from '@shared/path-utils'

// GH-111 R3: samePath must respect filesystem case semantics — fold case only on
// Windows, compare exactly elsewhere (and never use locale-aware lowercasing).
describe('samePath (R3 platform/locale correctness)', () => {
  it('treats case-differing paths as distinct on case-sensitive filesystems', () => {
    expect(samePath('/repo/Hooks.json', '/repo/hooks.json', 'linux')).toBe(false)
    expect(samePath('/repo/hooks.json', '/repo/hooks.json', 'linux')).toBe(true)
  })

  it('folds case on Windows', () => {
    expect(samePath('C:\\repo\\Hooks.json', 'C:\\repo\\hooks.json', 'win32')).toBe(true)
  })
})
