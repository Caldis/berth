import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  listAgentTeams,
  markLeadSessionAvailability
} from '../../src/main/agent-teams'
import type { AgentTeamSummary } from '@shared/types/ipc'
import { setMainLogWriter } from '@berth/scan-engine/log'
import { resetDomainFailureLogForTests } from '../../src/main/domain-log'

let tempHome: string | null = null

function makeHome(): string {
  tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-agent-teams-'))
  return tempHome
}

function writeTeam(
  home: string,
  name: string,
  config: Record<string, unknown> | string | null,
  opts: { inboxes?: Record<string, unknown>; tasks?: Record<string, unknown | string> } = {}
): string {
  const teamDir = path.join(home, '.claude', 'teams', name)
  fs.mkdirSync(teamDir, { recursive: true })
  if (config != null) {
    const body = typeof config === 'string' ? config : JSON.stringify(config)
    fs.writeFileSync(path.join(teamDir, 'config.json'), body)
  }
  if (opts.inboxes) {
    const inboxDir = path.join(teamDir, 'inboxes')
    fs.mkdirSync(inboxDir, { recursive: true })
    for (const [member, messages] of Object.entries(opts.inboxes)) {
      fs.writeFileSync(path.join(inboxDir, `${member}.json`), JSON.stringify(messages))
    }
  }
  if (opts.tasks) {
    const taskDir = path.join(home, '.claude', 'tasks', name)
    fs.mkdirSync(taskDir, { recursive: true })
    for (const [file, task] of Object.entries(opts.tasks)) {
      const body = typeof task === 'string' ? task : JSON.stringify(task)
      fs.writeFileSync(path.join(taskDir, file), body)
    }
  }
  return teamDir
}

const BASE_CONFIG = {
  name: 'review-squad',
  description: 'parallel code review',
  createdAt: 1765000000000,
  leadAgentId: 'team-lead@review-squad',
  leadSessionId: 'aaaa1111-2222-3333-4444-555566667777',
  members: [
    {
      agentId: 'team-lead@review-squad',
      name: 'team-lead',
      agentType: 'team-lead',
      model: 'claude-opus-4-6',
      joinedAt: 1765000000000,
      tmuxPaneId: '',
      cwd: '/work',
      subscriptions: []
    },
    {
      agentId: 'sec@review-squad',
      name: 'sec',
      agentType: 'general-purpose',
      model: 'claude-sonnet-4-6',
      prompt: 'Review security.',
      color: 'blue',
      joinedAt: 1765000001000,
      tmuxPaneId: 'in-process',
      cwd: '/work',
      subscriptions: [],
      backendType: 'in-process'
    },
    {
      agentId: 'perf@review-squad',
      name: 'perf',
      agentType: 'general-purpose',
      model: 'claude-sonnet-4-6',
      prompt: 'Review performance.',
      joinedAt: 1765000002000,
      tmuxPaneId: '%12',
      cwd: '/work',
      subscriptions: []
    }
  ]
}

afterEach(() => {
  if (tempHome) {
    fs.rmSync(tempHome, { recursive: true, force: true })
    tempHome = null
  }
})

