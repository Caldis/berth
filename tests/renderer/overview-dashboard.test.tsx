import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { Overview } from '../../src/renderer/src/pages/overview'
import { useAppStore } from '../../src/renderer/src/stores/app'
import { resetHealthCheckCacheForTests, resetSessionsCacheForTests } from '../../src/renderer/src/hooks/use-ipc'
import type { HealthCheck } from '@shared/types/ipc'

// GH-138: Overview 重构为模块化仪表盘后的行为测试 (替代旧 overview-redesign/health-checks/
// performance-loading 的内联结构断言)。健康检查改为弹窗, 区块改为 widget。

const baseStats = { skills: 3, mcpServers: 2, sessions: 7, plugins: 1, hooks: 0, commands: 0, subagents: 0 }

const HEALTH_CHECKS: HealthCheck[] = [
  {
    id: 'claude-code:source:user-claude-md-missing',
    severity: 'info' as const,
    category: 'source',
    agentId: 'claude-code',
    agentName: 'Claude Code',
    title: 'User CLAUDE.md not found',
    message: 'No user-level CLAUDE.md found.',
    suggestion: 'Create ~/.claude/CLAUDE.md if you want shared Claude Code instructions.',
    scope: 'user' as const,
    path: 'C:\\Users\\test\\.claude\\CLAUDE.md',
    assetType: 'claude-md' as const
  },
  {
    id: 'codex:syntax:user-config-invalid',
    severity: 'error' as const,
    category: 'syntax',
    agentId: 'codex',
    agentName: 'Codex',
    title: 'Invalid Codex config.toml',
    message: 'config.toml contains invalid TOML.',
    suggestion: 'Fix the TOML syntax in Codex config.toml.',
    fix: {
      label: 'Suggested fix',
      description: 'Fix the TOML.',
      snippet: 'model = "gpt-5.5"'
    },
    scope: 'user' as const,
    path: 'C:\\Users\\test\\.codex\\config.toml',
    assetType: 'mcp-server' as const
  }
]

beforeEach(async () => {
  localStorage.clear()
  await i18n.changeLanguage('en')
  resetHealthCheckCacheForTests()
  resetSessionsCacheForTests()
  act(() => {
    useAppStore.setState({ scopeSelection: { mode: 'global' }, assets: [], stats: baseStats })
  })
  window.api.sessions.list = vi.fn(async () => ({ sessions: [], totalCount: 0 }))
  window.api.assets.healthCheck = vi.fn(async () => [])
})

function renderOverview(): void {
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  )
}

function LocationProbe(): React.ReactElement {
  const location = useLocation()
  return <p>{`${location.pathname}${location.search}`}</p>
}

describe('overview dashboard', () => {
  it('renders the dashboard header with a customize toggle', async () => {
    renderOverview()
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Customize' })).toBeInTheDocument()
  })

  it('enters edit mode and reveals widget drag handles when customizing', async () => {
    renderOverview()
    const customize = await screen.findByRole('button', { name: 'Customize' })
    fireEvent.click(customize)
    expect(await screen.findByRole('button', { name: 'Done' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset layout' })).toBeInTheDocument()
    // a widget drag handle becomes available in edit mode
    expect(screen.getAllByRole('button', { name: /drag to reorder/ }).length).toBeGreaterThan(0)
  })

  it('routes quick-action widget metrics to first-level pages', async () => {
    renderOverview()
    fireEvent.click(await screen.findByRole('button', { name: /Skills/ }))
    expect(await screen.findByText('/instructions/skills')).toBeInTheDocument()
  })

  it('renders a structured empty state for recent sessions', async () => {
    renderOverview()
    expect(await screen.findByText('No recent sessions')).toBeInTheDocument()
  })

  it('collapses health checks into a modal opened from the toolbar entry', async () => {
    window.api.assets.healthCheck = vi.fn(async () => HEALTH_CHECKS)
    window.api.shell.openPath = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn(async () => {}) }
    })

    renderOverview()

    // health is NOT flat on the page — only the entry button is, with status + count
    const entry = await screen.findByRole('button', { name: 'Health Checks' })
    expect(screen.queryByText('Invalid Codex config.toml')).not.toBeInTheDocument()

    fireEvent.click(entry)

    // modal opens with grouped, localized checks
    expect(await screen.findByText('Invalid Codex config.toml')).toBeInTheDocument()
    expect(screen.getByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('Codex')).toBeInTheDocument()
    expect(screen.getByText('User CLAUDE.md not found')).toBeInTheDocument()

    // copy fix snippet works
    fireEvent.click(screen.getByRole('button', { name: 'Copy fix snippet' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('model = "gpt-5.5"')

    // ignore an info check removes it and persists
    fireEvent.click(screen.getByRole('button', { name: 'Ignore info check' }))
    expect(screen.queryByText('User CLAUDE.md not found')).not.toBeInTheDocument()
    expect(localStorage.getItem('berth-ignored-health-checks')).toContain('claude-code:source:user-claude-md-missing')
  })
})
