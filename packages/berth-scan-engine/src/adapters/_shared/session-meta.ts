// Shared session-meta helpers for adapters. Previously copied across the
// claude-code and codex session meta parsers.

import * as path from 'path'

/** Wall-clock duration in whole seconds between two ISO timestamps. */
export function calculateDurationSeconds(
  startedAt: string | undefined,
  endedAt: string | undefined
): number | null {
  if (!startedAt || !endedAt) return null
  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  return Math.max(0, Math.round((end - start) / 1000))
}

/** Last path segment of a project path (win32 or posix), else the fallback. */
export function projectNameFromPath(projectPath: string, fallback: string): string {
  if (!projectPath) return fallback
  const trimmed = projectPath.replace(/[\\/]+$/, '')
  return path.win32.basename(trimmed) || path.posix.basename(trimmed) || fallback
}
