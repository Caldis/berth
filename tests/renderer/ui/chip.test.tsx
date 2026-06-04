import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroUIProvider } from '@heroui/react'
import { Chip } from '@/components/ui'

function renderChip(ui: React.ReactElement) {
  return render(<HeroUIProvider>{ui}</HeroUIProvider>)
}

describe('ui/Chip (semantic)', () => {
  it('renders children with the neutral default', () => {
    renderChip(<Chip data-testid="c">user</Chip>)
    expect(screen.getByTestId('c')).toHaveTextContent('user')
  })

  it('maps tone to the matching semantic color class', () => {
    renderChip(<Chip tone="success" data-testid="ok">ok</Chip>)
    renderChip(<Chip tone="danger" data-testid="bad">bad</Chip>)
    // HeroUI flat chips encode the semantic color name in their class output.
    expect(screen.getByTestId('ok').className).toContain('success')
    expect(screen.getByTestId('bad').className).toContain('danger')
    expect(screen.getByTestId('ok').className).not.toContain('danger')
  })

  it('forwards HeroUI props (onClose renders a close affordance)', () => {
    const onClose = vi.fn()
    renderChip(
      <Chip tone="primary" onClose={onClose} data-testid="closable">
        tag
      </Chip>
    )
    // a closable chip renders a close button (role=button) inside it
    const closeBtn = screen.getByTestId('closable').querySelector('[role="button"], button')
    expect(closeBtn).toBeTruthy()
  })
})
