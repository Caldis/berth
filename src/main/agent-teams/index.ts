// Read-only reader for Claude Code Agent Teams runtime state.
//
// Teams are an experimental Claude Code feature; their state lives in
// `~/.claude/teams/{name}/` (config.json + inboxes/) and `~/.claude/tasks/{name}/`.
// Both dirs are runtime-generated, meant to be removed on cleanup, and routinely
// left behind — so this module surfaces them as collaboration *records*, never
// as live state. Like `src/main/memory/`, it is a read-on-demand IPC domain and
// deliberately stays out of the asset model / scanner / watcher / search.

import * as fs from 'fs'
import * as path from 'path'
import { isRecord, readNumber, readString } from '@shared/object-guards'
import { resolveClaudeDirs } from '@berth/scan-engine/agent-homes'
import type { AgentTeamMember, AgentTeamSummary, AgentTeamTask } from '@shared/types/ipc'
import { sessionAssetId } from '@shared/asset-dedupe'

const TASK_STATUSES = new Set(['pending', 'in_progress', 'completed'])

// GH-115 T10b: 默认遍历 resolveClaudeDirs (BERTH_EXTRA_CLAUDE_DIRS 契约修复 — 此前
// 自拼 os.homedir()/.claude, 资产/健康检查能看到第二 home 而 teams 看不到)。
// 参数保留注入口供测试: 传 claude 目录数组 (非 home)。
export function listAgentTeams(claudeDirs: string[] = resolveClaudeDirs()): AgentTeamSummary[] {
  const teams: AgentTeamSummary[] = []
  for (const claudeDir of claudeDirs) {
    const teamsRoot = path.join(claudeDir, 'teams')
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(teamsRoot, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const team = readTeam(claudeDir, path.join(teamsRoot, entry.name), entry.name)
      if (team) teams.push(team)
    }
  }
  teams.sort((a, b) => (b.lastActivityAt ?? -Infinity) - (a.lastActivityAt ?? -Infinity))
  return teams
}

/**
 * Cross-domain enrichment kept separate from the fs reader: the IPC handler
 * passes the asset-runtime lookup so a team can link to its lead session's
 * transcript only when that session actually exists in the current snapshot.
 */
export function markLeadSessionAvailability(
  teams: AgentTeamSummary[],
  getAsset: (assetId: string) => { type?: string } | null | undefined
): AgentTeamSummary[] {
  return teams.map((team) => {
    if (!team.leadSessionId) return team
    const asset = getAsset(sessionAssetId('claude-code', team.leadSessionId))
    return { ...team, leadSessionAvailable: asset?.type === 'session' }
  })
}

function readTeam(claudeDir: string, teamDir: string, dirName: string): AgentTeamSummary | null {
  const configPath = path.join(teamDir, 'config.json')
  let config: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    if (!isRecord(parsed)) return null
    config = parsed
  } catch {
    return null
  }

  const mtimes: number[] = []
  trackMtime(configPath, mtimes)

  const name = readString(config, 'name') ?? dirName
  const inbox = readInboxes(path.join(teamDir, 'inboxes'), mtimes)
  const tasks = readTasks(path.join(claudeDir, 'tasks', name), mtimes)

  return {
    name,
    description: readString(config, 'description'),
    dirPath: teamDir,
    createdAt: readNumber(config, 'createdAt') ?? null,
    lastActivityAt: mtimes.length > 0 ? Math.max(...mtimes) : null,
    leadAgentId: readString(config, 'leadAgentId'),
    leadSessionId: readString(config, 'leadSessionId'),
    leadSessionAvailable: false,
    members: readMembers(config),
    tasks,
    inboxMessageCount: inbox.count,
    lastInboxMessageAt: inbox.lastMessageAt
  }
}

function readMembers(config: Record<string, unknown>): AgentTeamMember[] {
  if (!Array.isArray(config.members)) return []
  const members: AgentTeamMember[] = []
  for (const raw of config.members) {
    if (!isRecord(raw)) continue
    const name = readString(raw, 'name') ?? readString(raw, 'agentId')
    if (!name) continue
    members.push({
      name,
      agentId: readString(raw, 'agentId') ?? name,
      agentType: readString(raw, 'agentType') ?? 'unknown',
      model: readString(raw, 'model'),
      backend: normalizeBackend(raw),
      prompt: readString(raw, 'prompt'),
      color: readString(raw, 'color'),
      joinedAt: readNumber(raw, 'joinedAt')
    })
  }
  return members
}

function normalizeBackend(member: Record<string, unknown>): AgentTeamMember['backend'] {
  const backendType = readString(member, 'backendType')
  if (backendType === 'in-process' || backendType === 'tmux') return backendType
  const paneId = readString(member, 'tmuxPaneId')
  if (paneId === 'in-process') return 'in-process'
  if (paneId) return 'tmux'
  return undefined
}

function readTasks(taskDir: string, mtimes: number[]): AgentTeamTask[] {
  let files: string[]
  try {
    files = fs.readdirSync(taskDir)
  } catch {
    return []
  }

  const tasks: AgentTeamTask[] = []
  for (const file of files) {
    if (file.startsWith('.') || !file.endsWith('.json')) continue
    const filePath = path.join(taskDir, file)
    let raw: unknown
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch {
      continue
    }
    if (!isRecord(raw)) continue
    trackMtime(filePath, mtimes)
    const id = readString(raw, 'id') ?? path.basename(file, '.json')
    const status = readString(raw, 'status')
    const blockedBy = Array.isArray(raw.blockedBy)
      ? raw.blockedBy.filter((value): value is string => typeof value === 'string')
      : []
    tasks.push({
      id,
      subject: readString(raw, 'subject') ?? readString(raw, 'description') ?? id,
      description: readString(raw, 'description'),
      status: status && TASK_STATUSES.has(status) ? (status as AgentTeamTask['status']) : 'unknown',
      owner: readString(raw, 'owner'),
      blockedBy
    })
  }
  tasks.sort((a, b) => {
    const left = Number(a.id)
    const right = Number(b.id)
    if (Number.isFinite(left) && Number.isFinite(right)) return left - right
    return a.id.localeCompare(b.id)
  })
  return tasks
}

function readInboxes(
  inboxDir: string,
  mtimes: number[]
): { count: number; lastMessageAt: number | null } {
  let files: string[]
  try {
    files = fs.readdirSync(inboxDir)
  } catch {
    return { count: 0, lastMessageAt: null }
  }

  let count = 0
  let lastMessageAt: number | null = null
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const filePath = path.join(inboxDir, file)
    let raw: unknown
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch {
      continue
    }
    if (!Array.isArray(raw)) continue
    trackMtime(filePath, mtimes)
    for (const message of raw) {
      if (!isRecord(message)) continue
      count += 1
      const timestamp = readString(message, 'timestamp')
      const parsed = timestamp ? Date.parse(timestamp) : NaN
      if (!Number.isNaN(parsed)) {
        lastMessageAt = lastMessageAt == null ? parsed : Math.max(lastMessageAt, parsed)
      }
    }
  }
  return { count, lastMessageAt }
}

function trackMtime(filePath: string, mtimes: number[]): void {
  try {
    mtimes.push(fs.statSync(filePath).mtimeMs)
  } catch {
    // unreadable file — skip from the activity signal
  }
}
