import type {
  MemoryListResult,
  MemoryNote,
  MemorySourceStatus
} from '@shared/types/memory'
import * as path from 'path'
import type { MemorySource } from './types'
import { UnitedMemorySource, defaultUnitedMemoryRoot } from './sources/united-memory'
import { ClaudeNativeSource } from './sources/claude-native'
import { resolveClaudeDirs } from '../agent-homes'

function buildSources(projectDir?: string): MemorySource[] {
  return [new UnitedMemorySource(), new ClaudeNativeSource(projectDir)]
}

/**
 * Roots memory notes may live under — consumed by the shell reveal-path guard
 * (GH-119). ~/.united-memory is NOT an adapter scan root, so without this the
 * memory page's "show in explorer" would be denied; the claude projects roots
 * are covered by the ~/.claude scan root and listed redundantly for clarity.
 */
export function getMemoryRoots(): string[] {
  return [
    defaultUnitedMemoryRoot(),
    ...resolveClaudeDirs().map((dir) => path.join(dir, 'projects'))
  ]
}

/**
 * Detect + list across all registered sources, aggregate notes, and include
 * unavailable sources in `sources` so the UI can show/filter them.
 *
 * `sources` is injectable for testing; production callers omit it.
 */
export async function listMemory(
  projectDir?: string,
  sources: MemorySource[] = buildSources(projectDir)
): Promise<MemoryListResult> {
  const results = await Promise.all(
    sources.map(
      async (
        source
      ): Promise<{ status: MemorySourceStatus; notes: MemoryNote[] }> => {
        const status = await source.detect()
        if (!status.available) {
          return { status, notes: [] }
        }
        try {
          const notes = await source.list()
          return { status: { ...status, noteCount: notes.length }, notes }
        } catch (err) {
          return {
            status: {
              ...status,
              available: false,
              error: err instanceof Error ? err.message : String(err)
            },
            notes: []
          }
        }
      }
    )
  )

  return {
    notes: results.flatMap((r) => r.notes),
    sources: results.map((r) => r.status)
  }
}

/**
 * Read a single note by global id `${sourceId}:${localId}`, routing to the
 * source by the prefix before the first ':'.
 */
export async function readMemory(
  globalId: string,
  projectDir?: string,
  sources: MemorySource[] = buildSources(projectDir)
): Promise<MemoryNote | null> {
  const colon = globalId.indexOf(':')
  if (colon < 0) return null
  const sourceId = globalId.slice(0, colon)
  const localId = globalId.slice(colon + 1)

  const source = sources.find((s) => s.id === sourceId)
  if (!source) return null
  return source.read(localId)
}
