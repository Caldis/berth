import * as fs from 'fs'
import * as path from 'path'
import type {
  SessionArtifactCheckpoint,
  SessionArtifactFile,
  SessionArtifactPlan,
  SessionArtifactTodo,
  SessionArtifacts,
  SessionToolEvent,
  SessionToolEventCategory
} from '@shared/types/ipc'
import { isRecord, readString, safeId, uniqueStrings } from '../_shared/parser-helpers'
import { extractPaths, parseMcpToolName, upsertFile } from '../_shared/session-artifacts'

export interface ParsedSessionDetail {
  toolTimeline: SessionToolEvent[]
  artifacts: SessionArtifacts
}

interface MutableArtifacts {
  plans: Map<string, SessionArtifactPlan>
  todos: Map<string, SessionArtifactTodo>
  files: Map<string, SessionArtifactFile>
  checkpoints: SessionArtifactCheckpoint[]
}

export function parseClaudeSessionDetail(filePath: string): ParsedSessionDetail {
  const toolTimeline: SessionToolEvent[] = []
  const byCallId = new Map<string, SessionToolEvent>()
  const artifacts = createMutableArtifacts()
  let sequence = 0

  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue
      let parsed: unknown
      try {
        parsed = JSON.parse(line)
      } catch {
        continue
      }
      if (!isRecord(parsed)) continue

      const timestamp = readValidDateString(parsed, 'timestamp') ?? null
      const type = readString(parsed, 'type')
      const subtype = readString(parsed, 'subtype')

      if (type === 'file-history-snapshot') {
        const checkpoint = buildFileHistoryCheckpoint(parsed, timestamp, artifacts.checkpoints.length)
        artifacts.checkpoints.push(checkpoint)
        for (const filePath of extractFileHistoryPaths(parsed)) {
          upsertFile(artifacts, filePath, 'checkpoint')
        }
        continue
      }

      if (subtype === 'stop_hook_summary') {
        const hookCount =
          readNumber(parsed, 'hookCount') ??
          (Array.isArray(parsed.hookInfos) ? parsed.hookInfos.length : 0)
        const event: SessionToolEvent = {
          id: `claude-hook-${sequence++}`,
          name: 'Stop',
          category: 'hook',
          status: 'success',
          startedAt: timestamp,
          endedAt: timestamp,
          summary: hookCount > 0 ? `${hookCount} hook${hookCount === 1 ? '' : 's'}` : undefined,
          filePaths: []
        }
        toolTimeline.push(event)
        continue
      }

      const message = isRecord(parsed.message) ? parsed.message : undefined
      const content = Array.isArray(message?.content) ? message.content : []
      for (const item of content) {
        if (!isRecord(item)) continue
        const itemType = readString(item, 'type')
        if (itemType === 'tool_use') {
          const name = readString(item, 'name')
          if (!name) continue
          const callId = readString(item, 'id') ?? `claude-tool-${sequence}`
          const input = isRecord(item.input) ? item.input : {}
          const mcp = parseMcpToolName(name)
          const skillName = name === 'Skill' ? readString(input, 'skill') : undefined
          const filePaths = uniqueStrings(extractPaths(input))
          const event: SessionToolEvent = {
            id: `claude-tool-${sequence++}`,
            callId,
            name,
            category: classifyClaudeTool(name),
            status: 'pending',
            startedAt: timestamp,
            endedAt: null,
            summary: summarizeToolInput(name, input, skillName),
            filePaths,
            mcpServer: mcp?.server,
            mcpTool: mcp?.tool,
            skillName
          }
          toolTimeline.push(event)
          byCallId.set(callId, event)
          recordArtifactsFromTool(artifacts, event, input)
        } else if (itemType === 'tool_result') {
          const callId = readString(item, 'tool_use_id')
          if (!callId) continue
          const event = byCallId.get(callId)
          if (!event) continue
          event.status = item.is_error === true ? 'error' : 'success'
          event.endedAt = timestamp
        }
      }
    }
  } catch {
    // Locked or unreadable transcripts should not break the detail page.
  }

  return {
    toolTimeline,
    artifacts: materializeArtifacts(artifacts)
  }
}

function classifyClaudeTool(name: string): SessionToolEventCategory {
  if (name === 'Skill') return 'skill'
  if (parseMcpToolName(name)) return 'mcp'
  if (['Task', 'TaskCreate', 'TaskUpdate', 'TodoWrite'].includes(name)) return 'task'
  if (['Grep', 'Glob', 'LS'].includes(name)) return 'search'
  if (['WebFetch', 'WebSearch'].includes(name)) return 'web'
  if (['Read', 'Edit', 'MultiEdit', 'Write', 'NotebookEdit'].includes(name)) return 'file'
  return 'builtin'
}

