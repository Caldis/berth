import { render, screen, fireEvent, within } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import '../../src/renderer/src/i18n'
import { ThemeProvider } from '../../src/renderer/src/components/theme-provider'
import { SettingsContent } from '../../src/renderer/src/pages/settings'

describe('SettingsContent accent picker (GH-105)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-accent')
  })

  it('renders five accent swatches with blue selected by default', () => {
    render(
      <ThemeProvider>
        <SettingsContent showTitle={false} />
      </ThemeProvider>
    )
    const group = screen.getByRole('radiogroup', { name: 'Accent color' })
    const swatches = within(group).getAllByRole('radio')
    expect(swatches).toHaveLength(5)
    expect(within(group).getByRole('radio', { name: 'Blue' })).toHaveAttribute('aria-checked', 'true')
  })

  it('switching accent updates selection and documentElement data-accent', () => {
    render(
      <ThemeProvider>
        <SettingsContent showTitle={false} />
      </ThemeProvider>
    )
    const group = screen.getByRole('radiogroup', { name: 'Accent color' })
    fireEvent.click(within(group).getByRole('radio', { name: 'Emerald' }))

    expect(within(group).getByRole('radio', { name: 'Emerald' })).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement.getAttribute('data-accent')).toBe('emerald')
    expect(localStorage.getItem('berth-accent')).toBe('emerald')
  })
})
