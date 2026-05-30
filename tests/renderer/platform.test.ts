import { describe, it, expect, vi, afterEach } from 'vitest'
import { isMacPlatform, isWindowsPlatform } from '../../src/renderer/src/lib/platform'

describe('platform detection', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('macOS via userAgentData -> true', () => {
    vi.stubGlobal('navigator', { userAgentData: { platform: 'macOS' } })
    expect(isMacPlatform()).toBe(true)
    expect(isWindowsPlatform()).toBe(false)
  })

  it('Windows via userAgentData -> true', () => {
    vi.stubGlobal('navigator', { userAgentData: { platform: 'Windows' } })
    expect(isMacPlatform()).toBe(false)
    expect(isWindowsPlatform()).toBe(true)
  })

  it('Windows via userAgent fallback -> true', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })
    expect(isWindowsPlatform()).toBe(true)
  })

  it('macOS via platform fallback -> true', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel' })
    expect(isMacPlatform()).toBe(true)
  })

  it('userAgentData absent -> false', () => {
    vi.stubGlobal('navigator', {})
    expect(isMacPlatform()).toBe(false)
    expect(isWindowsPlatform()).toBe(false)
  })
})
