import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { ProjectScopeSwitcher } from '../../src/renderer/src/components/layout/project-scope-switcher'
import { DEFAULT_SCOPE_SELECTION, createProjectScopeCandidate } from '../../src/shared/scope'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { ProjectScopeActivationResult } from '../../src/shared/types/ipc'

function activationResult(projectPath?: string): ProjectScopeActivationResult {
  const candidate = projectPath
    ? createProjectScopeCandidate({
      path: projectPath,
      source: 'current',
      sessionCount: 2
    })
    : null

  return {
    projectDir: candidate?.path,
    scanResult: {
      assets: [],
      stats: { skills: 1, mcpServers: 0, sessions: 0, plugins: 0, hooks: 0, commands: 0, subagents: 0, teams: 0 },
      errors: []
    },
    candidates: candidate ? [candidate] : []
  }
}

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
    window.api.projectScope.activate = vi.fn(async ({ projectPath }) => activationResult(projectPath))
  })

  it('loads project candidates and selects a project scope', async () => {
    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Project scope' }))

    expect(await screen.findByRole('option', { name: 'berth' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: 'berth' }))

    await waitFor(() => {
      expect(window.api.projectScope.activate).toHaveBeenCalledWith({ projectPath: 'D:/Code/berth' })
      expect(useAppStore.getState().scopeSelection).toEqual({
        mode: 'project',
        projectPath: 'D:/Code/berth',
        projectPathKey: 'd:/code/berth'
      })
    })
    expect(useAppStore.getState().stats.skills).toBe(1)
  })

  it('can switch to user scope without project candidates', async () => {
    window.api.projectScope.candidates = vi.fn(async () => [])
    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Project scope' }))
    fireEvent.click(await screen.findByRole('option', { name: 'User' }))

    await waitFor(() => {
      expect(window.api.projectScope.activate).toHaveBeenCalledWith({ projectPath: undefined })
      expect(useAppStore.getState().scopeSelection).toEqual({ mode: 'user' })
    })
  })

  it('keeps the icon-only trigger reachable when collapsed', () => {
    render(<ProjectScopeSwitcher collapsed />)

    expect(screen.getByRole('button', { name: 'Project scope' })).toHaveAttribute('aria-haspopup', 'listbox')
  })

  it('closes the project scope menu with Escape while focus remains on the trigger', async () => {
    render(<ProjectScopeSwitcher collapsed={false} />)

    const trigger = screen.getByRole('button', { name: 'Project scope' })
    fireEvent.click(trigger)
    expect(await screen.findByRole('listbox', { name: 'Project scope options' })).toBeInTheDocument()

    fireEvent.keyDown(trigger, { key: 'Escape' })

    expect(screen.queryByRole('listbox', { name: 'Project scope options' })).not.toBeInTheDocument()
  })

  it('shows an empty state when no project is available', async () => {
    window.api.projectScope.candidates = vi.fn(async () => [])
    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Project scope' }))

    await waitFor(() => expect(screen.getByText('No project candidates yet.')).toBeInTheDocument())
  })
})
