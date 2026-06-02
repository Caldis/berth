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

  it('shows the current top-level route as a breadcrumb', () => {
    renderTopNavigation('/usage')

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByText('Usage')).toBeInTheDocument()
  })

  it('shows promoted capability pages under the capability section', () => {
    renderTopNavigation('/capabilities/hooks')

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByText('CAPABILITIES')).toBeInTheDocument()
    expect(within(breadcrumb).getByText('Hooks')).toBeInTheDocument()
  })

  it('shows session detail routes under Sessions', () => {
    renderTopNavigation('/sessions/example-session-id')

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByText('Sessions')).toBeInTheDocument()
    expect(within(breadcrumb).getByText('Session detail')).toBeInTheDocument()
  })

  it('localizes breadcrumb labels in Chinese', async () => {
    await i18n.changeLanguage('zh')

    renderTopNavigation('/sessions/example-session-id')

    const breadcrumb = screen.getByRole('navigation', { name: '面包屑' })
    expect(within(breadcrumb).getByText('会话')).toBeInTheDocument()
    expect(within(breadcrumb).getByText('会话详情')).toBeInTheDocument()
  })
})