function recordArtifactsFromTool(
  artifacts: MutableArtifacts,
  event: SessionToolEvent,
  input: Record<string, unknown>
): void {
  if (event.name === 'ExitPlanMode') {
    const planPath = firstString(input, ['planFilePath', 'plan_file_path', 'path', 'file_path'])
    if (planPath) {
      artifacts.plans.set(planPath, {
        id: `plan-${safeId(planPath)}`,
        title: path.basename(planPath),
        path: planPath
      })
    }
  }

  if (event.name === 'TodoWrite' && Array.isArray(input.todos)) {
    input.todos.forEach((todo, index) => {
      if (!isRecord(todo)) return
      const title = firstString(todo, ['content', 'title', 'task'])
      if (!title) return
      const id = firstString(todo, ['id']) ?? `todo-${safeId(title)}-${index}`
      const status = firstString(todo, ['status'])
      artifacts.todos.set(id, {
        id,
        title,
        done: status === 'completed' || todo.done === true
      })
    })
  }

  if (event.name === 'TaskCreate' || event.name === 'TaskUpdate') {
    const title = firstString(input, ['title', 'content', 'description', 'activeForm', 'task'])
    if (title) {
      const id = firstString(input, ['taskId', 'id']) ?? `task-${safeId(title)}`
      const status = firstString(input, ['status'])
      artifacts.todos.set(id, {
        id,
        title,
        done: status === 'completed' || status === 'done'
      })
    }
  }

  const operation = operationForTool(event.name)
  for (const filePath of event.filePaths) {
    upsertFile(artifacts, filePath, operation)
  }
}

function summarizeToolInput(
  name: string,
  input: Record<string, unknown>,
  skillName?: string
): string | undefined {
  if (skillName) return skillName
  if (name === 'Bash' || name === 'PowerShell') {
    return truncate(firstString(input, ['command']) ?? '', 120)
  }
  if (name === 'TodoWrite' && Array.isArray(input.todos)) {
    return `${input.todos.length} todo${input.todos.length === 1 ? '' : 's'}`
  }
  const paths = extractPaths(input)
  if (paths.length > 0) return paths.slice(0, 3).join(', ')
  return firstString(input, ['description', 'prompt', 'query'])
}

function buildFileHistoryCheckpoint(
  record: Record<string, unknown>,
  timestamp: string | null,
  index: number
): SessionArtifactCheckpoint {
  const fileCount = extractFileHistoryPaths(record).length
  return {
    id: `checkpoint-${index}`,
    title: 'File history checkpoint',
    timestamp,
    fileCount
  }
}

function extractFileHistoryPaths(record: Record<string, unknown>): string[] {
  const snapshot = isRecord(record.snapshot) ? record.snapshot : record
  const backups = Array.isArray(snapshot.trackedFileBackups) ? snapshot.trackedFileBackups : []
  const paths: string[] = []
  for (const backup of backups) {
    if (!isRecord(backup)) continue
    paths.push(...extractPaths(backup))
  }
  return uniqueStrings(paths)
}

function operationForTool(name: string): string {
  if (['Read', 'Grep', 'Glob', 'LS'].includes(name)) return 'read'
  if (['Edit', 'MultiEdit', 'Write', 'NotebookEdit'].includes(name)) return 'write'
  if (name === 'ExitPlanMode') return 'plan'
  return name
}

function createMutableArtifacts(): MutableArtifacts {
  return {
    plans: new Map(),
    todos: new Map(),
    files: new Map(),
    checkpoints: []
  }
}

function materializeArtifacts(artifacts: MutableArtifacts): SessionArtifacts {
  return {
    plans: Array.from(artifacts.plans.values()),
    todos: Array.from(artifacts.todos.values()),
    files: Array.from(artifacts.files.values()),
    checkpoints: artifacts.checkpoints
  }
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return undefined
}

function readNumber(record: unknown, key: string): number | undefined {
  if (!isRecord(record)) return undefined
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readValidDateString(record: unknown, key: string): string | undefined {
  const value = readString(record, key)
  if (!value) return undefined
  return Number.isNaN(new Date(value).getTime()) ? undefined : value
}

function truncate(value: string, maxLength: number): string | undefined {
  if (!value.trim()) return undefined
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
}

