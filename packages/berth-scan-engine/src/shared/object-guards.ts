// GH-115 T7: 无 node 依赖纯守卫的单一真源。
// 此前 isRecord/readString 族在 adapters/_shared、ipc/handlers、agent-plugins/manifest、
// engine/health、memory sources 等 7+ 处复制 — 根因是工具挂在 adapters/_shared 下,
// 非 adapters 模块依赖它违反层规则, 于是各自再写一份。
// 归属规则: 无 node 依赖 → src/shared (本文件); 有 node 依赖且仅 adapters 域内 → adapters/_shared。
// adapters/_shared/parser-helpers.ts 保持 re-export, 既有 import 面不变。

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

export function readString(record: unknown, key: string): string | undefined {
  if (!isRecord(record)) return undefined
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

export function readNumber(record: unknown, key: string): number | undefined {
  if (!isRecord(record)) return undefined
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function readBoolean(record: unknown, key: string): boolean | undefined {
  if (!isRecord(record)) return undefined
  const value = record[key]
  return typeof value === 'boolean' ? value : undefined
}

export function readStringArray(record: unknown, key: string): string[] {
  if (!isRecord(record)) return []
  const value = record[key]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export function readValidDateString(record: unknown, key: string): string | undefined {
  const value = readString(record, key)
  if (!value) return undefined
  return Number.isNaN(new Date(value).getTime()) ? undefined : value
}

export function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return undefined
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

export function safeId(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'unknown'
}

/**
 * Extract `@path` import references (e.g. `@AGENTS.md`, `@./foo/bar.md`) from
 * instruction file content, one per line. Returns the paths without the `@`.
 * (自 adapters/_shared/markdown.ts 移入 — engine/health 此前维护逐字等价副本,
 * 因层规则不能 import adapters/_shared。markdown.ts 保持 re-export。)
 */
export function extractAtImports(content: string): string[] {
  const results: string[] = []
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (/^@[\w./\\]/.test(trimmed)) {
      results.push(trimmed.slice(1).trim())
    }
  }
  return results
}
