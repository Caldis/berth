import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import i18n from '../../src/renderer/src/i18n'
import { AppLayout } from '../../src/renderer/src/components/layout/app-layout'
import { usePageChrome } from '../../src/renderer/src/components/layout/page-chrome'
import { SIDEBAR_DEFAULT_WIDTH, useAppStore } from '../../src/renderer/src/stores/app'

function PageWithChrome({ title = 'Sessions' }: { title?: string }): React.ReactElement {
  usePageChrome({ title, sectionLabelKey: 'nav.sections.work' }, [title])
  return <div data-testid="page-content">Page content</div>
}

function renderLayout(pathname: string): void {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <AppLayout>
        <Routes>
          <Route path="/" element={<div data-testid="overview-page">Overview content</div>} />
          <Route path="/sessions" element={<PageWithChrome />} />
        </Routes>
      </AppLayout>
    </MemoryRouter>
  )
}

describe('AppLayout navigation shell', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    useAppStore.setState({
      sidebarCollapsed: false,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      searchOpen: false
    })
  })

  it('does not reserve a top navigation bar on the overview route', () => {
    renderLayout('/')

    const overviewPage = screen.getByTestId('overview-page')
    const navigation = screen.getByTestId('top-navigation')

    expect(overviewPage).toBeInTheDocument()
    expect(navigation).toHaveAttribute('data-state', 'hidden')
    expect(navigation).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByTestId('app-content-scroll')).toHaveClass('overflow-auto')
    expect(screen.getByTestId('app-content-scroll').style.getPropertyValue('--berth-content-gutter')).toBe('24px')
    expect(screen.getByTestId('app-content-scroll').style.getPropertyValue('--berth-content-top-offset')).toBe('24px')
    expect(screen.getByTestId('app-content-scroll').style.getPropertyValue('--berth-scrollbar-gutter')).toBe('0px')
    expect(overviewPage.parentElement).toHaveStyle({ paddingTop: '24px' })
  })

  it('keeps top navigation outside the independent content scroll region', () => {
    renderLayout('/sessions')

    const navigation = screen.getByTestId('top-navigation')
    const scrollRegion = screen.getByTestId('app-content-scroll')

    expect(navigation).toHaveClass('min-h-[72px]')
    expect(navigation).toHaveClass('absolute')
    expect(navigation).toHaveClass('backdrop-blur-xl')
    expect(navigation).toHaveAttribute('data-state', 'visible')
    expect(scrollRegion).toHaveClass('overflow-auto')
    expect(scrollRegion).toHaveClass('[scrollbar-gutter:stable]')
    expect(scrollRegion).not.toContainElement(navigation)
    expect(scrollRegion.style.getPropertyValue('--berth-content-gutter')).toBe('24px')
    expect(scrollRegion.style.getPropertyValue('--berth-content-top-offset')).toBe('96px')
    expect(scrollRegion.style.getPropertyValue('--berth-scrollbar-gutter')).toBe('0px')
    expect(screen.getByTestId('page-content').parentElement).toHaveStyle({
      paddingTop: '96px',
      paddingRight: 'max(0px, calc(var(--berth-content-gutter, 24px) - var(--berth-scrollbar-gutter, 0px)))'
    })
    expect(screen.getByRole('heading', { name: 'Sessions' })).toBeInTheDocument()
  })
})
