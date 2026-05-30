import type {
  MemoryNote,
  MemorySourceId,
  MemorySourceStatus
} from '@shared/types/memory'

/**
 * A replaceable memory backend (native Claude Code memory, united-memory, ...).
 * Adding a new source = implement this interface + register one line; no UI/IPC
 * contract change.
 */
export interface MemorySource {
  readonly id: MemorySourceId
  readonly label: string
  /** Availability + rootPath + note count (cheap probe). */
  detect(): Promise<MemorySourceStatus>
  /** Metadata only (no body). */
  list(): Promise<MemoryNote[]>
  /** Full note including body; null if not found. */
  read(localId: string): Promise<MemoryNote | null>
}
