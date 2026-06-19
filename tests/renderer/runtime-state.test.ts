import { describe, it, expect } from 'vitest'
import { shouldShowScanningState } from '../../src/renderer/src/lib/runtime-state'

// GH-144: direct test for the scanning/empty-state predicate shared by the
// capabilities + instructions pages (previously duplicated inline).

describe('shouldShowScanningState', () => {
  it('is true while a scan is active (regardless of asset count)', () => {
    expect(shouldShowScanningState(true, 'scanning', 0)).toBe(true)
    expect(shouldShowScanningState(true, 'idle', 9)).toBe(true)
  })

  it('is true when idle with zero assets (cold start)', () => {
    expect(shouldShowScanningState(false, 'idle', 0)).toBe(true)
  })

  it('is false when idle but assets exist', () => {
    expect(shouldShowScanningState(false, 'idle', 3)).toBe(false)
  })

  it('is false when neither scanning nor idle-empty', () => {
    expect(shouldShowScanningState(false, 'ready', 0)).toBe(false)
    expect(shouldShowScanningState(false, 'error', 0)).toBe(false)
  })
})
