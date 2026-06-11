import * as fs from 'fs'
import type { SessionReplayEvent } from '@shared/types/ipc'
import { replayEventId, replaySummary } from '@shared/session-replay'
import { isRecord, readNumber, readString, readValidDateString } from '../_shared/parser-helpers'

// GH-116: full-event replay view of a Claude Code transcript. Unlike
// session-detail (tool timeline only) this surfaces user/assistant/thinking
// text, per-message usage and system records, keeping summaries bounded —
// raw payloads are fetched per line by the engine on demand.

/** Pure-meta record types that carry no replay value. */
const SKIPPED_RECORD_TYPES = new Set([
  'last-prompt',
  'ai-title',
  'permission-mode',
  'bridge-session',
  'summary',
  'attachment',
  'queued-command',
  'progress'
])

export function parseClaudeSessionReplay(filePath: string): SessionReplayEvent[] {
  const events: SessionReplayEvent[] = []
  const toolByCallId = new Map<string, SessionReplayEvent>()
  let lastUsageMessageId: string | null = null

  let raw: string
  try {
    raw = fs.readFileSync(filePath, 'utf-8')
  } catch {
    return []
  }

  const lines = raw.split(/\r?\n/)
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    if (!line.trim()) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      continue
    }
    if (!isRecord(parsed)) continue

    let emission = 0
    const nextId = (): string => replayEventId(lineIndex, emission++)
    const timestamp = readValidDateString(parsed, 'timestamp') ?? null
    const sidechain = parsed.isSidechain === true ? true : undefined
    const type = readString(parsed, 'type')
    const subtype = readString(parsed, 'subtype')

    if (type && SKIPPED_RECORD_TYPES.has(type)) continue

    if (subtype === 'stop_hook_summary') {
      const hookCount =
        readNumber(parsed, 'hookCount') ??
        (Array.isArray(parsed.hookInfos) ? parsed.hookInfos.length : 0)
      events.push({
        id: nextId(),
        kind: 'system',
        timestamp,
        summary: replaySummary(`Stop hooks: ${hookCount} hook${hookCount === 1 ? '' : 's'}`),
        sidechain
      })
      continue
    }

    if (type === 'file-history-snapshot') {
      const fileCount = countFileHistoryBackups(parsed)
      events.push({
        id: nextId(),
        kind: 'system',
        timestamp,
        summary: replaySummary(`File history checkpoint (${fileCount} file${fileCount === 1 ? '' : 's'})`),
        sidechain
      })
      continue
    }

    if (type === 'system') {
      const summary = readString(parsed, 'content') ?? subtype ?? 'system'
      events.push({ id: nextId(), kind: 'system', timestamp, summary: replaySummary(summary), sidechain })
      continue
    }

    if (type !== 'user' && type !== 'assistant') continue

    const message = isRecord(parsed.message) ? parsed.message : undefined
    if (!message) continue
    const content = message.content

    if (type === 'user' && typeof content === 'string') {
      if (!content.trim()) continue
      events.push({
        id: nextId(),
        kind: 'user',
        timestamp,
        summary: replaySummary(content),
        sidechain,
        interrupted: isUserInterruptText(content) || undefined
      })
      continue
    }

    if (!Array.isArray(content)) continue

    for (const block of content) {
      if (!isRecord(block)) continue
      const blockType = readString(block, 'type')

      if (type === 'user') {
        if (blockType === 'text') {
          const text = readString(block, 'text')
          if (text?.trim()) {
            events.push({
              id: nextId(),
              kind: 'user',
              timestamp,
              summary: replaySummary(text),
              sidechain,
              interrupted: isUserInterruptText(text) || undefined
            })
          }
        } else if (blockType === 'tool_result') {
          const callId = readString(block, 'tool_use_id')
          const toolEvent = callId ? toolByCallId.get(callId) : undefined
          const status = block.is_error === true ? 'error' : 'success'
          if (toolEvent) toolEvent.status = status
          events.push({
            id: nextId(),
            kind: 'result',
            timestamp,
            summary: replaySummary(toolResultText(block) || 'Tool result'),
            toolName: toolEvent?.toolName,
            status,
            sidechain
          })
        }
        continue
      }

      // assistant blocks
      if (blockType === 'thinking') {
        const text = readString(block, 'thinking') ?? readString(block, 'text') ?? ''
        events.push({
          id: nextId(),
          kind: 'thinking',
          timestamp,
          summary: replaySummary(text || 'Thinking…'),
          sidechain
        })
      } else if (blockType === 'text') {
        const text = readString(block, 'text')
        if (text?.trim()) {
          events.push({ id: nextId(), kind: 'assistant', timestamp, summary: replaySummary(text), sidechain })
        }
      } else if (blockType === 'tool_use') {
        const name = readString(block, 'name')
        if (!name) continue
        const callId = readString(block, 'id')
        const input = isRecord(block.input) ? block.input : {}
        const event: SessionReplayEvent = {
          id: nextId(),
          kind: 'tool',
          timestamp,
          summary: replaySummary(safeJson(input)),
          toolName: name,
          sidechain
        }
        events.push(event)
        if (callId) toolByCallId.set(callId, event)
      }
    }

    if (type === 'assistant') {
      const usage = isRecord(message.usage) ? message.usage : undefined
      const messageId = readString(message, 'id') ?? null
      if (usage && messageId !== lastUsageMessageId) {
        const input = readNumber(usage, 'input_tokens')
        const output = readNumber(usage, 'output_tokens')
        if (input != null || output != null) {
          lastUsageMessageId = messageId
          events.push({
            id: nextId(),
            kind: 'model',
            timestamp,
            summary: replaySummary(`${input ?? 0} in → ${output ?? 0} out`),
            tokens: {
              input: input ?? undefined,
              output: output ?? undefined,
              cacheRead: readNumber(usage, 'cache_read_input_tokens') ?? undefined,
              cacheCreation: readNumber(usage, 'cache_creation_input_tokens') ?? undefined
            },
            sidechain
          })
        }
      }
    }
  }

  return events
}

/** Esc-interrupt marker Claude Code writes as a user record (empirical, no public contract). */
function isUserInterruptText(text: string): boolean {
  return text.trimStart().startsWith('[Request interrupted by user')
}

function toolResultText(block: Record<string, unknown>): string {
  const content = block.content
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const item of content) {
    if (!isRecord(item)) continue
    const text = readString(item, 'text')
    if (text) parts.push(text)
  }
  return parts.join(' ')
}

function countFileHistoryBackups(record: Record<string, unknown>): number {
  const snapshot = isRecord(record.snapshot) ? record.snapshot : record
  return Array.isArray(snapshot.trackedFileBackups) ? snapshot.trackedFileBackups.length : 0
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? ''
  } catch {
    return ''
  }
}
