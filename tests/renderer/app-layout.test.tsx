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

    expect(screen.getByTestId('overview-page')).toBeInTheDocument()
    expect(screen.queryByTestId('top-navigation')).not.toBeInTheDocument()
    expect(screen.getByTestId('app-content-scroll')).toHaveClass('overflow-auto')
  })

  it('keeps top navigation outside the independent content scroll region', () => {
    renderLayout('/sessions')

    const navigation = screen.getByTestId('top-navigation')
    const scrollRegion = screen.getByTestId('app-content-scroll')

    expect(navigation).toHaveClass('min-h-[72px]')
    expect(scrollRegion).toHaveClass('overflow-auto')
    expect(scrollRegion).not.toContainElement(navigation)
    expect(screen.getByRole('heading', { name: 'Sessions' })).toBeInTheDocument()
  })
})
