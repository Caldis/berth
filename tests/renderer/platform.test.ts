import { describe, it, expect, vi, afterEach } from 'vitest'
import { isMacPlatform } from '../../src/renderer/src/lib/platform'

describe('isMacPlatform', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('macOS via userAgentData -> true', () => {
    vi.stubGlobal('navigator', { userAgentData: { platform: 'macOS' } })
    expect(isMacPlatform()).toBe(true)
  })

  it('Windows -> false', () => {
    vi.stubGlobal('navigator', { userAgentData: { platform: 'Windows' } })
    expect(isMacPlatform()).toBe(false)
  })

  it('userAgentData absent -> false', () => {
    vi.stubGlobal('navigator', {})
    expect(isMacPlatform()).toBe(false)
  })
})
