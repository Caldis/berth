import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../src/renderer/src/i18n'
import { Overview } from '../../src/renderer/src/pages/overview'
import { Sessions } from '../../src/renderer/src/pages/sessions'
import { SessionDetail } from '../../src/renderer/src/pages/session-detail'
import { Usage } from '../../src/renderer/src/pages/usage'
import type { Asset, SessionSummary, UsageSummary } from '../../src/shared/types/asset'
import { normalizeTokenUsage } from '../../src/shared/token-usage'
import { useAppStore } from '../../src/renderer/src/stores/app'

const summary: SessionSummary = {
  id: 'session-session-abc',
  agentId: 'claude-code',
  title: 'Fix session metadata',
  project: 'berth',
  projectPath: 'D:\\Code\\berth',
  transcriptPath: 'C:\\Users\\test\\.claude\\projects\\D--Code-berth\\session.jsonl',
  startedAt: '2026-05-30T01:00:00.000Z',
  endedAt: '2026-05-30T01:05:00.000Z',
  duration: 300,
  cost: null,
  tokens: 38,
  tokenUsage: normalizeTokenUsage({
    inputTokens: 10,
    outputTokens: 5,
    cacheReadInputTokens: 20,
    cacheCreationInputTokens: 3
  }),
  model: 'claude-sonnet-4-20250514',
  skillsUsed: ['frontend-design'],
  mcpServers: ['plugin_playwright_playwright'],
  hooksFired: 2
}

function makeAsset(type: Asset['type'], name: string): Asset {
  return {
    id: `${type}-${name}`,
    agentId: 'claude-code',
    category: type === 'skill' ? 'instruction' : 'capability',
    type,
    scope: 'session',
    name,
    path: summary.transcriptPath,
    meta: {}
  }
}

function mockSessionApis(): void {
  window.api.sessions.list = vi.fn(async () => ({ sessions: [summary], totalCount: 1 }))
  window.api.sessions.get = vi.fn(async () => ({
    summary,
    skillsUsed: [makeAsset('skill', 'frontend-design')],
    mcpServers: [makeAsset('mcp-server', 'plugin_playwright_playwright')],
    hooksFired: [{ event: 'Stop', count: 2 }],
    toolTimeline: [
      {
        id: 'tool-edit',
        callId: 'tool-edit',
        name: 'Edit',
        category: 'file',
        status: 'success',
        startedAt: '2026-05-30T01:02:00.000Z',
        endedAt: '2026-05-30T01:02:01.000Z',
        summary: 'D:\\Code\\berth\\src\\main.ts',
        filePaths: ['D:\\Code\\berth\\src\\main.ts']
      }
    ],
    artifacts: {
      plans: [],
      todos: [{ id: 'todo-1', title: 'Verify UI', done: false }],
      files: [{ id: 'file-main', path: 'D:\\Code\\berth\\src\\main.ts', operation: 'write', count: 1 }],
      checkpoints: [
        {
          id: 'checkpoint-1',
          title: 'File history checkpoint',
          timestamp: '2026-05-30T01:05:00.000Z',
          fileCount: 1
        }
      ]
    },
    plans: [],
    todos: [{ id: 'todo-1', title: 'Verify UI', done: false }],
    fileHistoryCount: 1
  }))
  window.api.usage.summary = vi.fn(async () => ({
    totalCost: 0,
    actualCost: 0,
    estimatedCost: 0,
    costDelta: 0,
    totalTokens: summary.tokenUsage.totalTokens,
    tokenUsage: summary.tokenUsage,
    costSource: 'unknown',
    pricingMisses: [],
    dailyCosts: [],
    dailyTokenUsage: [],
    byModel: [
      {
        model: summary.model,
        percentage: 100,
        cost: 0,
        actualCost: 0,
        estimatedCost: 0,
        costDelta: 0,
        costSource: 'unknown',
        pricingMisses: [],
        tokens: summary.tokenUsage.totalTokens,
        tokenUsage: summary.tokenUsage
      }
    ],
    byProject: [],
    rateLimits: []
  }))
  window.api.assets.healthCheck = vi.fn(async () => [])
}

