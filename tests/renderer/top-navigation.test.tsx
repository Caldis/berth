import { render, screen, within } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../src/renderer/src/i18n'
import { TopNavigation } from '../../src/renderer/src/components/layout/top-navigation'

function renderTopNavigation(pathname: string, isWindows = true): void {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <TopNavigation isWindows={isWindows} />
    </MemoryRouter>
  )
}

describe('TopNavigation', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows the parent section for top-level routes without repeating the page heading', () => {
    renderTopNavigation('/usage')

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByText('RUN')).toBeInTheDocument()
    expect(within(breadcrumb).queryByText('Usage')).not.toBeInTheDocument()
  })

  it('shows promoted capability pages under the capability section without the current page label', () => {
    renderTopNavigation('/capabilities/hooks')

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByText('CAPABILITIES')).toBeInTheDocument()
    expect(within(breadcrumb).queryByText('Hooks')).not.toBeInTheDocument()
  })

  it('shows session detail routes under Sessions without a generic detail title', () => {
    renderTopNavigation('/sessions/example-session-id')

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByText('Sessions')).toBeInTheDocument()
    expect(within(breadcrumb).queryByText('Session detail')).not.toBeInTheDocument()
  })

  it('does not render an empty breadcrumb landmark for overview', () => {
    renderTopNavigation('/')

    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
  })

  it('localizes breadcrumb labels in Chinese', async () => {
    await i18n.changeLanguage('zh')

    renderTopNavigation('/sessions/example-session-id')

    const breadcrumb = screen.getByRole('navigation', { name: '面包屑' })
    expect(within(breadcrumb).getByText('会话')).toBeInTheDocument()
    expect(within(breadcrumb).queryByText('会话详情')).not.toBeInTheDocument()
  })
})
