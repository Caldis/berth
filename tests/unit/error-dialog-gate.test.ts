import { describe, expect, it } from 'vitest'
import { createErrorDialogGate } from '../../src/main/error-dialog-gate'

// GH-152 T7: uncaughtException shows a modal error box; a looping throw source
// (timer/event callback re-raising the same error) must not stack modal after
// modal until the app is unusable. Logging stays per-occurrence — only the
// DIALOG is gated.

describe('createErrorDialogGate', () => {
  it('allows the first occurrence, suppresses repeats inside the window', () => {
    let nowMs = 0
    const gate = createErrorDialogGate(5000, () => nowMs)

    expect(gate.shouldShow('boom')).toBe(true)
    nowMs = 1000
    expect(gate.shouldShow('boom')).toBe(false)
    nowMs = 4999
    expect(gate.shouldShow('boom')).toBe(false)
  })

  it('re-allows the same message after the window elapses', () => {
    let nowMs = 0
    const gate = createErrorDialogGate(5000, () => nowMs)

    expect(gate.shouldShow('boom')).toBe(true)
    nowMs = 5001
    expect(gate.shouldShow('boom')).toBe(true)
  })

  it('does not let one message suppress a different one', () => {
    let nowMs = 0
    const gate = createErrorDialogGate(5000, () => nowMs)

    expect(gate.shouldShow('boom')).toBe(true)
    nowMs = 100
    expect(gate.shouldShow('other failure')).toBe(true)
  })
})
