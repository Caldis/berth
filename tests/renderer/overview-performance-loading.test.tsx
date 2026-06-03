import { fireEvent, render, screen } from '@testing-library/react'
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

describe('overview performance loading', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    useAppStore.setState({
      agentView: 'all',
      scopeSelection: { mode: 'global' },
      assets: [],
      stats: emptyStats,
      assetRuntimeStatus: {
        state: 'scanning',
        reason: 'startup',
        stale: false
      }
    })
    window.api.sessions.list = vi.fn(async () => ({ sessions: [], totalCount: 0 }))
    window.api.usage.summary = vi.fn(async () => emptyUsage)
    window.api.assets.healthCheck = vi.fn(async () => [])
  })

  it('uses local metric skeletons without blocking navigation actions', async () => {
    renderOverview()

    expect(await screen.findAllByRole('status', { name: 'Loading asset metrics' })).toHaveLength(4)

    fireEvent.click(screen.getByRole('button', { name: /Skills/ }))

    expect(await screen.findByText('/instructions/skills')).toBeInTheDocument()
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
