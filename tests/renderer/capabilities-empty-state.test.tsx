import { render } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { StatusLineSection } from '../../src/renderer/src/pages/capabilities'

// Guards the GH-101 unification: capabilities no longer defines a local
// single-icon EmptyState; empty tabs render the shared stacked-card placeholder
// and fill their content area (fullHeight) like every other page.
describe('capabilities empty states use the shared full-height EmptyState', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders the shared stacked-card placeholder filling the area when a status line tab is empty', () => {
    const { container } = render(<StatusLineSection assets={[]} agentView="all" />)

    const dashed = container.querySelector('.border-dashed') as HTMLElement | null
    expect(dashed).not.toBeNull()

    // fullHeight fill + unified dashed container
    expect(dashed!.className).toContain('rounded-xl')
    expect(dashed!.className).toContain('flex-1')
    expect(dashed!.className).toContain('justify-center')

    // shared stacked-card placeholder mock (the old local EmptyState used a bare
    // h-10/w-10 icon with no aria-hidden wrapper and no h-11/w-11 card)
    expect(dashed!.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(dashed!.querySelector('.h-11.w-11')).not.toBeNull()
  })

  it('lets the empty section grow so the placeholder can fill below the chrome', () => {
    const { container } = render(<StatusLineSection assets={[]} agentView="all" />)

    // StatusLineSection root opts into the flex height chain
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('flex-1')
    expect(root.className).toContain('flex-col')
  })
})
