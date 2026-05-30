import { fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import { SettingsContent } from '../../src/renderer/src/pages/settings'
import type { AgentScanSourceGroup } from '../../src/shared/types/ipc'

const groups: AgentScanSourceGroup[] = [
  {
    agentId: 'claude-code',
    agentName: 'Claude Code',
    installed: true,
    roots: [
      {
        path: 'C:\\Users\\test\\.claude',
        scope: 'user',
        description: 'Claude Code data directory',
        summary:
          'Includes instructions, skills, agents, commands, hooks, plugins, status line, sessions, plans, todos, usage data, and integration state.',
        categories: ['instruction', 'capability', 'state', 'observability', 'integration']
      },
      {
        path: 'C:\\Users\\test\\.claude.json',
        scope: 'user',
        description: 'Claude Code global config file',
        summary: 'Includes global MCP server definitions.',
        categories: ['capability']
      }
    ]
  },
  {
    agentId: 'codex',
    agentName: 'Codex',
    installed: true,
    roots: [
      {
        path: 'C:\\Users\\test\\.codex\\sessions',
        scope: 'user',
        description: 'Codex session history directory',
        summary: 'Includes Codex rollout session history.',
        categories: ['state']
      }
    ]
  }
]

describe('SettingsContent scan sources', () => {
  beforeEach(() => {
    window.api.assets.scanSources = vi.fn(async () => groups)
    window.api.shell.openPath = vi.fn(async () => {})
  })

  it('renders local sources from the main-process scanner roots', async () => {
    render(<SettingsContent showTitle={false} />)

    expect(await screen.findByText('Local Sources')).toBeInTheDocument()
    expect(screen.getByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('Codex')).toBeInTheDocument()
    expect(screen.getByText('2 sources')).toBeInTheDocument()
    expect(screen.getByText('1 source')).toBeInTheDocument()
    expect(screen.getByText('Instructions')).toBeInTheDocument()
    expect(screen.getByText('Capabilities')).toBeInTheDocument()
    expect(screen.getAllByText('State').length).toBeGreaterThan(0)
    expect(screen.queryByText('C:\\Users\\test\\.claude')).not.toBeInTheDocument()
    expect(screen.queryByText('C:\\Users\\test\\.claude.json')).not.toBeInTheDocument()
    expect(screen.queryByText('C:\\Users\\test\\.codex\\sessions')).not.toBeInTheDocument()
    expect(screen.queryByText('~/.claude/')).not.toBeInTheDocument()
  })

  it('expands a source group before opening a concrete path', async () => {
    render(<SettingsContent showTitle={false} />)

    fireEvent.click(await screen.findByRole('button', { name: /Codex/ }))

    expect(screen.getByText('Codex session history directory')).toBeInTheDocument()
    expect(screen.getByText('Includes Codex rollout session history.')).toBeInTheDocument()
    const codexPath = screen.getByText('C:\\Users\\test\\.codex\\sessions')
    const row = codexPath.closest('[data-scan-source-root]')
    expect(row).not.toBeNull()

    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Show in Explorer' }))

    expect(window.api.shell.openPath).toHaveBeenCalledWith('C:\\Users\\test\\.codex\\sessions')
  })

  it('shows missing agents without an explorer action', async () => {
    window.api.assets.scanSources = vi.fn(async () => [
      {
        agentId: 'claude-code',
        agentName: 'Claude Code',
        installed: false,
        roots: []
      }
    ])

    render(<SettingsContent showTitle={false} />)

    expect(await screen.findByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('Not found')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show in Explorer' })).not.toBeInTheDocument()
  })
})
