import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../src/renderer/src/i18n'
import { Teams, TEAMS_RECENT_ACTIVITY_MS } from '../../src/renderer/src/pages/teams'
import { PageChromeProvider } from '../../src/renderer/src/components/layout/page-chrome'
import { navSections } from '../../src/renderer/src/components/layout/nav-config'
import type { AgentTeamSummary } from '@shared/types/ipc'

function SessionDetailProbe(): React.ReactElement {
  return <div data-testid="session-detail" />
}

function renderTeams(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/teams']}>
      <PageChromeProvider>
        <Routes>
          <Route path="/teams" element={<Teams />} />
          <Route path="/sessions/:id" element={<SessionDetailProbe />} />
        </Routes>
      </PageChromeProvider>
    </MemoryRouter>
  )
}

function team(overrides: Partial<AgentTeamSummary>): AgentTeamSummary {
  return {
    name: 'review-squad',
    description: 'parallel code review',
    dirPath: '/home/user/.claude/teams/review-squad',
    createdAt: Date.now() - 86_400_000,
    lastActivityAt: Date.now() - 86_400_000,
    leadAgentId: 'team-lead@review-squad',
    leadSessionId: 'aaaa1111-2222-3333-4444-555566667777',
    leadSessionAvailable: false,
    members: [
      {
        name: 'team-lead',
        agentId: 'team-lead@review-squad',
        agentType: 'team-lead',
        model: 'claude-opus-4-6'
      },
      {
        name: 'sec',
        agentId: 'sec@review-squad',
        agentType: 'general-purpose',
        model: 'claude-sonnet-4-6',
        backend: 'in-process',
        prompt: 'Review the security of the auth module very carefully.'
      }
    ],
    tasks: [
      { id: '1', subject: 'scan auth module', status: 'completed', blockedBy: [] },
      { id: '2', subject: 'write report', status: 'pending', owner: 'sec', blockedBy: ['1'] }
    ],
    inboxMessageCount: 3,
    lastInboxMessageAt: Date.now() - 86_400_000,
    ...overrides
  }
}

beforeEach(() => {
  window.api.teams.list = vi.fn().mockResolvedValue({ teams: [] })
})

describe('Teams page states', () => {
  it('shows the loading state while the first request is pending', () => {
    window.api.teams.list = vi.fn(() => new Promise(() => {}))
    renderTeams()
    expect(screen.getByText('Loading team records')).toBeInTheDocument()
  })

  it('shows an empty state explaining the feature, how to enable it, and Codex inapplicability', async () => {
    renderTeams()
    await waitFor(() => {
      expect(screen.getByText('No team records found')).toBeInTheDocument()
    })
    expect(screen.getByText(/not applicable to Codex/)).toBeInTheDocument()
    expect(screen.getByText(/CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS/)).toBeInTheDocument()
    expect(screen.getByText(/v2\.1\.32/)).toBeInTheDocument()
  })

  it('shows a retryable error state when the request fails', async () => {
    window.api.teams.list = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ teams: [] })
    renderTeams()
    await waitFor(() => {
      expect(screen.getByText('Failed to load team records')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Retry|重试/ }))
    await waitFor(() => {
      expect(screen.getByText('No team records found')).toBeInTheDocument()
    })
    expect(window.api.teams.list).toHaveBeenCalledTimes(2)
  })

  it('renders team records with member and description summary', async () => {
    window.api.teams.list = vi.fn().mockResolvedValue({ teams: [team({})] })
    renderTeams()
    await waitFor(() => {
      expect(screen.getByText('review-squad')).toBeInTheDocument()
    })
    expect(screen.getByText('parallel code review')).toBeInTheDocument()
    expect(screen.getByText('2 members')).toBeInTheDocument()
  })
})

describe('Teams card detail', () => {
  it('expands to members, tasks, prompt toggle and dir path', async () => {
    window.api.teams.list = vi.fn().mockResolvedValue({ teams: [team({})] })
    renderTeams()
    await waitFor(() => expect(screen.getByText('review-squad')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /review-squad/ }))

    await waitFor(() => expect(screen.getByText('Members')).toBeInTheDocument())
    expect(screen.getByText('sec')).toBeInTheDocument()
    expect(screen.getByText('Lead')).toBeInTheDocument()
    expect(screen.getByText('in-process')).toBeInTheDocument()
    expect(screen.getByText('scan auth module')).toBeInTheDocument()
    expect(screen.getByText(/blocked by 1/)).toBeInTheDocument()
    expect(screen.getByText('/home/user/.claude/teams/review-squad')).toBeInTheDocument()

    const promptToggle = screen.getByRole('button', { name: 'Show prompt' })
    expect(promptToggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(promptToggle)
    expect(screen.getByRole('button', { name: 'Hide prompt' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows a note instead of an empty table when no task files remain', async () => {
    window.api.teams.list = vi.fn().mockResolvedValue({ teams: [team({ tasks: [] })] })
    renderTeams()
    await waitFor(() => expect(screen.getByText('review-squad')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /review-squad/ }))
    await waitFor(() => {
      expect(screen.getByText(/No task files remain/)).toBeInTheDocument()
    })
  })

  it('marks teams as recently active only within the threshold', async () => {
    window.api.teams.list = vi.fn().mockResolvedValue({
      teams: [
        team({ name: 'fresh', dirPath: '/t/fresh', lastActivityAt: Date.now() - TEAMS_RECENT_ACTIVITY_MS / 2 }),
        team({ name: 'stale', dirPath: '/t/stale', lastActivityAt: Date.now() - TEAMS_RECENT_ACTIVITY_MS * 10 })
      ]
    })
    renderTeams()
    await waitFor(() => expect(screen.getByText('fresh')).toBeInTheDocument())
    expect(screen.getAllByText('Active recently')).toHaveLength(1)
  })

  it('renders the lead session jump only when the transcript is available', async () => {
    window.api.teams.list = vi.fn().mockResolvedValue({
      teams: [
        team({ name: 'alpha-squad', dirPath: '/t/alpha', leadSessionAvailable: true }),
        team({ name: 'beta-squad', dirPath: '/t/beta', leadSessionAvailable: false })
      ]
    })
    renderTeams()
    await waitFor(() => expect(screen.getByText('alpha-squad')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /alpha-squad/ }))
    fireEvent.click(screen.getByRole('button', { name: /beta-squad/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Open lead session/ })).toBeInTheDocument()
    })
    expect(screen.getByText(/Lead session transcript is not in the current scan/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Open lead session/ }))
    await waitFor(() => {
      expect(screen.getByTestId('session-detail')).toBeInTheDocument()
    })
  })
})

describe('Teams navigation', () => {
  it('registers Agent Teams in the work nav section with the legacy path', () => {
    const work = navSections.find((section) => section.id === 'work')!
    const teamsItem = work.items.find((item) => item.id === 'teams')!
    expect(teamsItem.path).toBe('/teams')
    expect(teamsItem.labelKey).toBe('nav.teams')
    expect(teamsItem.legacyPaths).toContain('/instructions/agent-teams')
  })
})
