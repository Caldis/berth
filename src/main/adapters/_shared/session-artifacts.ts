// Shared session-artifact parsing helpers for adapters. Previously copied
// across the claude-code session-detail parser and the codex session parser.

import { isRecord, safeId, uniqueStrings } from './parser-helpers'
import type { SessionArtifactFile } from '@shared/types/ipc'

/**
 * Keys whose string values denote file paths in tool-call payloads. Unified
 * superset of the drifted adapter copies (the claude-code copy lacked
 * `paths`/`file`/`files`, missing e.g. multi-file tool inputs).
 */
function isPathKey(key: string): boolean {
  return [
    'path',
    'paths',
    'file',
    'files',
    'filePath',
    'file_path',
    'filepath',
    'absolutePath',
    'absolute_path',
    'relativePath',
    'relative_path'
  ].includes(key)
}

function collectPaths(value: unknown, paths: string[], keyHint?: string): void {
  if (typeof value === 'string') {
    if (keyHint && isPathKey(keyHint) && value.trim()) paths.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPaths(item, paths, keyHint)
    return
  }
  if (!isRecord(value)) return
  for (const [key, nested] of Object.entries(value)) {
    collectPaths(nested, paths, key)
  }
}

/** Recursively collect file paths (path-like keys only) from a tool payload. */
export function extractPaths(value: unknown): string[] {
  const paths: string[] = []
  collectPaths(value, paths)
  return uniqueStrings(paths)
}

/** Parse an `mcp__<server>__<tool>` tool name into its parts. */
export function parseMcpToolName(name: string): { server: string; tool: string } | undefined {
  if (!name.startsWith('mcp__')) return undefined
  const rest = name.slice('mcp__'.length)
  const separator = rest.indexOf('__')
  if (separator <= 0) return undefined
  return {
    server: rest.slice(0, separator),
    tool: rest.slice(separator + 2)
  }
}

/** Record a file artifact; repeat touches bump count, the first operation wins. */
export function upsertFile(
  artifacts: { files: Map<string, SessionArtifactFile> },
  filePath: string,
  operation?: string
): void {
  if (!filePath.trim()) return
  const existing = artifacts.files.get(filePath)
  if (existing) {
    existing.count += 1
    if (!existing.operation && operation) existing.operation = operation
    return
  }
  artifacts.files.set(filePath, {
    id: `file-${safeId(filePath)}`,
    path: filePath,
    operation,
    count: 1
  })
}
