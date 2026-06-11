import * as fs from 'fs'
import type { SessionReplayEvent } from '@shared/types/ipc'
import { replayEventId, replaySummary } from '@shared/session-replay'
import { isRecord, readNumber, readString } from '../_shared/parser-helpers'
import {
  isCodexToolCall,
  isCodexToolOutput,
  readToolArguments,
  readToolName
} from './parsers'

// GH-116: full-event replay view of a Codex rollout. The event_msg stream is
// the user-facing channel (user_message / agent_message); response_item
// message records duplicate it (assistant) or carry injected harness context
// (user role: AGENTS.md, permissions, app-context) and are skipped. Reasoning
// is usually encrypted — surfaced as placeholder thinking events.

const SYSTEM_EVENT_TYPES = new Set([
  'task_started',
  'task_complete',
  'turn_aborted',
  'context_compacted'
])

export function parseCodexSessionReplay(filePath: string): SessionReplayEvent[] {
  const events: SessionReplayEvent[] = []
  const toolByCallId = new Map<string, SessionReplayEvent>()

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
    const timestamp = readString(parsed, 'timestamp') ?? null
    const type = readString(parsed, 'type')
    const payload = isRecord(parsed.payload) ? parsed.payload : {}
    const payloadType = readString(payload, 'type')

    if (type === 'event_msg') {
      if (payloadType === 'user_message') {
        const text = readString(payload, 'message')
        if (text?.trim()) {
          events.push({ id: nextId(), kind: 'user', timestamp, summary: replaySummary(text) })
        }
      } else if (payloadType === 'agent_message') {
        const text = readString(payload, 'message')
        if (text?.trim()) {
          events.push({ id: nextId(), kind: 'assistant', timestamp, summary: replaySummary(text) })
        }
      } else if (payloadType === 'token_count') {
        const event = buildModelEvent(nextId(), timestamp, payload)
        if (event) events.push(event)
      } else if (payloadType === 'patch_apply_end') {
        const files = Array.isArray(payload.files) ? payload.files.length : 0
        events.push({
          id: nextId(),
          kind: 'tool',
          timestamp,
          summary: replaySummary(files > 0 ? `${files} file${files === 1 ? '' : 's'}` : 'apply_patch'),
          toolName: 'apply_patch',
          status: payload.success === false || payload.exit_code === 1 ? 'error' : 'success'
        })
      } else if (payloadType === 'mcp_tool_call_end') {
        const name = readString(payload, 'tool') ?? readString(payload, 'name') ?? 'mcp_tool_call'
        events.push({
          id: nextId(),
          kind: 'tool',
          timestamp,
          summary: replaySummary(readString(payload, 'server') ?? name),
          toolName: name,
          status: payload.is_error === true ? 'error' : 'success'
        })
      } else if (payloadType === 'web_search_end') {
        events.push({
          id: nextId(),
          kind: 'tool',
          timestamp,
          summary: replaySummary(readString(payload, 'query') ?? 'web_search'),
          toolName: 'web_search',
          status: payload.is_error === true ? 'error' : 'success'
        })
      } else if (payloadType && SYSTEM_EVENT_TYPES.has(payloadType)) {
        const reason = readString(payload, 'reason')
        events.push({
          id: nextId(),
          kind: 'system',
          timestamp,
          summary: replaySummary(reason ? `${payloadType}: ${reason}` : payloadType),
          interrupted: payloadType === 'turn_aborted' || undefined
        })
      } else if (payloadType === 'hook_finished') {
        const hookEvent =
          readString(payload, 'hook_event_name') ?? readString(payload, 'event_name') ?? 'hook'
        events.push({
          id: nextId(),
          kind: 'system',
          timestamp,
          summary: replaySummary(`Hook: ${hookEvent}`)
        })
      }
      continue
    }

    if (type !== 'response_item') continue

    if (payloadType === 'reasoning') {
      events.push({
        id: nextId(),
        kind: 'thinking',
        timestamp,
        summary: replaySummary(reasoningSummary(payload) || 'Thinking…')
      })
      continue
    }

    if (isCodexToolCall(payloadType)) {
      const name = readToolName(payload, payloadType)
      const args = readToolArguments(payload)
      const callId =
        readString(payload, 'call_id') ?? readString(payload, 'callId') ?? readString(payload, 'id')
      const event: SessionReplayEvent = {
        id: nextId(),
        kind: 'tool',
        timestamp,
        summary: replaySummary(safeJson(args)),
        toolName: name
      }
      events.push(event)
      if (callId) toolByCallId.set(callId, event)
      continue
    }

    if (isCodexToolOutput(payloadType)) {
      const callId =
        readString(payload, 'call_id') ?? readString(payload, 'callId') ?? readString(payload, 'id')
      const toolEvent = callId ? toolByCallId.get(callId) : undefined
      const status = payload.is_error === true ? 'error' : 'success'
      if (toolEvent) toolEvent.status = status
      const output = readString(payload, 'output') ?? ''
      events.push({
        id: nextId(),
        kind: 'result',
        timestamp,
        summary: replaySummary(output || 'Tool output'),
        toolName: toolEvent?.toolName,
        status
      })
    }
  }

  return events
}

function buildModelEvent(
  id: string,
  timestamp: string | null,
  payload: Record<string, unknown>
): SessionReplayEvent | null {
  const info = isRecord(payload.info) ? payload.info : undefined
  const last = info && isRecord(info.last_token_usage) ? info.last_token_usage : undefined
  if (last) {
    const input = readNumber(last, 'input_tokens') ?? 0
    const output = readNumber(last, 'output_tokens') ?? 0
    return {
      id,
      kind: 'model',
      timestamp,
      summary: replaySummary(`${input} in → ${output} out`),
      tokens: {
        input,
        output,
        cacheRead: readNumber(last, 'cached_input_tokens') ?? undefined
      }
    }
  }
  const total = readNumber(payload, 'total_tokens')
  if (total == null) return null
  return { id, kind: 'model', timestamp, summary: replaySummary(`${total} tokens`) }
}

function reasoningSummary(payload: Record<string, unknown>): string {
  const summary = payload.summary
  if (!Array.isArray(summary)) return readString(payload, 'content') ?? ''
  const parts: string[] = []
  for (const item of summary) {
    if (!isRecord(item)) continue
    const text = readString(item, 'text')
    if (text) parts.push(text)
  }
  return parts.join(' ')
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? ''
  } catch {
    return ''
  }
}
