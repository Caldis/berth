import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../../src/renderer/src/i18n'
import { Sidebar } from '../../src/renderer/src/components/layout/sidebar'
import { useAppStore } from '../../src/renderer/src/stores/app'

describe('Sidebar agent view selector', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    useAppStore.setState({ sidebarCollapsed: false, agentView: 'all' })
  })

  it('updates the global agent view from the header dropdown', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('Agent view'), { target: { value: 'codex' } })

    expect(useAppStore.getState().agentView).toBe('codex')
  })

  it('localizes the all-agents option in Chinese', async () => {
    await i18n.changeLanguage('zh')

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    expect(screen.getByRole('option', { name: '全部' })).toHaveValue('all')
    expect(screen.queryByRole('option', { name: 'All' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Claude' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Codex' })).toBeInTheDocument()
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
})
