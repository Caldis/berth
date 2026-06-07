import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFocusTarget, FOCUS_PULSE_MS } from '../../src/renderer/src/hooks/use-focus-target'

function wrapperWithState(focusAssetId?: string): React.FC<{ children: React.ReactNode }> {
  return ({ children }) => (
    <MemoryRouter initialEntries={[{ pathname: '/instructions/skills', state: focusAssetId ? { focusAssetId } : undefined }]}>
      {children}
    </MemoryRouter>
  )
}

describe('useFocusTarget (GH-112 S2)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('exposes the focusAssetId from history state', () => {
    const { result } = renderHook(() => useFocusTarget(), { wrapper: wrapperWithState('skill-1') })
    expect(result.current.focusId).toBe('skill-1')
    expect(result.current.isFocused('skill-1')).toBe(true)
    expect(result.current.isFocused('other')).toBe(false)
  })

  it('auto-clears the focus after FOCUS_PULSE_MS', () => {
    const { result } = renderHook(() => useFocusTarget(), { wrapper: wrapperWithState('skill-1') })
    expect(result.current.focusId).toBe('skill-1')
    act(() => {
      vi.advanceTimersByTime(FOCUS_PULSE_MS + 10)
    })
    expect(result.current.focusId).toBeNull()
  })

  it('has no focus when no state is provided', () => {
    const { result } = renderHook(() => useFocusTarget(), { wrapper: wrapperWithState(undefined) })
    expect(result.current.focusId).toBeNull()
  })
})
