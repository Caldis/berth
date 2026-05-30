import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import { HooksLifecycleView } from '../../src/renderer/src/components/capabilities/hooks-lifecycle-view'
import type { AgentView, Asset } from '../../src/shared/types/asset'
import type { HealthCheck } from '../../src/shared/types/ipc'

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
    window.api.assets.healthCheck = vi.fn(async () => [])
    window.api.shell.openPath = vi.fn(async () => {})
    window.api.hooks.setHookEnabled = vi.fn(async (request) => ({
      hookKey: request.hookKey,
      enabled: request.enabled,
      changed: true,
      sourcePath: 'C:\\Users\\test\\.codex\\config.toml'
    }))
    window.confirm = vi.fn(() => true)
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

  it('switches to cross-agent comparison mode in all view', async () => {
    renderHooks('all', [
      hookAsset('claude-pre', 'claude-code', 'PreToolUse'),
      hookAsset('codex-stop', 'codex', 'Stop')
    ])
    await waitForEnablementStatus()

    fireEvent.click(screen.getByRole('button', { name: 'Compare agents' }))

    expect(screen.getByText('Lifecycle comparison')).toBeInTheDocument()
    expect(screen.getAllByText('Claude Code events').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Codex events').length).toBeGreaterThan(0)
  })

  it('hides unrelated comparison columns in Codex view', async () => {
    renderHooks('codex', [hookAsset('codex-stop', 'codex', 'Stop')])
    await waitForEnablementStatus()

    fireEvent.click(screen.getByRole('button', { name: 'Compare agents' }))

    expect(screen.getByText('Lifecycle comparison')).toBeInTheDocument()
    expect(screen.getAllByText('Codex events').length).toBeGreaterThan(0)
    expect(screen.queryByText('Claude Code events')).not.toBeInTheDocument()
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

  it('toggles a Codex non-managed hook through hooks.state', async () => {
    renderHooks('codex', [
      hookAsset('codex-stop', 'codex', 'Stop', {
        hookKey: 'C:\\Users\\test\\.codex\\hooks.json:stop:0:0',
        enabled: true,
        canToggleHook: true
      })
    ])
    await waitForEnablementStatus()

    fireEvent.click(screen.getByText('Disable hook'))

    await waitFor(() => {
      expect(window.api.hooks.setHookEnabled).toHaveBeenCalledWith({
        agentId: 'codex',
        scope: 'user',
        hookKey: 'C:\\Users\\test\\.codex\\hooks.json:stop:0:0',
        sourcePath: 'C:\\Users\\test\\.codex\\hooks.json',
        enabled: false,
        managed: false
      })
    })
    expect(screen.getByText('Disabled')).toBeInTheDocument()
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

  it('shows row-level risk hints for broad hooks without entry files', async () => {
    renderHooks('codex', [
      hookAsset('codex-pre', 'codex', 'PreToolUse', {
        command: 'python hook.py',
        entryPaths: [],
        matcher: undefined
      })
    ])
    await waitForEnablementStatus()

    expect(screen.getByText('Entry file not detected')).toBeInTheDocument()
    expect(screen.getByText('Runs for every matching tool')).toBeInTheDocument()
  })

  it('shows user and project hook switches separately', async () => {
    window.api.hooks.statuses = vi.fn(async (agentId) => [
      {
        agentId,
        agentName: 'Codex',
        scope: 'user',
        enabled: true,
        sourcePath: 'C:\\Users\\test\\.codex\\config.toml',
        sourceExists: true,
        supported: true,
        writable: true
      },
      {
        agentId,
        agentName: 'Codex',
        scope: 'project',
        enabled: false,
        sourcePath: 'D:\\Code\\berth\\.codex\\config.toml',
        sourceExists: true,
        supported: true,
        writable: false,
        reasonKey: 'capabilities.hooks.management.projectReadOnly'
      }
    ])

    renderHooks('codex', [hookAsset('codex-stop', 'codex', 'Stop')])
    await waitForEnablementStatus()

    expect(screen.getByText('User scope')).toBeInTheDocument()
    expect(screen.getByText('Project scope')).toBeInTheDocument()
    expect(screen.getByText('Project-level hook switches are shown for review only. Edit the source file directly.')).toBeInTheDocument()
  })

  it('switches to compact density and keeps long commands visible', async () => {
    const longCommand = 'python scripts/hooks/pre_tool_use_with_a_very_long_name.py --check safety --format json'
    renderHooks('codex', [
      hookAsset('codex-pre', 'codex', 'PreToolUse', {
        command: longCommand
      })
    ])
    await waitForEnablementStatus()

    const compactButton = screen.getByRole('button', { name: 'Compact' })
    fireEvent.click(compactButton)

    expect(compactButton.className).toContain('bg-foreground')
    expect(screen.getByText(longCommand)).toBeInTheDocument()
  })

  it('summarizes visible hook health checks and jumps to the details', async () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView
    })
    const checks: HealthCheck[] = [
      {
        id: 'codex:configuration:user-hook-windows-command',
        severity: 'warning',
        category: 'configuration',
        agentId: 'codex',
        agentName: 'Codex',
        title: 'Codex hook has no Windows command override',
        message: 'A command hook is configured without commandWindows on Windows.',
        path: 'C:\\Users\\test\\.codex\\hooks.json',
        assetType: 'hook',
        target: { route: '/configuration/capabilities?tab=hooks' }
      },
      {
        id: 'claude-code:structure:user-hook-missing-command',
        severity: 'error',
        category: 'structure',
        agentId: 'claude-code',
        agentName: 'Claude Code',
        title: 'Claude Code hook is missing command',
        message: 'PreToolUse contains a command hook without a command.',
        path: 'C:\\Users\\test\\.claude\\settings.json',
        assetType: 'hook',
        target: { route: '/configuration/capabilities?tab=hooks' }
      },
      {
        id: 'codex:configuration:user-mcp-disabled',
        severity: 'warning',
        category: 'configuration',
        agentId: 'codex',
        agentName: 'Codex',
        title: 'Codex MCP server is disabled',
        message: 'This is not a hook check.',
        assetType: 'mcp-server'
      }
    ]
    window.api.assets.healthCheck = vi.fn(async () => checks)

    renderHooks('codex', [hookAsset('codex-stop', 'codex', 'Stop')])
    await waitForEnablementStatus()

    expect(await screen.findByText('1 hook check needs attention')).toBeInTheDocument()
    expect(screen.getByText('Codex hook has no Windows command override')).toBeInTheDocument()
    expect(screen.queryByText('Claude Code hook is missing command')).not.toBeInTheDocument()
    expect(screen.queryByText('Codex MCP server is disabled')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Review hook checks' }))

    expect(scrollIntoView).toHaveBeenCalled()
  })
})
