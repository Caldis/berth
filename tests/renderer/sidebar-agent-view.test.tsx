import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../src/renderer/src/i18n'
import { Sidebar } from '../../src/renderer/src/components/layout/sidebar'
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  useAppStore
} from '../../src/renderer/src/stores/app'

describe('Sidebar', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    useAppStore.setState({
      sidebarCollapsed: false,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      searchOpen: false,
      scopeSelection: { mode: 'global' },
      projectCandidates: []
    })
  })

  it('does not render the footer agent view switcher', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.queryByRole('group', { name: 'Agent view' })).not.toBeInTheDocument()
    // agentView store 残迹已删除 (issue agent-view-store-vestige): 状态不复存在
    expect('agentView' in useAppStore.getState()).toBe(false)
  })

  it('localizes the sidebar collapse toggle label in Chinese', async () => {
    await i18n.changeLanguage('zh')

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    const collapseButton = screen.getByRole('button', { name: '折叠侧边栏' })
    fireEvent.click(collapseButton)

    expect(screen.getByRole('button', { name: '展开侧边栏' })).toBeInTheDocument()
  })

  it('keeps the global search trigger in the sidebar', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Search assets...' }))

    expect(useAppStore.getState().searchOpen).toBe(true)
  })

  it('uses the stored sidebar width and clamps mouse resizing', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getByTestId('app-sidebar')).toHaveStyle({
      width: `${SIDEBAR_DEFAULT_WIDTH}px`
    })

    const resizeHandle = screen.getByRole('separator', { name: 'Resize sidebar' })
    fireEvent.mouseDown(resizeHandle, { clientX: 0 })
    fireEvent.mouseMove(document, { clientX: 500 })
    fireEvent.mouseUp(document)

    expect(useAppStore.getState().sidebarWidth).toBe(SIDEBAR_MAX_WIDTH)
    expect(document.body.style.cursor).toBe('')

    fireEvent.mouseDown(resizeHandle, { clientX: 500 })
    fireEvent.mouseMove(document, { clientX: 0 })
    fireEvent.mouseUp(document)

    expect(useAppStore.getState().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH)
  })

  it('uses collapsed width and hides the resize handle when collapsed', () => {
    useAppStore.setState({ sidebarCollapsed: true })

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getByTestId('app-sidebar')).toHaveStyle({
      width: `${SIDEBAR_COLLAPSED_WIDTH}px`
    })
    expect(screen.queryByRole('separator', { name: 'Resize sidebar' })).not.toBeInTheDocument()
  })

  it('places the project scope entry above the sidebar search trigger', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    const projectScopeButton = screen.getByRole('button', { name: 'Project scope' })
    const searchButton = screen.getByRole('button', { name: 'Search assets...' })

    expect(projectScopeButton.compareDocumentPosition(searchButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('promotes instruction and capability sections into sidebar navigation', () => {
    render(
      <MemoryRouter initialEntries={['/capabilities/hooks']}>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: 'Hooks - Lifecycle automation' })).toBeInTheDocument()
    expect(screen.getByText('Reusable workflows')).toBeInTheDocument()
    expect(screen.getByText('Permission boundaries')).toBeInTheDocument()
    // GH-94 removed Agent Teams as a misclassified *instruction* entry; GH-114
    // reintroduced it as runtime collaboration records under the WORK section.
    expect(screen.getByRole('button', { name: 'Agent Teams' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Agent orchestration/ })).not.toBeInTheDocument()
  })
})
