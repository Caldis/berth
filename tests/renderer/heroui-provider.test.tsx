import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HeroUIProvider, Button } from '@heroui/react'
import { ThemeProvider } from '@/components/theme-provider'

/**
 * P1 gate (GH-105): verify HeroUI v2 mounts under berth's provider stack
 * (ThemeProvider + MemoryRouter + HeroUIProvider) in the jsdom renderer env,
 * and that a HeroUI component renders its themed class output (proving the
 * @heroui/theme Tailwind plugin path is wired, not unstyled).
 */
describe('HeroUI provider integration', () => {
  it('renders a HeroUI Button inside the berth provider stack', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <MemoryRouter>
          <HeroUIProvider>
            <Button color="primary" data-testid="smoke-button">
              Smoke
            </Button>
          </HeroUIProvider>
        </MemoryRouter>
      </ThemeProvider>
    )

    const button = screen.getByTestId('smoke-button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('type', 'button')
    // HeroUI emits tailwind-variants class output on its components; a primary
    // button carries the generated 'bg-primary' utility from the theme plugin.
    expect(button.className).toContain('bg-primary')
  })
})
