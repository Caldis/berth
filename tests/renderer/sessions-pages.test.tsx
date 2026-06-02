import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import i18n from '../../src/renderer/src/i18n'
import { Overview } from '../../src/renderer/src/pages/overview'
import { Sessions } from '../../src/renderer/src/pages/sessions'
import { SessionDetail } from '../../src/renderer/src/pages/session-detail'
import { Usage } from '../../src/renderer/src/pages/usage'
import type { Asset, SessionSummary, UsageSummary } from '../../src/shared/types/asset'
import type { SessionActivityMetrics } from '../../src/shared/types/ipc'
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

const modelInfo = {
  provider: 'Anthropic',
  providerSource: 'model-id' as const,
  releaseDate: '2025-05-14',
  releaseDateSource: 'model-id' as const,
  knowledgeCutoff: null,
  pricing: {
    matchedModel: 'claude-sonnet-4-20250514',
    matchedProvider: 'anthropic',
    inputCostPerMillion: 3,
    outputCostPerMillion: 15,
    cacheReadInputCostPerMillion: 0.3,
    cacheCreationInputCostPerMillion: 3.75,
    contextWindow: 200000,
    maxOutputTokens: 64000,
    source: 'models.dev' as const,
    sourceUrl: 'https://models.dev/api.json',
    updatedAt: '2026-05-30T14:51:53.037Z'
  }
}

