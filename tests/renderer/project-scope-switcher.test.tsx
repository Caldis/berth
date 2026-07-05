import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { ProjectScopeSwitcher } from '../../src/renderer/src/components/layout/project-scope-switcher'
import { DEFAULT_SCOPE_SELECTION, createProjectScopeCandidate } from '@shared/scope'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { AgentScanSourceGroup, AssetSnapshot, ProjectScopeActivationResult } from '@shared/types/ipc'

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
      stats: { skills: 1, mcpServers: 0, sessions: 0, plugins: 0, hooks: 0, commands: 0, subagents: 0 },
      errors: []
    },
    candidates: candidate ? [candidate] : []
  }
}

function assetSnapshot(projectPath?: string): AssetSnapshot {
  const result = activationResult(projectPath)

  return {
    id: 'project-scope-snapshot',
    projectDir: result.projectDir,
    assets: result.scanResult.assets,
    stats: result.scanResult.stats,
    errors: result.scanResult.errors,
    sources: scanSourceGroups,
    projectCandidates: result.candidates,
    status: {
      state: 'ready',
      stale: false,
      projectDir: result.projectDir
    }
  }
}

const scanSourceGroups: AgentScanSourceGroup[] = [
  {
    agentId: 'claude-code',
    agentName: 'Claude Code',
    installed: true,
    roots: [],
    sources: [
      {
        path: 'C:\\Users\\test\\.claude',
        scope: 'user',
        code: 'claude.user.data-directory',
        categories: ['instruction'],
        kind: 'directory',
        status: 'scanned'
      },
      {
        path: 'D:\\Code\\berth\\.claude',
        scope: 'project',
        code: 'claude.project.directory',
        categories: ['instruction', 'capability'],
        kind: 'directory',
        status: 'scanned'
      },
      {
        path: 'D:\\Code\\berth\\.mcp.json',
        scope: 'project',
        code: 'claude.project.mcp-config',
        categories: ['integration'],
        kind: 'file',
        status: 'missing'
      }
    ]
  },
  {
    agentId: 'codex',
    agentName: 'Codex',
    installed: true,
    roots: [],
    sources: [
      {
        path: 'D:\\Code\\berth\\AGENTS.md',
        scope: 'project',
        code: 'codex.project.agents-md',
        categories: ['instruction'],
        kind: 'file',
        status: 'scanned'
      },
      {
        path: 'D:\\Code\\other\\.codex\\config.toml',
        scope: 'project',
        code: 'codex.project.config',
        categories: ['capability'],
        kind: 'file',
        status: 'scanned'
      }
    ]
  }
]

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
    let activeProjectPath: string | undefined
    window.api.projectScope.activate = vi.fn(async ({ projectPath }) => {
      activeProjectPath = projectPath
      return activationResult(projectPath)
    })
    window.api.assets.snapshot = vi.fn(async () => assetSnapshot(activeProjectPath))
    window.api.assets.scanSources = vi.fn(async () => scanSourceGroups)
    window.api.projectScope.setScope = vi.fn(async () => ({ applied: true }))
    window.api.shell.openPath = vi.fn(async () => {})
  })

  it('loads project candidates and selects a project scope', async () => {
    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Asset scope' }))

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
    expect(window.api.assets.snapshot).toHaveBeenCalled()
    expect(useAppStore.getState().stats.skills).toBe(1)
  })

  it('shows project source summaries and selected project source details', async () => {
    render(<ProjectScopeSwitcher collapsed={false} />)

    const trigger = screen.getByRole('button', { name: 'Asset scope' })
    fireEvent.click(trigger)

    const option = await screen.findByRole('option', { name: 'berth' })
    expect(option).toHaveTextContent('3 sources')
    // 项目行 meta 只点名有问题的状态; scanned 是默认态, 不再复述。
    expect(option).not.toHaveTextContent('2 Scanned')
    expect(option).toHaveTextContent('1 Missing')

    fireEvent.click(option)
    await waitFor(() => {
      expect(useAppStore.getState().scopeSelection).toEqual({
        mode: 'project',
        projectPath: 'D:/Code/berth',
        projectPathKey: 'd:/code/berth'
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Asset scope' }))

    expect(await screen.findByText('Asset sources')).toBeInTheDocument()
    expect(screen.getByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('Codex')).toBeInTheDocument()
    expect(screen.getByText('Project Claude Code directory')).toBeInTheDocument()
    expect(screen.getByText('Project MCP config file')).toBeInTheDocument()
    expect(screen.getByText('Codex project instructions')).toBeInTheDocument()
    expect(screen.getByText('D:\\Code\\berth\\.claude')).toBeInTheDocument()
    expect(screen.getByText('D:\\Code\\berth\\.mcp.json')).toBeInTheDocument()
    expect(screen.queryByText('D:\\Code\\other\\.codex\\config.toml')).not.toBeInTheDocument()

    const row = screen.getByText('D:\\Code\\berth\\.claude').closest('[data-project-source-root]')
    expect(row).not.toBeNull()
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Show in Explorer' }))

    expect(window.api.shell.openPath).toHaveBeenCalledWith('D:\\Code\\berth\\.claude')
  })

  it('renders project sources from plugin adapters even when the source code has no built-in copy', async () => {
    const pluginSourceGroup: AgentScanSourceGroup = {
      agentId: 'gemini-cli',
      agentName: 'Gemini CLI',
      installed: true,
      roots: [],
      sources: [
        {
          path: 'D:\\Code\\berth\\.gemini\\settings.json',
          scope: 'project',
          code: 'gemini.project.settings',
          categories: ['capability'],
          kind: 'file',
          status: 'missing'
        }
      ]
    }
    window.api.assets.scanSources = vi.fn(async () => [
      ...scanSourceGroups,
      pluginSourceGroup
    ])

    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Asset scope' }))
    fireEvent.click(await screen.findByRole('option', { name: 'berth' }))

    await waitFor(() => {
      expect(useAppStore.getState().scopeSelection).toEqual({
        mode: 'project',
        projectPath: 'D:/Code/berth',
        projectPathKey: 'd:/code/berth'
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Asset scope' }))

    expect(await screen.findByText('gemini.project.settings')).toBeInTheDocument()
    expect(screen.getAllByText('D:\\Code\\berth\\.gemini\\settings.json').length).toBeGreaterThan(0)
  })

  it('keeps project selection usable when source loading fails', async () => {
    window.api.assets.scanSources = vi.fn(async () => {
      throw new Error('source boom')
    })

    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Asset scope' }))

    expect(await screen.findByText('Could not load asset sources.')).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'berth' })).toBeInTheDocument()
  })

  it('keeps the menu open and scope unchanged when project activation fails', async () => {
    window.api.projectScope.activate = vi.fn(async () => {
      throw new Error('activation boom')
    })

    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Asset scope' }))
    fireEvent.click(await screen.findByRole('option', { name: 'berth' }))

    expect(await screen.findByText('Could not refresh projects.')).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Asset scope options' })).toBeInTheDocument()
    expect(useAppStore.getState().scopeSelection).toEqual(DEFAULT_SCOPE_SELECTION)
  })

  it('switches to user scope as an instant client-side filter (no rescan)', async () => {
    window.api.projectScope.candidates = vi.fn(async () => [])
    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Asset scope' }))
    fireEvent.click(await screen.findByRole('option', { name: 'User' }))

    await waitFor(() => {
      expect(useAppStore.getState().scopeSelection).toEqual({ mode: 'user' })
    })
    // Global / User must not trigger a rescan — that is what made switching slow.
    expect(window.api.projectScope.activate).not.toHaveBeenCalled()
    // But the engine is told the active scope (fast, no rescan) so search honours it.
    expect(window.api.projectScope.setScope).toHaveBeenCalledWith({ mode: 'user' })
  })

  it('keeps the icon-only trigger reachable when collapsed', () => {
    render(<ProjectScopeSwitcher collapsed />)

    expect(screen.getByRole('button', { name: 'Asset scope' })).toHaveAttribute('aria-haspopup', 'listbox')
  })

  it('closes the project scope menu with Escape while focus remains on the trigger', async () => {
    render(<ProjectScopeSwitcher collapsed={false} />)

    const trigger = screen.getByRole('button', { name: 'Asset scope' })
    fireEvent.click(trigger)
    expect(await screen.findByRole('listbox', { name: 'Asset scope options' })).toBeInTheDocument()

    fireEvent.keyDown(trigger, { key: 'Escape' })

    expect(screen.queryByRole('listbox', { name: 'Asset scope options' })).not.toBeInTheDocument()
  })

  it('shows an empty state when no project is available', async () => {
    window.api.projectScope.candidates = vi.fn(async () => [])
    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Asset scope' }))

    await waitFor(() => expect(screen.getByText('No project candidates yet.')).toBeInTheDocument())
  })

  it('closes the menu when clicking outside the popover', async () => {
    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Asset scope' }))
    expect(await screen.findByRole('listbox', { name: 'Asset scope options' })).toBeInTheDocument()

    fireEvent.pointerDown(document.body)
    fireEvent.mouseDown(document.body)

    await waitFor(() => {
      expect(screen.queryByRole('listbox', { name: 'Asset scope options' })).not.toBeInTheDocument()
    })
  })

  it('suspends titlebar drag regions while the menu is open so titlebar clicks can dismiss', async () => {
    render(<ProjectScopeSwitcher collapsed={false} />)
    expect(document.documentElement.classList.contains('suspend-titlebar-drag')).toBe(false)

    const trigger = screen.getByRole('button', { name: 'Asset scope' })
    fireEvent.click(trigger)
    await screen.findByRole('listbox', { name: 'Asset scope options' })
    expect(document.documentElement.classList.contains('suspend-titlebar-drag')).toBe(true)

    fireEvent.keyDown(trigger, { key: 'Escape' })
    await waitFor(() => {
      expect(document.documentElement.classList.contains('suspend-titlebar-drag')).toBe(false)
    })
  })

  it('moves option focus with arrow keys', async () => {
    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Asset scope' }))
    const globalOption = await screen.findByRole('option', { name: 'Global' })

    globalOption.focus()
    fireEvent.keyDown(globalOption, { key: 'ArrowDown' })
    expect(screen.getByRole('option', { name: 'User' })).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('option', { name: 'User' }), { key: 'ArrowUp' })
    expect(globalOption).toHaveFocus()
  })

  it('shows an active indicator on the trigger only for non-global scope', () => {
    const { unmount } = render(<ProjectScopeSwitcher collapsed={false} />)
    const trigger = screen.getByRole('button', { name: 'Asset scope' })
    // trigger 是 "维度: 值" 读出格式, 与 agent 侧统一。
    expect(within(trigger).getByText('Assets:')).toBeInTheDocument()
    expect(within(trigger).getByText('Global')).toBeInTheDocument()
    expect(trigger.querySelector('[data-scope-active-dot]')).toBeNull()
    unmount()

    useAppStore.setState({ scopeSelection: { mode: 'user' } })
    render(<ProjectScopeSwitcher collapsed={false} />)
    expect(
      screen.getByRole('button', { name: 'Asset scope' }).querySelector('[data-scope-active-dot]')
    ).not.toBeNull()
  })

  it('filters the project list once candidates exceed the threshold', async () => {
    const names = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta']
    window.api.projectScope.candidates = vi.fn(async () =>
      names.map((name) => createProjectScopeCandidate({ path: `D:\\Code\\${name}`, source: 'current' })!)
    )
    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Asset scope' }))
    expect(await screen.findByRole('option', { name: 'alpha' })).toBeInTheDocument()

    const input = await screen.findByTestId('project-scope-filter')
    fireEvent.change(input, { target: { value: 'zeta' } })

    await waitFor(() => {
      expect(screen.queryByRole('option', { name: 'alpha' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('option', { name: 'zeta' })).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'no-such-project' } })
    expect(await screen.findByText('No projects match your filter.')).toBeInTheDocument()
  })

  it('hides the filter input for small candidate lists', async () => {
    render(<ProjectScopeSwitcher collapsed={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Asset scope' }))
    expect(await screen.findByRole('option', { name: 'berth' })).toBeInTheDocument()

    expect(screen.queryByTestId('project-scope-filter')).not.toBeInTheDocument()
  })
})
