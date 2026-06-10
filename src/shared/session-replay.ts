// Session replay shared helpers (GH-116) — pure, no node deps.
// Event ids are `L{lineIndex}B{emissionIndex}`: the line index is the payload
// lookup key (raw JSONL line), the emission index only disambiguates multiple
// events emitted from one record (content blocks, usage). Parsers own the
// format; the engine reverses it via replayEventLineIndex.

export const REPLAY_SUMMARY_MAX = 160

export function replayEventId(lineIndex: number, emissionIndex: number): string {
  return `L${lineIndex}B${emissionIndex}`
}

export function replayEventLineIndex(id: string): number | null {
  const match = /^L(\d+)B\d+$/.exec(id)
  if (!match) return null
  return Number(match[1])
}

/** Collapse a payload text into a single bounded list-row line. */
export function replaySummary(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= REPLAY_SUMMARY_MAX) return collapsed
  return `${collapsed.slice(0, REPLAY_SUMMARY_MAX - 1)}…`
}
