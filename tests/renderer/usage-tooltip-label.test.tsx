import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import i18n from '../../src/renderer/src/i18n'
import { normalizeTokenUsage } from '../../src/shared/token-usage'

vi.mock('recharts', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react')
  const Container = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement('div', null, children)
  const Empty = () => null
  const Tooltip = ({
    formatter
  }: {
    formatter?: (value: number) => [React.ReactNode, React.ReactNode]
  }) => {
    const formatted = formatter?.(1.23)
    return ReactModule.createElement(
      'div',
      { 'data-testid': 'daily-cost-tooltip-label' },
      formatted?.[1]
    )
  }

  return {
    Bar: Empty,
    BarChart: Container,
    Cell: Empty,
    Pie: Container,
    PieChart: Container,
    ResponsiveContainer: Container,
    Tooltip,
    XAxis: Empty,
    YAxis: Empty
  }
})

describe('Usage daily cost tooltip label', () => {
  it('localizes the daily cost series label', async () => {
    await i18n.changeLanguage('zh')
    const tokenUsage = normalizeTokenUsage({ inputTokens: 10, outputTokens: 2 })
    window.api.usage.summary = vi.fn(async () => ({
      totalCost: 0.3,
      actualCost: 0.3,
      estimatedCost: 0.26,
      costDelta: 0.04,
      costMode: 'auto',
      totalTokens: tokenUsage.totalTokens,
      tokenUsage,
      costSource: 'actual',
      pricingMisses: [],
      dailyCosts: [{ date: '2026-05-30', cost: 0.3 }],
      dailyTokenUsage: [],
      byModel: [],
      byProject: [],
      rateLimits: []
    }))

    const { Usage } = await import('../../src/renderer/src/pages/usage')

    render(
      <MemoryRouter>
        <Usage />
      </MemoryRouter>
    )

    expect(await screen.findByTestId('daily-cost-tooltip-label')).toHaveTextContent('费用')
    expect(screen.queryByText('Cost')).not.toBeInTheDocument()
  }, 15000) // Usage page render is heavy; the 5s default flakes under parallel load.
})
