import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import '../../src/renderer/src/i18n'
import { Sidebar } from '../../src/renderer/src/components/layout/sidebar'
import { useAppStore } from '../../src/renderer/src/stores/app'

describe('Sidebar agent view selector', () => {
  beforeEach(() => {
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
})