const activityMetrics: SessionActivityMetrics = {
  tokenRatePerMinute: 19,
  tokenRateDurationSeconds: 120,
  tokenRateSource: 'usage-events',
  tokenRateStartedAt: '2026-05-30T01:02:00.000Z',
  tokenRateEndedAt: '2026-05-30T01:04:00.000Z'
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

function mockSessionApis(session: SessionSummary = summary): void {
  window.api.sessions.list = vi.fn(async () => ({ sessions: [session], totalCount: 1 }))
  window.api.sessions.get = vi.fn(async () => ({
    summary: session,
    modelInfo,
    activityMetrics,
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
      },
      {
        id: 'tool-bash',
        callId: 'tool-bash',
        name: 'Bash',
        category: 'builtin',
        status: 'error',
        startedAt: '2026-05-30T01:03:00.000Z',
        endedAt: '2026-05-30T01:03:02.000Z',
        summary: 'pnpm test',
        filePaths: []
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
    totalTokens: session.tokenUsage.totalTokens,
    tokenUsage: session.tokenUsage,
    costSource: 'unknown',
    pricingMisses: [],
    dailyCosts: [],
    dailyTokenUsage: [],
    byModel: [
      {
        model: session.model,
        percentage: 100,
        cost: 0,
        actualCost: 0,
        estimatedCost: 0,
        costDelta: 0,
        costSource: 'unknown',
        pricingMisses: [],
        tokens: session.tokenUsage.totalTokens,
        tokenUsage: session.tokenUsage
      }
    ],
    byProject: [],
    rateLimits: []
  }))
  window.api.assets.healthCheck = vi.fn(async () => [])
}

function selectSessionDetailTab(label: RegExp): void {
  const tab = screen.getByRole('tab', { name: label })
  fireEvent.mouseDown(tab)
  fireEvent.click(tab)
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
    expect(screen.getAllByText('D:\\Code\\berth').length).toBeGreaterThan(0)
    expect(screen.getByText('38 tok')).toBeInTheDocument()
    expect(screen.getByText(/I 10 \/ O 5/)).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('passes selected project scope to overview sessions and usage summaries', async () => {
    mockSessionApis()
    act(() => {
      useAppStore.setState({
        scopeSelection: {
          mode: 'project',
          projectPath: 'D:/Code/berth',
          projectPathKey: 'd:/code/berth'
        }
      })
    })

    const view = render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    )

    try {
      expect(await screen.findByText('Fix session metadata')).toBeInTheDocument()
      expect(window.api.sessions.list).toHaveBeenCalledWith({
        projectFilter: undefined,
        limit: 5,
        agentView: 'all',
        projectPath: 'D:/Code/berth'
      })
      expect(window.api.usage.summary).toHaveBeenCalledWith({
        days: 7,
        agentView: 'all',
        projectPath: 'D:/Code/berth'
      })
    } finally {
      view.unmount()
      act(() => {
        useAppStore.setState({ scopeSelection: { mode: 'global' } })
      })
    }
  })

  it('renders sessions page without encoded project names or invalid date output', async () => {
    mockSessionApis()

    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>
    )

    expect(screen.getByText('Local conversation history')).toBeInTheDocument()
    expect(await screen.findByText('Fix session metadata')).toBeInTheDocument()
    expect(screen.getAllByText('D:\\Code\\berth').length).toBeGreaterThan(0)
    expect(screen.queryByText('D--Code-berth')).not.toBeInTheDocument()
    expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument()
    expect(screen.getByText('5m')).toBeInTheDocument()
    expect(screen.getByText('38 tok')).toBeInTheDocument()
    expect(screen.getByText(/I 10 \/ O 5/)).toBeInTheDocument()
    expect(screen.getAllByText('claude-sonnet-4-20250514').length).toBeGreaterThan(0)
  })

  it('passes selected project scope to the sessions list', async () => {
    mockSessionApis()
    act(() => {
      useAppStore.setState({
        scopeSelection: {
          mode: 'project',
          projectPath: 'D:/Code/berth',
          projectPathKey: 'd:/code/berth'
        }
      })
    })

    const view = render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>
    )

    try {
      expect(await screen.findByText('Fix session metadata')).toBeInTheDocument()
      expect(window.api.sessions.list).toHaveBeenCalledWith({
        projectFilter: undefined,
        limit: undefined,
        agentView: 'all',
        projectPath: 'D:/Code/berth'
      })
    } finally {
      view.unmount()
      act(() => {
        useAppStore.setState({ scopeSelection: { mode: 'global' } })
      })
    }
  })

  it('localizes fallback titles for untitled sessions', async () => {
    const untitledSummary: SessionSummary = { ...summary, title: '' }
    mockSessionApis(untitledSummary)
    await i18n.changeLanguage('zh')

    try {
      const overview = render(
        <MemoryRouter>
          <Overview />
        </MemoryRouter>
      )

      expect(await screen.findByText('会话 #session-')).toBeInTheDocument()
      expect(screen.queryByText('Session #session-')).not.toBeInTheDocument()
      overview.unmount()

      const sessions = render(
        <MemoryRouter>
          <Sessions />
        </MemoryRouter>
      )

      expect(await screen.findByText('会话 #session-')).toBeInTheDocument()
      expect(screen.queryByText('Session #session-')).not.toBeInTheDocument()
      sessions.unmount()

      const detail = render(
        <MemoryRouter initialEntries={['/sessions/session-session-abc']}>
          <Routes>
            <Route path="/sessions/:id" element={<SessionDetail />} />
          </Routes>
        </MemoryRouter>
      )

      expect(await screen.findByText('会话 / 会话 #session-')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '会话 #session-' })).toBeInTheDocument()
      expect(screen.queryByText('Session #session-')).not.toBeInTheDocument()
      detail.unmount()
    } finally {
      await i18n.changeLanguage('en')
    }
  })

  it('shows sessions guidance and an instructive empty state when no sessions are found', async () => {
    window.api.sessions.list = vi.fn(async () => ({ sessions: [], totalCount: 0 }))

    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>
    )

    expect(await screen.findByText('Local conversation history')).toBeInTheDocument()
    expect(await screen.findByText('No sessions found')).toBeInTheDocument()
    expect(screen.getByText(/Berth scans local Claude Code and Codex session history/)).toBeInTheDocument()
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
    expect(screen.getAllByText('D:\\Code\\berth').length).toBeGreaterThan(0)
    expect(screen.getAllByText('claude-sonnet-4-20250514').length).toBeGreaterThan(0)
    expect(screen.getByText(/2026-05-30/)).toBeInTheDocument()
    expect(screen.getByText('Provider')).toBeInTheDocument()
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
    expect(screen.getByText(/Cache tokens come from transcript usage fields/)).toBeInTheDocument()
    expect(screen.getByText('5m')).toBeInTheDocument()
    expect(screen.queryByText('Input: 10')).not.toBeInTheDocument()
    expect(screen.queryByText('Output: 5')).not.toBeInTheDocument()
    expect(screen.getByText('Input 10')).toBeInTheDocument()
    expect(screen.getByText('Output 5')).toBeInTheDocument()
    expect(screen.getByText('Session signals')).toBeInTheDocument()
    expect(screen.getByText('Avg tool time')).toBeInTheDocument()
    expect(screen.getByText('1.5s')).toBeInTheDocument()
    expect(screen.getByText('Slowest tool')).toBeInTheDocument()
    expect(screen.getAllByText('Bash').length).toBeGreaterThan(0)
    expect(screen.getByText('Failed tools')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('Token rate')).toBeInTheDocument()
    expect(screen.getByText('19 tok/min')).toBeInTheDocument()
    expect(screen.getByText('Usage events')).toBeInTheDocument()
    expect(screen.getByText('Cache read share')).toBeInTheDocument()
    expect(screen.getByText('60.6%')).toBeInTheDocument()
    expect(screen.getByText('frontend-design')).toBeInTheDocument()
    expect(screen.getByText('plugin_playwright_playwright')).toBeInTheDocument()
    expect(screen.getByText('Stop')).toBeInTheDocument()
    expect(screen.getByText('2x')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Overview/ })).toHaveAttribute('data-state', 'active')
    expect(screen.getByRole('tab', { name: /Timeline/ })).toHaveTextContent('2')
    expect(screen.getByRole('tab', { name: /Artifacts/ })).toHaveTextContent('3')
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Verify UI')).not.toBeInTheDocument()

    selectSessionDetailTab(/Timeline/)
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getAllByText('2s').length).toBeGreaterThan(0)

    selectSessionDetailTab(/Artifacts/)
    expect(screen.getByText('Verify UI')).toBeInTheDocument()
    expect(screen.getAllByText('D:\\Code\\berth\\src\\main.ts').length).toBeGreaterThan(0)
  })

  it('filters session detail tools by minimum duration', async () => {
    mockSessionApis()

    render(
      <MemoryRouter initialEntries={['/sessions/session-session-abc']}>
        <Routes>
          <Route path="/sessions/:id" element={<SessionDetail />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('Fix session metadata')).toBeInTheDocument()
    selectSessionDetailTab(/Timeline/)
    expect(screen.getByText('Edit')).toBeInTheDocument()
    const timelineTab = screen.getByTestId('session-timeline-tab')
    expect(timelineTab).not.toHaveClass('rounded-xl')
    expect(timelineTab).not.toHaveClass('border')
    expect(timelineTab).not.toHaveClass('bg-card')
    expect(screen.getByTestId('tool-timeline-scroll')).toHaveClass('overflow-x-hidden')

    fireEvent.click(screen.getByRole('button', { name: /Failed/ }))
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.getAllByText('Bash').length).toBeGreaterThan(0)
    expect(screen.getByText('Showing 1 of 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /All/ }))
    expect(screen.getByText('Edit')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Minimum tool duration'), {
      target: { value: '1500' }
    })

    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.getAllByText('Bash').length).toBeGreaterThan(0)
    expect(screen.getByText('Showing 1 of 2')).toBeInTheDocument()
  })

  it('summarizes empty checkpoints and explains long-running built-in tools', async () => {
    mockSessionApis()
    window.api.sessions.get = vi.fn(async () => ({
      summary,
      activityMetrics,
      skillsUsed: [],
      mcpServers: [],
      hooksFired: [],
      toolTimeline: [
        {
          id: 'tool-agent',
          callId: 'tool-agent',
          name: 'Agent',
          category: 'builtin',
          status: 'success',
          startedAt: '2026-05-30T01:01:00.000Z',
          endedAt: '2026-05-30T01:03:00.000Z',
          summary: 'Explore session data',
          filePaths: []
        },
        {
          id: 'tool-question',
          callId: 'tool-question',
          name: 'AskUserQuestion',
          category: 'builtin',
          status: 'success',
          startedAt: '2026-05-30T01:03:00.000Z',
          endedAt: '2026-05-30T01:08:00.000Z',
          summary: 'Choose implementation scope',
          filePaths: []
        }
      ],
      artifacts: {
        plans: [],
        todos: [],
        files: [],
        checkpoints: Array.from({ length: 3 }, (_, index) => ({
          id: `checkpoint-${index}`,
          title: 'File history checkpoint',
          timestamp: '2026-05-30T01:05:00.000Z',
          fileCount: 0
        }))
      },
      plans: [],
      todos: [],
      fileHistoryCount: 3
    }))

    render(
      <MemoryRouter initialEntries={['/sessions/session-session-abc']}>
        <Routes>
          <Route path="/sessions/:id" element={<SessionDetail />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('Fix session metadata')).toBeInTheDocument()
    selectSessionDetailTab(/Artifacts/)
    expect(screen.getByText('3 checkpoints recorded')).toBeInTheDocument()
    expect(screen.getByText(/Checkpoints are file-history snapshots/)).toBeInTheDocument()
    expect(screen.getByText('Missing details')).toBeInTheDocument()
    expect(screen.queryByText('File history checkpoint')).not.toBeInTheDocument()

    selectSessionDetailTab(/Timeline/)
    expect(screen.getByText(/Runs a subagent in a separate context/)).toBeInTheDocument()
    expect(screen.getByText(/waits for your answer/)).toBeInTheDocument()
  })

  it('uses explanatory section empty states in session detail', async () => {
    window.api.sessions.get = vi.fn(async () => ({
      summary,
      activityMetrics: {
        tokenRatePerMinute: null,
        tokenRateDurationSeconds: 0,
        tokenRateSource: 'unavailable',
        tokenRateStartedAt: '2026-05-30T01:02:00.000Z',
        tokenRateEndedAt: '2026-05-30T01:02:00.000Z'
      },
      skillsUsed: [],
      mcpServers: [],
      hooksFired: [],
      toolTimeline: [],
      artifacts: {
        plans: [],
        todos: [],
        files: [],
        checkpoints: []
      },
      plans: [],
      todos: [],
      fileHistoryCount: 0
    }))

    render(
      <MemoryRouter initialEntries={['/sessions/session-session-abc']}>
        <Routes>
          <Route path="/sessions/:id" element={<SessionDetail />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('No skills were loaded')).toBeInTheDocument()
    expect(screen.getByText('Token rate')).toBeInTheDocument()
    expect(screen.getByText('Not enough timing data')).toBeInTheDocument()
    expect(screen.queryByText('7.6 tok/min')).not.toBeInTheDocument()
    selectSessionDetailTab(/Timeline/)
    expect(screen.getByText('No tool events recorded')).toBeInTheDocument()
    selectSessionDetailTab(/Artifacts/)
    expect(screen.getByText('No artifacts recorded')).toBeInTheDocument()
    expect(screen.queryAllByText('Nothing here yet')).toHaveLength(0)
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
    expect(screen.getByText('Cost source')).toBeInTheDocument()
    expect(screen.getByText('Local scan data')).toBeInTheDocument()
    expect(screen.queryByText('Rate Limits')).not.toBeInTheDocument()
    expect(screen.queryByText('Experimental Flags')).not.toBeInTheDocument()
  })

  it('passes selected project scope to usage summary', async () => {
    mockSessionApis()
    act(() => {
      useAppStore.setState({
        scopeSelection: {
          mode: 'project',
          projectPath: 'D:/Code/berth',
          projectPathKey: 'd:/code/berth'
        }
      })
    })

    const view = render(
      <MemoryRouter>
        <Usage />
      </MemoryRouter>
    )

    try {
      expect(await screen.findByText('Input: 10')).toBeInTheDocument()
      expect(window.api.usage.summary).toHaveBeenCalledWith({
        days: 0,
        agentView: 'all',
        costMode: 'auto',
        projectPath: 'D:/Code/berth'
      })
    } finally {
      view.unmount()
      act(() => {
        useAppStore.setState({ scopeSelection: { mode: 'global' } })
      })
    }
  })

  it('shows usage placeholders while the first summary request is loading', () => {
    window.api.usage.summary = vi.fn(() => new Promise<UsageSummary>(() => undefined))

    render(
      <MemoryRouter>
        <Usage />
      </MemoryRouter>
    )

    expect(screen.getByLabelText('Loading usage summary')).toBeInTheDocument()
    expect(screen.queryByText('0 tok')).not.toBeInTheDocument()
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
      days: 0,
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
    expect(screen.queryByRole('radiogroup', { name: 'Cost mode' })).not.toBeInTheDocument()
    const costModeSelect = screen.getByRole('combobox', { name: 'Cost mode' })
    expect(costModeSelect).toHaveValue('auto')
    expect(
      screen.getByText('Use provider actual cost when available, otherwise use the pricing catalog estimate.')
    ).toBeInTheDocument()
    fireEvent.change(costModeSelect, { target: { value: 'estimated' } })

    await waitFor(() => {
      expect(window.api.usage.summary).toHaveBeenLastCalledWith({
        days: 0,
        agentView: 'all',
        costMode: 'estimated'
      })
    })
  })

  it('uses all-time usage by default and preserves explicit rolling ranges', async () => {
    mockSessionApis()

    render(
      <MemoryRouter>
        <Usage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Input: 10')).toBeInTheDocument()
    expect(window.api.usage.summary).toHaveBeenCalledWith({
      days: 0,
      agentView: 'all',
      costMode: 'auto'
    })

    fireEvent.click(screen.getByRole('button', { name: 'Last 30 days' }))

    await waitFor(() => {
      expect(window.api.usage.summary).toHaveBeenLastCalledWith({
        days: 30,
        agentView: 'all',
        costMode: 'auto'
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'All time' }))

    await waitFor(() => {
      expect(window.api.usage.summary).toHaveBeenLastCalledWith({
        days: 0,
        agentView: 'all',
        costMode: 'auto'
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
      days: 0,
      agentView: 'all',
      costMode: 'auto'
    })
  })

  it('keeps previous usage visible when a refresh fails', async () => {
    const tokenUsage = normalizeTokenUsage({ inputTokens: 4, outputTokens: 2 })
    window.api.usage.summary = vi
      .fn()
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
      .mockRejectedValueOnce(new Error('boom'))

    render(
      <MemoryRouter>
        <Usage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Input: 4')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Cost mode' }), {
      target: { value: 'estimated' }
    })

    expect(await screen.findByText('Usage data could not be loaded')).toBeInTheDocument()
    expect(
      screen.getByText('Showing the last loaded usage data because refresh failed.')
    ).toBeInTheDocument()
    expect(screen.getByText('Input: 4')).toBeInTheDocument()
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
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    })
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
    const byModel = screen.getByRole('region', { name: 'By Model' })
    expect(within(byModel).getByText('test/priced-model')).toBeInTheDocument()
    expect(within(byModel).getByText('$0.30')).toBeInTheDocument()
    expect(within(byModel).getAllByText('Actual').length).toBeGreaterThan(0)
    expect(within(byModel).getByText('12 tok')).toBeInTheDocument()
    expect(screen.getAllByText('Actual').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Estimated').length).toBeGreaterThan(0)
    expect(screen.getByText('Delta')).toBeInTheDocument()
    expect(screen.getByText('missing-model · 12 tok')).toBeInTheDocument()
    expect(screen.getAllByText('Mixed').length).toBeGreaterThan(0)
    expect(
      screen.getAllByLabelText(
        'Mixed: Combines provider-reported costs where available with catalog estimates for the rest.'
      ).length
    ).toBeGreaterThan(0)
    expect(screen.getByText('Cost source')).toBeInTheDocument()
    expect(screen.getByText('Cost mode')).toBeInTheDocument()
    expect(
      screen.getByText('Local scan data and catalog estimates may differ from provider billing.')
    ).toBeInTheDocument()
    expect(screen.getByText('Local override · 1 model match(es)')).toBeInTheDocument()
    expect(screen.getByText(/LiteLLM/)).toBeInTheDocument()
    expect(screen.getByText('Local override example')).toBeInTheDocument()
    expect(screen.queryByText(/inputCostPerToken/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show local override example' }))

    expect(screen.getByText(/inputCostPerToken/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Copy override JSON' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('inputCostPerToken'))
    })
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })
})
