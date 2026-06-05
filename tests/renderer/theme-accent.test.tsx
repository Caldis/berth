import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ThemeProvider, useTheme, ACCENTS, type Accent } from '@/components/theme-provider'

function AccentProbe(): React.ReactElement {
  const { accent, setAccent } = useTheme()
  return (
    <div>
      <span data-testid="accent">{accent}</span>
      {ACCENTS.map((a: Accent) => (
        <button key={a} data-testid={`set-${a}`} onClick={() => setAccent(a)}>
          {a}
        </button>
      ))}
    </div>
  )
}

describe('ThemeProvider accent (GH-105 P2.3)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-accent')
  })

  it('defaults to neutral and reflects it on documentElement', () => {
    render(
      <ThemeProvider>
        <AccentProbe />
      </ThemeProvider>
    )
    expect(screen.getByTestId('accent').textContent).toBe('neutral')
    expect(document.documentElement.getAttribute('data-accent')).toBe('neutral')
  })

  it('switches accent, persists to localStorage, and updates data-accent', () => {
    render(
      <ThemeProvider>
        <AccentProbe />
      </ThemeProvider>
    )
    act(() => {
      screen.getByTestId('set-violet').click()
    })
    expect(screen.getByTestId('accent').textContent).toBe('violet')
    expect(localStorage.getItem('berth-accent')).toBe('violet')
    expect(document.documentElement.getAttribute('data-accent')).toBe('violet')
  })

  it('restores a persisted accent on mount', () => {
    localStorage.setItem('berth-accent', 'emerald')
    render(
      <ThemeProvider>
        <AccentProbe />
      </ThemeProvider>
    )
    expect(screen.getByTestId('accent').textContent).toBe('emerald')
    expect(document.documentElement.getAttribute('data-accent')).toBe('emerald')
  })

  it('ignores an invalid persisted accent and falls back to default', () => {
    localStorage.setItem('berth-accent', 'chartreuse')
    render(
      <ThemeProvider>
        <AccentProbe />
      </ThemeProvider>
    )
    expect(screen.getByTestId('accent').textContent).toBe('neutral')
  })

  it('switches to neutral, persists, and updates data-accent', () => {
    localStorage.setItem('berth-accent', 'emerald')
    render(
      <ThemeProvider>
        <AccentProbe />
      </ThemeProvider>
    )
    act(() => {
      screen.getByTestId('set-neutral').click()
    })
    expect(screen.getByTestId('accent').textContent).toBe('neutral')
    expect(localStorage.getItem('berth-accent')).toBe('neutral')
    expect(document.documentElement.getAttribute('data-accent')).toBe('neutral')
  })
})
