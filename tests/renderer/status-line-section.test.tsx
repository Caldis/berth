import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import '../../src/renderer/src/i18n'
import { StatusLineSection } from '../../src/renderer/src/pages/capabilities'
import type { AgentView, Asset } from '../../src/shared/types/asset'

function statusLineAsset(id: string, agentId: string, meta: Record<string, unknown>, scope: Asset['scope'] = 'user'): Asset {
  return {
    id,
    agentId,
    category: 'capability',
    type: 'statusline',
    scope,
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

    expect(screen.queryByText('Status lines show live session state')).not.toBeInTheDocument()
    expect(screen.queryByText('Claude Code command')).not.toBeInTheDocument()
    expect(screen.getByText('statusLine')).toBeInTheDocument()
    expect(screen.getByText('pwsh C:\\Users\\test\\.claude\\statusline.ps1')).toBeInTheDocument()
    expect(screen.getByText('disableAllHooks is enabled in this settings file.')).toBeInTheDocument()
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

    expect(screen.queryByText('Status lines show live session state')).not.toBeInTheDocument()
    expect(screen.queryByText(/Reads \[tui\]\.status_line from config\.toml/)).not.toBeInTheDocument()
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

    expect(screen.getAllByText(/status_line is explicitly empty/).length).toBeGreaterThan(0)
  })

  it('keeps an explanatory empty state visible', () => {
    renderStatusLine('all', [])

    expect(screen.queryByText('Status lines show live session state')).not.toBeInTheDocument()
    expect(screen.getByText(/No status line config was found/)).toBeInTheDocument()
    expect(screen.getByText('Codex default footer')).toBeInTheDocument()
    expect(screen.getByText('model-with-reasoning')).toBeInTheDocument()
  })

  it('marks the highest-priority status line as effective', () => {
    renderStatusLine('claude', [
      statusLineAsset('user-status', 'claude-code', {
        provider: 'claude-code',
        settingKey: 'statusLine',
        statusLineKind: 'main',
        command: 'echo user'
      }),
      statusLineAsset('project-status', 'claude-code', {
        provider: 'claude-code',
        settingKey: 'statusLine',
        statusLineKind: 'main',
        command: 'echo project'
      }, 'project')
    ])

    expect(screen.getByText('echo project')).toBeInTheDocument()
    expect(screen.getByText('echo user')).toBeInTheDocument()
    expect(screen.getByText('Overridden by project scope')).toBeInTheDocument()
    expect(screen.getAllByText('Effective')).toHaveLength(1)
    expect(screen.getAllByText('Overridden')).toHaveLength(1)
  })

  it('redacts sensitive command fragments by default', () => {
    renderStatusLine('claude', [
      statusLineAsset('secret-status', 'claude-code', {
        provider: 'claude-code',
        settingKey: 'statusLine',
        statusLineKind: 'main',
        command: 'TOKEN=abc123 node statusline.js --api-key sk-test Bearer raw-token'
      })
    ])

    expect(screen.getByText(/TOKEN=\[redacted\]/)).toBeInTheDocument()
    expect(screen.getByText(/--api-key \[redacted\]/)).toBeInTheDocument()
    expect(screen.getByText(/Bearer \[redacted\]/)).toBeInTheDocument()
    expect(screen.queryByText(/sk-test/)).not.toBeInTheDocument()
    expect(screen.getByText(/Sensitive command fragments are hidden/)).toBeInTheDocument()
  })

  it('warns when a Claude command looks like an unresolved script path', () => {
    renderStatusLine('claude', [
      statusLineAsset('missing-script-status', 'claude-code', {
        provider: 'claude-code',
        settingKey: 'statusLine',
        statusLineKind: 'main',
        command: 'C:\\Users\\test\\.claude\\missing-statusline.ps1',
        entryPaths: []
      })
    ])

    expect(screen.getByText(/did not confirm a readable local script/)).toBeInTheDocument()
  })
})
