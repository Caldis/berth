import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import '../../src/renderer/src/i18n'
import { Overview } from '../../src/renderer/src/pages/overview'

describe('overview health checks', () => {
  it('renders info, warning and error checks grouped by agent', async () => {
    window.api.sessions.list = vi.fn(async () => ({ sessions: [], totalCount: 0 }))
    window.api.usage.summary = vi.fn(async () => ({
      totalCost: 0,
      totalTokens: 0,
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        reasoningOutputTokens: 0,
        unknownTokens: 0,
        totalTokens: 0,
        hasBreakdown: false
      },
      costSource: 'unknown',
      dailyCosts: [],
      dailyTokenUsage: [],
      byModel: [],
      byProject: [],
      rateLimits: []
    }))
    window.api.assets.healthCheck = vi.fn(async () => [
      {
        id: 'claude-code:source:user-claude-md-missing',
        severity: 'info',
        category: 'source',
        agentId: 'claude-code',
        agentName: 'Claude Code',
        title: 'User CLAUDE.md not found',
        message: 'No user-level CLAUDE.md found.',
        suggestion: 'Create ~/.claude/CLAUDE.md if you want shared Claude Code instructions.',
        scope: 'user',
        path: 'C:\\Users\\test\\.claude\\CLAUDE.md',
        assetType: 'claude-md'
      },
      {
        id: 'codex:configuration:user-hook-windows-command',
        severity: 'warning',
        category: 'configuration',
        agentId: 'codex',
        agentName: 'Codex',
        title: 'Codex hook has no Windows command override',
        message: 'A command hook is configured without commandWindows on Windows.',
        suggestion: 'Add commandWindows or command_windows when the command differs on Windows.',
        evidence: [{ label: 'Codex hooks', url: 'https://developers.openai.com/codex/hooks' }],
        fix: {
          label: 'Suggested fix',
          description: 'Add commandWindows or command_windows when the command differs on Windows.'
        },
        target: { route: '/configuration/capabilities?tab=hooks', path: 'C:\\Users\\test\\.codex\\config.toml' },
        confidence: 'medium',
        scope: 'user',
        path: 'C:\\Users\\test\\.codex\\config.toml',
        assetType: 'hook'
      },
      {
        id: 'codex:syntax:user-config-invalid',
        severity: 'error',
        category: 'syntax',
        agentId: 'codex',
        agentName: 'Codex',
        title: 'Invalid Codex config.toml',
        message: 'config.toml contains invalid TOML.',
        suggestion: 'Fix the TOML syntax in Codex config.toml.',
        scope: 'user',
        path: 'C:\\Users\\test\\.codex\\config.toml',
        assetType: 'mcp-server'
      }
    ])
    window.api.shell.openPath = vi.fn(async () => {})
    window.api.shell.openExternal = vi.fn(async () => {})

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/configuration/capabilities" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('Codex')).toBeInTheDocument()
    expect(screen.getByText('User CLAUDE.md not found')).toBeInTheDocument()
    expect(screen.getByText('Codex hook has no Windows command override')).toBeInTheDocument()
    expect(screen.getByText('Invalid Codex config.toml')).toBeInTheDocument()
    expect(screen.getByText('Codex hooks')).toBeInTheDocument()
    expect(screen.getByText(/Suggested fix:/)).toBeInTheDocument()
    expect(screen.getByText('1 info')).toBeInTheDocument()
    expect(screen.getByText('1 warning')).toBeInTheDocument()
    expect(screen.getByText('1 error')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Codex hooks'))

    expect(window.api.shell.openExternal).toHaveBeenCalledWith('https://developers.openai.com/codex/hooks')

    fireEvent.click(screen.getByText('Codex hook has no Windows command override').closest('[role="button"]')!)

    expect(await screen.findByText('/configuration/capabilities?tab=hooks')).toBeInTheDocument()
    expect(window.api.shell.openPath).not.toHaveBeenCalled()
  })
})

function LocationProbe(): React.ReactElement {
  const location = useLocation()
  return <p>{`${location.pathname}${location.search}`}</p>
}
