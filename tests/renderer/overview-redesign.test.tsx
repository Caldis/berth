import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { Overview } from '../../src/renderer/src/pages/overview'
import { useAppStore } from '../../src/renderer/src/stores/app'
import { normalizeTokenUsage } from '../../src/shared/token-usage'

const emptyStats = {
  skills: 0,
  mcpServers: 0,
  sessions: 0,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0,
}

const emptyUsage = {
  totalCost: 0,
  actualCost: 0,
  estimatedCost: 0,
  costDelta: 0,
  totalTokens: 0,
  tokenUsage: normalizeTokenUsage({ totalTokens: 0 }),
  costSource: 'unknown' as const,
  pricingMisses: [],
  dailyCosts: [],
  dailyTokenUsage: [],
  byModel: [],
  byProject: [],
  rateLimits: []
}

describe('overview redesign', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('en')
    act(() => {
      useAppStore.setState({
        scopeSelection: { mode: 'global' },
        assets: [],
        stats: emptyStats
      })
    })
    window.api.sessions.list = vi.fn(async () => ({ sessions: [], totalCount: 0 }))
    window.api.usage.summary = vi.fn(async () => emptyUsage)
    window.api.assets.healthCheck = vi.fn(async () => [])
  })

  it('shows the current agent and project scope in the first viewport', async () => {
    act(() => {
      useAppStore.setState({
        scopeSelection: {
          mode: 'project',
          projectPath: 'D:/Code/berth',
          projectPathKey: 'd:/code/berth'
        },
        stats: {
          ...emptyStats,
          skills: 3,
          mcpServers: 2,
          sessions: 7,
          plugins: 1
        }
      })
    })

    renderOverview()

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByText('Current agent')).toBeInTheDocument()
    // agentView 切换器残迹已删除: 当前 Agent 恒为 All (issue agent-view-store-vestige)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Project scope')).toBeInTheDocument()
    expect(screen.getByText('D:/Code/berth')).toBeInTheDocument()
    expect(window.api.sessions.list).toHaveBeenCalledWith({
      projectFilter: undefined,
      limit: 5,
      projectPath: 'D:/Code/berth'
    })
    expect(window.api.usage.summary).toHaveBeenCalledWith({
      days: 7,
      projectPath: 'D:/Code/berth'
    })
  })

  it('routes quick action metrics to promoted first-level pages', async () => {
    act(() => {
      useAppStore.setState({
        stats: {
          ...emptyStats,
          skills: 3,
          mcpServers: 2,
          sessions: 7,
          plugins: 1
        }
      })
    })

    renderOverview()

    fireEvent.click(await screen.findByRole('button', { name: /Skills/ }))

    expect(await screen.findByText('/instructions/skills')).toBeInTheDocument()
  })

  it('uses explicit health loading and normal states', async () => {
    window.api.assets.healthCheck = vi.fn(() => new Promise(() => undefined))

    renderOverview()

    expect(await screen.findByText('No recent sessions')).toBeInTheDocument()
    expect(screen.getAllByText('Checking health').length).toBeGreaterThan(0)
  })

  it('renders structured empty states without raw placeholder copy', async () => {
    renderOverview()

    expect(await screen.findByText('No recent sessions')).toBeInTheDocument()
    expect(screen.getByText('No usage recorded for the last 7 days')).toBeInTheDocument()
    expect(screen.getByText('No health checks need attention')).toBeInTheDocument()
    expect(screen.queryAllByText('Nothing here yet')).toHaveLength(0)
  })

  it('surfaces a usage load failure as an inline error state with retry (GH-118 T1)', async () => {
    window.api.usage.summary = vi
      .fn()
      .mockRejectedValueOnce(new Error('usage boom'))
      .mockResolvedValue(emptyUsage)

    renderOverview()

    expect(await screen.findByText('Usage data could not be loaded')).toBeInTheDocument()
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    // The panel shell (title) stays in place — only the content area swaps.
    expect(screen.getByText('Cost (last 7 days)')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('No usage recorded for the last 7 days')).toBeInTheDocument()
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(window.api.usage.summary).toHaveBeenCalledTimes(2)
  })
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
