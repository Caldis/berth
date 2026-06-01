import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import '../../src/renderer/src/i18n'
import { Capabilities } from '../../src/renderer/src/pages/capabilities'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { Asset } from '../../src/shared/types/asset'

function hookAsset(): Asset {
  return {
    id: 'codex-stop',
    agentId: 'codex',
    category: 'capability',
    type: 'hook',
    scope: 'user',
    name: 'Stop hook',
    path: 'C:\\Users\\test\\.codex\\config.toml',
    meta: {
      eventType: 'Stop',
      command: 'pwsh hooks\\stop.ps1'
    }
  }
}

function statusLineAsset(): Asset {
  return {
    id: 'codex-status',
    agentId: 'codex',
    category: 'capability',
    type: 'statusline',
    scope: 'user',
    name: 'TUI Status Line',
    path: 'C:\\Users\\test\\.codex\\config.toml',
    meta: {
      provider: 'codex',
      settingKey: 'tui.status_line',
      statusLineKind: 'footer-items',
      items: ['model-with-reasoning', 'current-dir']
    }
  }
}

describe('Capabilities guidance surfaces', () => {
  beforeEach(() => {
    useAppStore.setState({ assets: [hookAsset()], agentView: 'all' })
  })

  it('keeps hook concept guidance in the page guide instead of the lifecycle tool', async () => {
    render(<Capabilities />)

    fireEvent.click(screen.getByRole('button', { name: /Hooks/ }))

    expect(await screen.findByText('Lifecycle automation')).toBeInTheDocument()
    expect(screen.getByText('Trigger point')).toBeInTheDocument()
    expect(screen.getByText('Agent differences')).toBeInTheDocument()
    expect(screen.queryByText('What are hooks?')).not.toBeInTheDocument()
    expect(screen.getByText('Hook checks')).toBeInTheDocument()
  })

  it('keeps status line model guidance in the page guide instead of the status tool', async () => {
    useAppStore.setState({ assets: [statusLineAsset()], agentView: 'all' })
    render(<Capabilities />)

    fireEvent.click(screen.getByRole('button', { name: /Status Line/ }))

    expect(await screen.findByText('Runtime status surface')).toBeInTheDocument()
    expect(screen.getAllByText('Claude Code command')).toHaveLength(1)
    expect(screen.getAllByText(/Reads \[tui\]\.status_line from config\.toml/)).toHaveLength(1)
    expect(screen.queryByText('Status lines show live session state')).not.toBeInTheDocument()
    expect(screen.getByText('tui.status_line')).toBeInTheDocument()
  })
})