describe('session pages', () => {
  it('renders overview recent sessions with readable path, tokens, and unknown cost', async () => {
    mockSessionApis()

    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    )

    expect(await screen.findByText('Fix session metadata')).toBeInTheDocument()
    expect(window.api.sessions.list).toHaveBeenCalledWith({ projectFilter: undefined, limit: 5, agentView: 'all' })
    expect(screen.getByText('D:\\Code\\berth')).toBeInTheDocument()
    expect(screen.getByText('38 tok')).toBeInTheDocument()
    expect(screen.getByText(/I 10 \/ O 5/)).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('renders sessions page without encoded project names or invalid date output', async () => {
    mockSessionApis()

    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>
    )

    expect(await screen.findByText('Fix session metadata')).toBeInTheDocument()
    expect(screen.getByText('D:\\Code\\berth')).toBeInTheDocument()
    expect(screen.queryByText('D--Code-berth')).not.toBeInTheDocument()
    expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument()
    expect(screen.getByText('5m')).toBeInTheDocument()
    expect(screen.getByText('38 tok')).toBeInTheDocument()
    expect(screen.getByText(/I 10 \/ O 5/)).toBeInTheDocument()
    expect(screen.getByText('claude-sonnet-4-20250514')).toBeInTheDocument()
  })

  it('renders session detail metadata and transcript-derived assets', async () => {
    mockSessionApis()

    render(
      <MemoryRouter initialEntries={['/sessions/session-session-abc']}>
        <Routes>
          <Route path="/sessions/:id" element={<SessionDetail />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('Fix session metadata')).toBeInTheDocument()
    expect(screen.getByText('D:\\Code\\berth')).toBeInTheDocument()
    expect(screen.getByText('claude-sonnet-4-20250514')).toBeInTheDocument()
    expect(screen.getByText('5m')).toBeInTheDocument()
    expect(screen.getByText('Input: 10')).toBeInTheDocument()
    expect(screen.getByText('Output: 5')).toBeInTheDocument()
    expect(screen.getByText('frontend-design')).toBeInTheDocument()
    expect(screen.getByText('plugin_playwright_playwright')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Verify UI')).toBeInTheDocument()
    expect(screen.getAllByText('D:\\Code\\berth\\src\\main.ts').length).toBeGreaterThan(0)
    expect(screen.getByText('Stop')).toBeInTheDocument()
    expect(screen.getByText('2x')).toBeInTheDocument()
  })

  it('renders usage token totals and model token counts', async () => {
    mockSessionApis()

    render(
      <MemoryRouter>
        <Usage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Input: 10')).toBeInTheDocument()
    expect(screen.getByText('Output: 5')).toBeInTheDocument()
    expect(screen.getByText('Cache: 23 (read 20 / write 3)')).toBeInTheDocument()
    expect(screen.getByText('Unknown cost')).toBeInTheDocument()
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument()
    expect(screen.getAllByText('38 tok').length).toBeGreaterThan(0)
    expect(screen.getByText('claude-sonnet-4-20250514')).toBeInTheDocument()
  })

  it('passes agent view to usage summary and renders unknown token remainder', async () => {
    act(() => {
      useAppStore.setState({ agentView: 'codex' })
    })
    const tokenUsage = normalizeTokenUsage({ inputTokens: 10, totalTokens: 15 })
    window.api.usage.summary = vi.fn(async () => ({
      totalCost: 0,
      actualCost: 0,
      estimatedCost: 0,
      costDelta: 0,
      totalTokens: tokenUsage.totalTokens,
      tokenUsage,
      costSource: 'unknown',
      pricingMisses: [],
      dailyCosts: [],
      dailyTokenUsage: [],
      byModel: [],
      byProject: [],
      rateLimits: []
    }))

    const { unmount } = render(
      <MemoryRouter>
        <Usage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Input: 10')).toBeInTheDocument()
    expect(screen.getByText('Unknown: 5')).toBeInTheDocument()
    expect(window.api.usage.summary).toHaveBeenCalledWith({
      days: 30,
      agentView: 'codex',
      costMode: 'auto'
    })
    unmount()
    act(() => {
      useAppStore.setState({ agentView: 'all' })
    })
  })

  it('passes selected cost mode to usage summary', async () => {
    mockSessionApis()

    render(
      <MemoryRouter>
        <Usage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Input: 10')).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Cost mode' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Auto' })).toHaveAttribute(
      'title',
      'Use provider actual cost when available, otherwise use the pricing catalog estimate.'
    )
    expect(screen.getByRole('radio', { name: 'Auto' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: 'Estimated' }))

    await waitFor(() => {
      expect(window.api.usage.summary).toHaveBeenLastCalledWith({
        days: 30,
        agentView: 'all',
        costMode: 'estimated'
      })
    })
  })

  it('shows a retryable error when usage summary fails to load', async () => {
    const tokenUsage = normalizeTokenUsage({ inputTokens: 4, outputTokens: 2 })
    window.api.usage.summary = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        totalCost: 0,
        actualCost: 0,
        estimatedCost: 0,
        costDelta: 0,
        totalTokens: tokenUsage.totalTokens,
        tokenUsage,
        costSource: 'unknown',
        pricingMisses: [],
        dailyCosts: [],
        dailyTokenUsage: [],
        byModel: [],
        byProject: [],
        rateLimits: []
      })

    render(
      <MemoryRouter>
        <Usage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Usage data could not be loaded')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Input: 4')).toBeInTheDocument()
    expect(window.api.usage.summary).toHaveBeenLastCalledWith({
      days: 30,
      agentView: 'all',
      costMode: 'auto'
    })
  })

  it('renders usage page when ipc returns legacy summary fields', async () => {
    const legacyTokenUsage = normalizeTokenUsage({ totalTokens: 15 })
    window.api.usage.summary = vi.fn(async () => ({
      totalCost: 0,
      totalTokens: legacyTokenUsage.totalTokens,
      dailyCosts: [],
      byModel: [
        {
          model: 'legacy-model',
          percentage: 100,
          cost: 0,
          tokens: legacyTokenUsage.totalTokens
        }
      ],
      byProject: [
        {
          project: 'legacy-project',
          percentage: 100,
          cost: 0,
          tokens: legacyTokenUsage.totalTokens
        }
      ],
      rateLimits: []
    } as unknown as UsageSummary))

    render(
      <MemoryRouter>
        <Usage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Unknown cost')).toBeInTheDocument()
    expect(screen.getByText('legacy-model')).toBeInTheDocument()
    expect(screen.getByText('legacy-project')).toBeInTheDocument()
    expect(screen.getAllByText('15 tok').length).toBeGreaterThan(0)
  })

  it('renders usage cost details and pricing gaps', async () => {
    const tokenUsage = normalizeTokenUsage({ inputTokens: 10, outputTokens: 2 })
    window.api.usage.summary = vi.fn(async () => ({
      totalCost: 0.3,
      actualCost: 0.3,
      estimatedCost: 0.26,
      costDelta: 0.04,
      costMode: 'auto',
      costExplanation: {
        formula: 'mixed',
        pricingSources: [{ source: 'local', count: 1 }],
        catalog: {
          generatedAt: '2026-05-30T14:51:53.037Z',
          sources: [
            {
              name: 'litellm',
              url: 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
              fetchedAt: '2026-05-30T14:51:53.151Z'
            }
          ]
        }
      },
      totalTokens: tokenUsage.totalTokens,
      tokenUsage,
      costSource: 'mixed',
      pricingMisses: [
        { model: 'missing-model', reason: 'missing-model-pricing', tokens: 12, count: 1 }
      ],
      dailyCosts: [{ date: '2026-05-30', cost: 0.3 }],
      dailyTokenUsage: [],
      byModel: [
        {
          model: 'test/priced-model',
          percentage: 100,
          cost: 0.3,
          actualCost: 0.3,
          estimatedCost: 0.26,
          costDelta: 0.04,
          costSource: 'actual',
          pricingMisses: [],
          tokens: tokenUsage.totalTokens,
          tokenUsage
        }
      ],
      byProject: [
        {
          project: 'D--Code-berth',
          percentage: 100,
          cost: 0.3,
          actualCost: 0.3,
          estimatedCost: 0.26,
          costDelta: 0.04,
          costSource: 'mixed',
          pricingMisses: [
            { model: 'missing-model', reason: 'missing-model-pricing', tokens: 12, count: 1 }
          ],
          tokens: tokenUsage.totalTokens,
          tokenUsage
        }
      ],
      rateLimits: []
    }))

    render(
      <MemoryRouter>
        <Usage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Pricing gaps')).toBeInTheDocument()
    expect(screen.getAllByText('Actual').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Estimated').length).toBeGreaterThan(0)
    expect(screen.getByText('Delta')).toBeInTheDocument()
    expect(screen.getByText('missing-model · 12 tok')).toBeInTheDocument()
    expect(screen.getAllByText('Mixed').length).toBeGreaterThan(0)
    expect(screen.getByText('Cost explanation')).toBeInTheDocument()
    expect(screen.getByText('Local override · 1 model match(es)')).toBeInTheDocument()
    expect(screen.getByText(/LiteLLM/)).toBeInTheDocument()
    expect(screen.getByText('Local override example')).toBeInTheDocument()
    expect(screen.getByText(/inputCostPerToken/)).toBeInTheDocument()
  })
})
