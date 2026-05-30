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
        description: 'Claude Code user configuration'
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
        description: 'Codex session history'
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
    expect(screen.getByText('C:\\Users\\test\\.claude')).toBeInTheDocument()
    expect(screen.getByText('C:\\Users\\test\\.codex\\sessions')).toBeInTheDocument()
    expect(screen.queryByText('~/.claude/')).not.toBeInTheDocument()
  })

  it('opens an existing source path from its own row', async () => {
    render(<SettingsContent showTitle={false} />)

    const codexPath = await screen.findByText('C:\\Users\\test\\.codex\\sessions')
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
