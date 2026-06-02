import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { ProjectScopeSwitcher } from '../../src/renderer/src/components/layout/project-scope-switcher'
import { DEFAULT_SCOPE_SELECTION, createProjectScopeCandidate } from '../../src/shared/scope'
import { useAppStore } from '../../src/renderer/src/stores/app'

describe('ProjectScopeSwitcher', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    useAppStore.setState({
      scopeSelection: DEFAULT_SCOPE_SELECTION,
      projectCandidates: []
    })
    window.api.projectScope.candidates = vi.fn(async () => [
      createProjectScopeCandidate({
        path: 'D:\\Code\\berth',
        source: 'current',
        sessionCount: 2
      })!
    ])
  })

  it('loads project candidates and selects a project scope', async () => {
    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Project scope' }))

    expect(await screen.findByRole('option', { name: 'berth' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: 'berth' }))

    expect(useAppStore.getState().scopeSelection).toEqual({
      mode: 'project',
      projectPath: 'D:/Code/berth',
      projectPathKey: 'd:/code/berth'
    })
  })

  it('can switch to user scope without project candidates', async () => {
    window.api.projectScope.candidates = vi.fn(async () => [])
    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Project scope' }))
    fireEvent.click(await screen.findByRole('option', { name: 'User' }))

    expect(useAppStore.getState().scopeSelection).toEqual({ mode: 'user' })
  })

  it('keeps the icon-only trigger reachable when collapsed', () => {
    render(<ProjectScopeSwitcher collapsed />)

    expect(screen.getByRole('button', { name: 'Project scope' })).toHaveAttribute('aria-haspopup', 'listbox')
  })

  it('shows an empty state when no project is available', async () => {
    window.api.projectScope.candidates = vi.fn(async () => [])
    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Project scope' }))

    await waitFor(() => expect(screen.getByText('No project candidates yet.')).toBeInTheDocument())
  })
})
