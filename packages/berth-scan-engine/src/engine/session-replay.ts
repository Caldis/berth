import type { Asset } from '@shared/types/asset'
import type {
  SessionReplayEvent,
  SessionReplayEventPayload,
  SessionReplayResult
} from '@shared/types/ipc'
import { replayEventLineIndex } from '@shared/session-replay'
import { readString } from '@shared/object-guards'
import { parseClaudeSessionReplay } from '../adapters/claude-code/session-replay'
import { parseCodexSessionReplay } from '../adapters/codex/session-replay'
import { iterateJsonlLinesWithIndex } from '../adapters/_shared/jsonl-stream'
import { AssetFileCache } from './assets/file-cache'

// GH-116: sessions:events / sessions:event-payload 的编排层。事件 meta 经指纹缓存
// (path+size+mtimeMs) 复用; 原始 payload 永远按行从磁盘取, 不进缓存 — 多 MB transcript
// 的正文既不过 IPC 全量, 也不驻留主进程内存。
// (与 session-detail 同款 engine→adapters 直连, 归 ARCHITECTURE 既有例外行。)

/** 单次重放返回给 renderer 的事件上限; 超出取最近一段并置 truncated。 */
export const REPLAY_EVENT_CAP = 20_000

// GH-148: replayCache holds the FULL (un-truncated) parsed event array per
// transcript and was previously unbounded — opening many large sessions pinned
// every one in main-process memory. Bound by summed payload bytes (recency-LRU):
// keep the working set of recently-viewed replays, evict the oldest past the cap.
const REPLAY_CACHE_MAX_BYTES = 64 * 1024 * 1024
const replayCache = new AssetFileCache<SessionReplayEvent[]>({
  maxBytes: REPLAY_CACHE_MAX_BYTES,
  sizeOf: estimateReplayBytes
})

/** Cheap byte estimate of a parsed replay (JSON length of the event array). */
function estimateReplayBytes(events: SessionReplayEvent[]): number {
  try {
    return JSON.stringify(events).length
  } catch {
    // Circular/huge — fall back to a coarse per-event constant so it still counts.
    return events.length * 256
  }
}

export function buildSessionReplay(asset: Asset, opts?: { cap?: number }): SessionReplayResult {
  const cap = opts?.cap ?? REPLAY_EVENT_CAP
  const events = readReplayEvents(asset)
  const truncated = events.length > cap
  const visible = truncated ? events.slice(events.length - cap) : events
  return {
    sessionId: asset.id,
    agentId: asset.agentId,
    startedAt: readString(asset.meta, 'startedAt') ?? firstTimestamp(events),
    endedAt: readString(asset.meta, 'endedAt') ?? lastTimestamp(events),
    events: visible,
    totalEvents: events.length,
    truncated
  }
}

export function readSessionReplayEventPayload(
  asset: Asset,
  eventId: string
): SessionReplayEventPayload | null {
  const lineIndex = replayEventLineIndex(eventId)
  if (lineIndex == null) return null
  try {
    // GH-148: stream to the target line and stop — the single biggest win, since
    // every event click re-reads the transcript just to fetch one line. The
    // iterator's index + \r handling are byte-for-byte equal to
    // split(/\r?\n/)[lineIndex], so the returned json is unchanged.
    for (const { index, line } of iterateJsonlLinesWithIndex(asset.path)) {
      if (index < lineIndex) continue
      if (index > lineIndex) break
      if (!line.trim()) return null
      return { id: eventId, json: line }
    }
    return null
  } catch {
    return null
  }
}

function readReplayEvents(asset: Asset): SessionReplayEvent[] {
  const parse = replayParserFor(asset.agentId)
  if (!parse) return []
  const result = replayCache.read(asset.path, () => parse(asset.path))
  if (result.status === 'hit' || result.status === 'miss') return result.value
  return []
}

function replayParserFor(agentId: string): ((filePath: string) => SessionReplayEvent[]) | null {
  if (agentId === 'codex') return parseCodexSessionReplay
  if (agentId === 'claude-code' || agentId === 'claude') return parseClaudeSessionReplay
  return null
}

function firstTimestamp(events: SessionReplayEvent[]): string | null {
  for (const event of events) {
    if (event.timestamp) return event.timestamp
  }
  return null
}

function lastTimestamp(events: SessionReplayEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].timestamp) return events[i].timestamp
  }
  return null
}
