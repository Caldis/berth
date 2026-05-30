import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import { HooksLifecycleView } from '../../src/renderer/src/components/capabilities/hooks-lifecycle-view'
import type { AgentView, Asset } from '../../src/shared/types/asset'

function hookAsset(
  id: string,
  agentId: string,
  eventType: string,
  meta: Record<string, unknown> = {}
): Asset {
  return {
    id,
    agentId,
    category: 'capability',
    type: 'hook',
    scope: 'user',
    name: id,
    path: agentId === 'codex' ? 'C:\\Users\\test\\.codex\\hooks.json' : 'C:\\Users\\test\\.claude\\settings.json',
    meta: {
      eventType,
      command: agentId === 'codex' ? 'pwsh hooks\\stop.ps1' : 'echo stop',
      matcher: eventType === 'PreToolUse' ? 'Bash' : undefined,
      ...meta
    }
  }
}

function renderHooks(agentView: AgentView, assets: Asset[]): void {
  render(<HooksLifecycleView assets={assets} agentView={agentView} search="" scope="all" />)
}

async function waitForEnablementStatus(): Promise<void> {
  await screen.findAllByText('Enabled')
}

describe('HooksLifecycleView', () => {
  beforeEach(() => {
    window.api.shell.openPath = vi.fn(async () => {})
  })

  it('shows Codex-only copy without Claude Code support rows in Codex view', async () => {
    renderHooks('codex', [hookAsset('codex-stop', 'codex', 'Stop')])
    await waitForEnablementStatus()

    expect(screen.getByText('What are hooks?')).toBeInTheDocument()
    expect(screen.getByText(/Hooks are Codex command handlers/)).toBeInTheDocument()
    expect(screen.getByText(/This view only describes Codex hooks/)).toBeInTheDocument()
    expect(screen.getAllByText('Agent stops').length).toBeGreaterThan(0)
    expect(screen.queryByText('Environment events')).not.toBeInTheDocument()
    expect(screen.queryByText('Claude Code')).not.toBeInTheDocument()
  })

  it('shows Claude-only copy without Codex hints in Claude view', async () => {
    renderHooks('claude', [hookAsset('claude-stop', 'claude-code', 'Stop')])
    await waitForEnablementStatus()

    expect(screen.getByText(/Hooks are Claude Code handlers/)).toBeInTheDocument()
    expect(screen.getByText(/This view only describes Claude Code hooks/)).toBeInTheDocument()
    expect(screen.queryByText(/Codex/)).not.toBeInTheDocument()
  })

  it('shows cross-agent differences in all view', async () => {
    renderHooks('all', [
      hookAsset('claude-pre', 'claude-code', 'PreToolUse'),
      hookAsset('codex-stop', 'codex', 'Stop')
    ])
    await waitForEnablementStatus()

    expect(screen.getByText(/combines Claude Code and Codex/)).toBeInTheDocument()
    expect(screen.getAllByText('Claude Code').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Codex').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Codex only applies tool hooks/).length).toBeGreaterThan(0)
  })

  it('keeps lifecycle explanations visible when there are no hooks', async () => {
    renderHooks('claude', [])
    await waitForEnablementStatus()

    expect(screen.getAllByText('Session starts').length).toBeGreaterThan(0)
    expect(screen.getAllByText('No hook is configured for this stage.').length).toBeGreaterThan(0)
  })

  it('explains why Claude single hook toggles are not available', async () => {
    renderHooks('claude', [hookAsset('claude-stop', 'claude-code', 'Stop')])
    await waitForEnablementStatus()

    expect(screen.getByText(/Claude Code does not provide a supported way/)).toBeInTheDocument()
  })

  it('opens hook source files from the row action menu', async () => {
    renderHooks('codex', [hookAsset('codex-stop', 'codex', 'Stop')])
    await waitForEnablementStatus()

    fireEvent.click(screen.getAllByText('Actions')[0])
    fireEvent.click(screen.getByText('Open source file'))

    await waitFor(() => {
      expect(window.api.shell.openPath).toHaveBeenCalledWith('C:\\Users\\test\\.codex\\hooks.json')
    })
  })
})
