export type HookProvider = 'claude-code' | 'codex'

const HOOK_STATE_FIELDS = new Set(['enabled', 'disabled', 'managed'])

export function buildHookScenarioHash(event: string, matcher?: string): string {
  return stableHash({ event, matcher })
}

export function buildHookHash(hook: Record<string, unknown>): string {
  return stableHash(stripHookStateFields(hook))
}

export function buildHookKey(provider: HookProvider, event: string, matcher: string | undefined, hook: Record<string, unknown>): string {
  return `${provider}:${buildHookScenarioHash(event, matcher)}:${buildHookHash(hook)}`
}

export function stableHash(value: unknown): string {
  return cyrb53(canonicalJson(value)).toString(36)
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalizeForJson(value))
}

function stripHookStateFields(hook: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(hook)) {
    if (HOOK_STATE_FIELDS.has(key)) continue
    next[key] = value
  }
  return next
}

function normalizeForJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeForJson(item))
  if (isRecord(value)) {
    const next: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      const normalized = normalizeForJson(value[key])
      if (normalized !== undefined) next[key] = normalized
    }
    return next
  }
  return value
}

function cyrb53(value: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
    ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
    ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}