describe('listAgentTeams', () => {
  it('aggregates teams across multiple claude dirs (BERTH_EXTRA_CLAUDE_DIRS 契约, GH-115 T10b)', () => {
    const homeA = makeHome()
    const homeB = makeHome()
    writeTeam(homeA, 'team-a', { ...BASE_CONFIG, name: 'team-a' })
    writeTeam(homeB, 'team-b', { ...BASE_CONFIG, name: 'team-b' })

    const teams = listAgentTeams([path.join(homeA, '.claude'), path.join(homeB, '.claude')])

    expect(teams.map((t) => t.name).sort()).toEqual(['team-a', 'team-b'])
  })

  it('maps config fields, normalizes member backend, lead has none', () => {
    const home = makeHome()
    writeTeam(home, 'review-squad', BASE_CONFIG)
    const teams = listAgentTeams([path.join(home, '.claude')])
    expect(teams).toHaveLength(1)
    const team = teams[0]
    expect(team.name).toBe('review-squad')
    expect(team.description).toBe('parallel code review')
    expect(team.createdAt).toBe(1765000000000)
    expect(team.leadAgentId).toBe('team-lead@review-squad')
    expect(team.leadSessionId).toBe('aaaa1111-2222-3333-4444-555566667777')
    expect(team.leadSessionAvailable).toBe(false)
    expect(team.members.map((m) => m.backend)).toEqual([undefined, 'in-process', 'tmux'])
    expect(team.members[1]).toMatchObject({
      name: 'sec',
      agentType: 'general-purpose',
      model: 'claude-sonnet-4-6',
      prompt: 'Review security.',
      color: 'blue'
    })
    expect(team.dirPath).toContain(path.join('.claude', 'teams', 'review-squad'))
  })

  it('skips dirs without config.json and dirs with broken JSON', () => {
    const home = makeHome()
    writeTeam(home, 'good', { ...BASE_CONFIG, name: 'good' })
    writeTeam(home, 'inbox-only', null, { inboxes: { lead: [] } })
    writeTeam(home, 'broken', '{ not json')
    const teams = listAgentTeams([path.join(home, '.claude')])
    expect(teams.map((t) => t.name)).toEqual(['good'])
  })

  it('returns [] when the teams root does not exist', () => {
    const home = makeHome()
    expect(listAgentTeams([path.join(home, '.claude')])).toEqual([])
  })

  it('accounts corrupt team files in the log once, absence stays silent (GH-152 T4)', () => {
    // A corrupt config made the whole team vanish with zero trace — rule 8: the
    // tolerance (skip) stays, but userData/logs must show WHY.
    const lines: string[] = []
    resetDomainFailureLogForTests()
    setMainLogWriter({
      log: (scope, err) => lines.push(`${scope} ${String(err)}`),
      error: (scope, err) => lines.push(`${scope} ${String(err)}`),
      warning: () => {},
      info: () => {},
      verbose: () => {}
    })
    try {
      const home = makeHome()
      writeTeam(home, 'broken', '{ not json')

      listAgentTeams([path.join(home, '.claude')])
      listAgentTeams([path.join(home, '.claude')]) // re-list: deduped, no spam

      const configLines = lines.filter((l) => l.includes('config.json'))
      expect(configLines).toHaveLength(1)
      expect(configLines[0]).toContain('agent-teams')

      // Absent teams root (source simply not present) logs nothing.
      lines.length = 0
      const emptyHome = makeHome()
      listAgentTeams([path.join(emptyHome, '.claude')])
      expect(lines).toEqual([])
    } finally {
      setMainLogWriter({ log: () => {}, error: () => {}, warning: () => {}, info: () => {}, verbose: () => {} })
      resetDomainFailureLogForTests()
    }
  })

  it('parses tasks, tolerates unknown statuses, ignores non-task files, missing dir → []', () => {
    const home = makeHome()
    writeTeam(home, 'review-squad', BASE_CONFIG, {
      tasks: {
        '1.json': { id: '1', subject: 'scan', status: 'completed', blocks: [], blockedBy: [] },
        '2.json': {
          id: '2',
          subject: 'fix',
          description: 'fix it',
          status: 'weird-status',
          owner: 'sec',
          blockedBy: ['1']
        },
        '3.json': '{ broken',
        '.lock': 'x',
        '.highwatermark': '3'
      }
    })
    writeTeam(home, 'taskless', { ...BASE_CONFIG, name: 'taskless' })
    const teams = listAgentTeams([path.join(home, '.claude')])
    const squad = teams.find((t) => t.name === 'review-squad')!
    expect(squad.tasks.map((t) => t.id)).toEqual(['1', '2'])
    expect(squad.tasks[0].status).toBe('completed')
    expect(squad.tasks[1]).toMatchObject({ status: 'unknown', owner: 'sec', blockedBy: ['1'] })
    const taskless = teams.find((t) => t.name === 'taskless')!
    expect(taskless.tasks).toEqual([])
  })

  it('counts inbox messages and tracks the latest timestamp, tolerating bad files', () => {
    const home = makeHome()
    writeTeam(home, 'review-squad', BASE_CONFIG, {
      inboxes: {
        sec: [
          { from: 'team-lead', text: 'go', timestamp: '2026-06-01T00:00:00.000Z', type: 'message', read: true },
          { from: 'sec', text: 'done', timestamp: '2026-06-02T00:00:00.000Z', type: 'message', read: false }
        ],
        perf: [
          { from: 'team-lead', text: 'go', timestamp: '2026-06-03T00:00:00.000Z', type: 'message', read: true }
        ]
      }
    })
    const broken = writeTeam(home, 'broken-inbox', { ...BASE_CONFIG, name: 'broken-inbox' })
    fs.mkdirSync(path.join(broken, 'inboxes'), { recursive: true })
    fs.writeFileSync(path.join(broken, 'inboxes', 'x.json'), '{ nope')

    const teams = listAgentTeams([path.join(home, '.claude')])
    const squad = teams.find((t) => t.name === 'review-squad')!
    expect(squad.inboxMessageCount).toBe(3)
    expect(squad.lastInboxMessageAt).toBe(Date.parse('2026-06-03T00:00:00.000Z'))
    const brokenTeam = teams.find((t) => t.name === 'broken-inbox')!
    expect(brokenTeam.inboxMessageCount).toBe(0)
    expect(brokenTeam.lastInboxMessageAt).toBeNull()
  })

  it('computes lastActivityAt as the max file mtime and sorts descending, null last', () => {
    const home = makeHome()
    const oldDir = writeTeam(home, 'old-team', { ...BASE_CONFIG, name: 'old-team' })
    const newDir = writeTeam(home, 'new-team', { ...BASE_CONFIG, name: 'new-team' })
    const oldTime = new Date('2026-01-01T00:00:00Z')
    const newTime = new Date('2026-06-09T00:00:00Z')
    fs.utimesSync(path.join(oldDir, 'config.json'), oldTime, oldTime)
    fs.utimesSync(path.join(newDir, 'config.json'), newTime, newTime)

    const teams = listAgentTeams([path.join(home, '.claude')])
    expect(teams.map((t) => t.name)).toEqual(['new-team', 'old-team'])
    expect(teams[0].lastActivityAt).toBe(newTime.getTime())
    expect(teams[1].lastActivityAt).toBe(oldTime.getTime())
  })

  it('falls back to the directory name when config.name is missing', () => {
    const home = makeHome()
    const rest: Record<string, unknown> = { ...BASE_CONFIG }
    delete rest.name
    writeTeam(home, 'dir-named', rest)
    const teams = listAgentTeams([path.join(home, '.claude')])
    expect(teams[0].name).toBe('dir-named')
  })
})

describe('markLeadSessionAvailability', () => {
  function team(overrides: Partial<AgentTeamSummary>): AgentTeamSummary {
    return {
      name: 't',
      dirPath: '/x',
      createdAt: null,
      lastActivityAt: null,
      leadSessionAvailable: false,
      members: [],
      tasks: [],
      inboxMessageCount: 0,
      lastInboxMessageAt: null,
      ...overrides
    }
  }

  it('marks availability via the session asset lookup', () => {
    const teams = [
      team({ name: 'a', leadSessionId: 'known-id' }),
      team({ name: 'b', leadSessionId: 'missing-id' }),
      team({ name: 'c' })
    ]
    const marked = markLeadSessionAvailability(teams, (assetId) =>
      assetId === 'session-known-id' ? { type: 'session' } : null
    )
    expect(marked.map((t) => t.leadSessionAvailable)).toEqual([true, false, false])
  })

  it('does not count non-session assets', () => {
    const teams = [team({ name: 'a', leadSessionId: 'x' })]
    const marked = markLeadSessionAvailability(teams, () => ({ type: 'skill' }))
    expect(marked[0].leadSessionAvailable).toBe(false)
  })
})
