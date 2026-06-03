import { act, fireEvent, render, screen, within } from '@testing-library/react'
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
    expect(within(breadcrumb).getByText('Usage')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Usage' })).toBeInTheDocument()
  })

  it('shows promoted capability pages under the capability section with the current page label', () => {
    renderTopNavigation('/capabilities/hooks')

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByText('CAPABILITIES')).toBeInTheDocument()
    expect(within(breadcrumb).getByText('Hooks')).toBeInTheDocument()
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

  it('does not render an empty breadcrumb landmark for overview', () => {
    renderTopNavigation('/')

    expect(screen.queryByTestId('top-navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
  })

  it('shows page search and page guidance in the navigation bar', () => {
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
          agentView: 'all'
        },
        actions: <button type="button">Project</button>
      }
    })

    expect(screen.getByRole('textbox', { name: 'Filter sessions...' })).toBeInTheDocument()
    expect(useAppStore.getState().searchOpen).toBe(false)
    expect(screen.getByRole('button', { name: 'Page guide' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Project' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Page guide' }))
    expect(screen.getByText('Local conversation history')).toBeInTheDocument()
    expect(screen.getByText('816')).toBeInTheDocument()
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
  })
})
