import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import '../../src/renderer/src/i18n'
import { StatusLineSection } from '../../src/renderer/src/pages/capabilities'
import type { AgentView, Asset } from '../../src/shared/types/asset'

function statusLineAsset(id: string, agentId: string, meta: Record<string, unknown>): Asset {
  return {
    id,
    agentId,
    category: 'capability',
    type: 'statusline',
    scope: 'user',
    name: agentId === 'codex' ? 'TUI Status Line' : 'Status Line',
    path: agentId === 'codex' ? 'C:\\Users\\test\\.codex\\config.toml' : 'C:\\Users\\test\\.claude\\settings.json',
    meta
  }
}

function renderStatusLine(agentView: AgentView, assets: Asset[]): void {
  render(<StatusLineSection assets={assets} agentView={agentView} />)
}

describe('StatusLineSection', () => {
  it('shows Claude command-backed status line details', () => {
    renderStatusLine('claude', [
      statusLineAsset('claude-status', 'claude-code', {
        provider: 'claude-code',
        settingKey: 'statusLine',
        command: 'pwsh C:\\Users\\test\\.claude\\statusline.ps1',
        refreshInterval: 5,
        padding: 2,
        hideVimModeIndicator: true,
        disabledByDisableAllHooks: true,
        entryPaths: ['C:\\Users\\test\\.claude\\statusline.ps1']
      })
    ])

    expect(screen.getByText(/Claude Code status lines are command-backed settings from settings.json/)).toBeInTheDocument()
    expect(screen.getByText('statusLine')).toBeInTheDocument()
    expect(screen.getByText('pwsh C:\\Users\\test\\.claude\\statusline.ps1')).toBeInTheDocument()
    expect(screen.getByText('Disabled by disableAllHooks')).toBeInTheDocument()
    expect(screen.getByText('C:\\Users\\test\\.claude\\statusline.ps1')).toBeInTheDocument()
  })

  it('shows Codex footer items and unknown item warnings', () => {
    renderStatusLine('codex', [
      statusLineAsset('codex-status', 'codex', {
        provider: 'codex',
        settingKey: 'tui.status_line',
        statusLineKind: 'footer-items',
        items: ['model-with-reasoning', 'not-a-real-item', 'current-dir'],
        unknownItems: ['not-a-real-item'],
        useThemeColors: false
      })
    ])

    expect(screen.getByText(/Codex status lines are built-in TUI footer items persisted in config.toml/)).toBeInTheDocument()
    expect(screen.getByText('tui.status_line')).toBeInTheDocument()
    expect(screen.getByText('model-with-reasoning')).toBeInTheDocument()
    expect(screen.getByText('not-a-real-item')).toBeInTheDocument()
    expect(screen.getByText('1 unknown item(s) will be ignored by current Codex builds.')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
  })

  it('explains empty Codex status_line as an explicit hide', () => {
    renderStatusLine('codex', [
      statusLineAsset('codex-hidden-status', 'codex', {
        provider: 'codex',
        settingKey: 'tui.status_line',
        statusLineKind: 'footer-items',
        items: [],
        hidden: true
      })
    ])

    expect(screen.getByText(/status_line is explicitly empty/)).toBeInTheDocument()
  })

  it('keeps an explanatory empty state visible', () => {
    renderStatusLine('all', [])

    expect(screen.getByText('Status lines show live session state')).toBeInTheDocument()
    expect(screen.getByText(/No status line config was found/)).toBeInTheDocument()
  })
})
