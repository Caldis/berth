import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../src/renderer/src/i18n'
import { TopNavigation } from '../../src/renderer/src/components/layout/top-navigation'
import { PageChromeProvider, usePageChrome } from '../../src/renderer/src/components/layout/page-chrome'
import { SearchDialog } from '../../src/renderer/src/components/layout/search-dialog'
import { sessionGuide } from '../../src/renderer/src/lib/feature-guidance'
import { useAppStore } from '../../src/renderer/src/stores/app'

function PageChromeSetter({
  config
}: {
  config: Parameters<typeof usePageChrome>[0]
}): null {
  usePageChrome(config, [config])
  return null
}

function renderTopNavigation(
  pathname: string,
  options: {
    config?: Parameters<typeof usePageChrome>[0]
    isWindows?: boolean
  } = {}
): void {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <PageChromeProvider>
        {options.config && <PageChromeSetter config={options.config} />}
        <TopNavigation isWindows={options.isWindows ?? true} />
      </PageChromeProvider>
    </MemoryRouter>
  )
}

describe('TopNavigation', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    act(() => {
      useAppStore.setState({ searchOpen: false })
    })
  })

  it('shows the parent section and page heading for top-level routes', () => {
    renderTopNavigation('/usage')

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByText('RUN')).toBeInTheDocument()
    expect(within(breadcrumb).queryByText('Usage')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Usage' })).toBeInTheDocument()
  })

  it('shows promoted capability pages under the capability section with the current page label', () => {
    renderTopNavigation('/capabilities/hooks')

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByText('CAPABILITIES')).toBeInTheDocument()
    expect(within(breadcrumb).queryByText('Hooks')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hooks' })).toBeInTheDocument()
  })

  it('fuses the session detail back button and breadcrumb into the navigation bar', () => {
    renderTopNavigation('/sessions/example-session-id', {
      config: {
        title: 'Fix session metadata',
        parentLabel: 'Sessions',
        leading: (
          <button type="button" aria-label="Back to sessions">
            Back
          </button>
        )
      }
    })

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByText('Sessions')).toBeInTheDocument()
    expect(within(breadcrumb).getByText('Fix session metadata')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to sessions' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fix session metadata' })).toBeInTheDocument()
  })

  it('shows the navigation shell for overview', () => {
    renderTopNavigation('/')

    expect(screen.getByTestId('top-navigation')).toHaveAttribute('data-state', 'visible')
    expect(screen.getByTestId('top-navigation')).toHaveAttribute('aria-hidden', 'false')
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
  })

  it('reserves the Windows titlebar control area on the right', () => {
    renderTopNavigation('/usage', { isWindows: true })

    expect(screen.getByTestId('top-navigation')).toHaveClass('pr-52')
  })

  it('shows page search and keeps page guidance reachable only while hovering the trigger or panel', async () => {
    renderTopNavigation('/sessions', {
      config: {
        title: 'Sessions',
        sectionLabelKey: 'nav.sections.work',
        search: {
          value: '',
          onValueChange: () => undefined,
          placeholder: 'Filter sessions...'
        },
        guide: {
          definition: sessionGuide,
          evidence: [{ labelKey: 'sessions.evidence.sessions', value: 816 }],
        },
        actions: <button type="button">Project</button>
      }
    })

    expect(screen.getByRole('textbox', { name: 'Filter sessions...' })).toBeInTheDocument()
    expect(useAppStore.getState().searchOpen).toBe(false)
    const guideButton = screen.getByRole('button', { name: 'Page guide' })
    expect(guideButton).toBeInTheDocument()
    expect(guideButton).toHaveTextContent('')
    expect(screen.queryByText('Local conversation history')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Project' })).toBeInTheDocument()

    const hoverRegion = screen.getByTestId('page-guide-hover-region')
    fireEvent.mouseEnter(hoverRegion, { clientX: 760, clientY: 36 })
    expect(await screen.findByText('Local conversation history')).toBeInTheDocument()
    const panel = screen.getByTestId('page-guide-panel')
    expect(panel).not.toHaveClass('motion-safe:animate-in')
    expect(panel.firstElementChild).toHaveClass('motion-safe:animate-in')
    expect(screen.getByText('816')).toBeInTheDocument()

    fireEvent.mouseLeave(hoverRegion, { clientX: 700, clientY: 36 })
    fireEvent.mouseMove(document.body, { clientX: 120, clientY: 120 })
    await waitFor(() => {
      expect(screen.queryByText('Local conversation history')).not.toBeInTheDocument()
    })

    fireEvent.mouseEnter(hoverRegion, { clientX: 760, clientY: 36 })
    expect(await screen.findByText('Local conversation history')).toBeInTheDocument()
    expect(await screen.findByTestId('page-guide-panel-hover-bridge')).toHaveClass('titlebar-no-drag')

    fireEvent.mouseLeave(hoverRegion, { clientX: 740, clientY: 66 })
    fireEvent.mouseEnter(screen.getByTestId('page-guide-panel-hover-bridge'), { clientX: 720, clientY: 58 })
    fireEvent.mouseMove(screen.getByTestId('page-guide-panel-hover-bridge'), { clientX: 720, clientY: 58 })
    expect(screen.getByText('Local conversation history')).toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByTestId('page-guide-panel'), { clientX: 700, clientY: 92 })
    fireEvent.mouseMove(screen.getByTestId('page-guide-panel'), { clientX: 700, clientY: 92 })
    expect(screen.getByText('Local conversation history')).toBeInTheDocument()

    fireEvent.mouseLeave(screen.getByTestId('page-guide-panel'), { clientX: 110, clientY: 110 })
    fireEvent.mouseMove(document.body, { clientX: 110, clientY: 110 })
    await waitFor(() => {
      expect(screen.queryByText('Local conversation history')).not.toBeInTheDocument()
    })
  })

  it('uses the keyboard shortcut for page search before global search', () => {
    render(
      <MemoryRouter initialEntries={['/sessions']}>
        <PageChromeProvider>
          <PageChromeSetter
            config={{
              title: 'Sessions',
              sectionLabelKey: 'nav.sections.work',
              search: {
                value: '',
                onValueChange: () => undefined,
                placeholder: 'Filter sessions...'
              }
            }}
          />
          <TopNavigation isWindows={false} />
          <SearchDialog />
        </PageChromeProvider>
      </MemoryRouter>
    )

    const pageSearch = screen.getByRole('textbox', { name: 'Filter sessions...' })
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })

    expect(pageSearch).toHaveFocus()
    expect(useAppStore.getState().searchOpen).toBe(false)
  })

  it('localizes breadcrumb labels in Chinese', async () => {
    await i18n.changeLanguage('zh')

    renderTopNavigation('/sessions/example-session-id', {
      config: {
        title: '会话 #session-',
        parentLabel: '会话'
      }
    })

    const breadcrumb = screen.getByRole('navigation', { name: '面包屑' })
    expect(within(breadcrumb).getByText('会话')).toBeInTheDocument()
    expect(within(breadcrumb).getByText('会话 #session-')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '会话 #session-' })).toBeInTheDocument()
  })
})
