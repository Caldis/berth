import { describe, expect, it } from 'vitest'
import { shouldAutoOpenDevTools } from '../../src/main/devtools'

describe('devtools auto-open gating', () => {
  it('auto-opens for normal electron-vite dev windows', () => {
    expect(
      shouldAutoOpenDevTools({
        isDev: true,
        rendererUrl: 'http://localhost:5173',
        isAgentDev: false
      })
    ).toBe(true)
  })

  it('does not auto-open outside electron-vite dev', () => {
    expect(
      shouldAutoOpenDevTools({
        isDev: false,
        rendererUrl: 'http://localhost:5173',
        isAgentDev: false
      })
    ).toBe(false)

    expect(
      shouldAutoOpenDevTools({
        isDev: true,
        rendererUrl: undefined,
        isAgentDev: false
      })
    ).toBe(false)
  })

  it('does not auto-open for agent-owned dev windows', () => {
    expect(
      shouldAutoOpenDevTools({
        isDev: true,
        rendererUrl: 'http://localhost:5173',
        isAgentDev: true
      })
    ).toBe(false)
  })
})
