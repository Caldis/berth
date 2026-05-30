import type {
  MemoryListResult,
  MemoryNote,
  MemorySourceStatus
} from '@shared/types/memory'
import type { MemorySource } from './types'
import { UnitedMemorySource } from './sources/united-memory'
import { ClaudeNativeSource } from './sources/claude-native'

function buildSources(projectDir?: string): MemorySource[] {
  return [new UnitedMemorySource(), new ClaudeNativeSource(projectDir)]
}

/**
 * Detect + list across all registered sources, aggregate notes, and include
 * unavailable sources in `sources` so the UI can show/filter them.
 */
export async function listMemory(projectDir?: string): Promise<MemoryListResult> {
  const sources = buildSources(projectDir)

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
  projectDir?: string
): Promise<MemoryNote | null> {
  const colon = globalId.indexOf(':')
  if (colon < 0) return null
  const sourceId = globalId.slice(0, colon)
  const localId = globalId.slice(colon + 1)

  const source = buildSources(projectDir).find((s) => s.id === sourceId)
  if (!source) return null
  return source.read(localId)
}
