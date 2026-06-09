// Shared scalar parser helpers, previously copied byte-for-byte across the
// claude-code and codex adapters (parsers + session-detail). Single source of
// truth so a third adapter does not spawn a fourth copy.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

export function readString(record: unknown, key: string): string | undefined {
  if (!isRecord(record)) return undefined
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

export function safeId(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'unknown'
}
