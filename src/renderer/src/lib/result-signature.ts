import type { SessionSummary } from '@shared/types/asset'
import type { MemoryListResult, MemoryNote, MemorySourceStatus } from '@shared/types/memory'

const FIELD_SEPARATOR = '\u001f'
const ROW_SEPARATOR = '\u001e'

function field(value: unknown): string {
  if (value == null) return ''
  return String(value).replaceAll(FIELD_SEPARATOR, ' ').replaceAll(ROW_SEPARATOR, ' ')
}

function row(parts: readonly unknown[]): string {
  return parts.map(field).join(FIELD_SEPARATOR)
}

export function sessionListSignature(sessions: readonly SessionSummary[], totalCount: number): string {
  return [
    field(totalCount),
    ...sessions.map((session) => row([
      session.id,
      session.agentId,
      session.title,
      session.project,
      session.projectPath,
      session.startedAt,
      session.endedAt,
      session.duration,
      session.cost,
      session.tokens,
      session.tokenUsage.totalTokens,
      session.model
    ]))
  ].join(ROW_SEPARATOR)
}

function memoryNoteSignature(note: MemoryNote): string {
  return row([
    note.id,
    note.sourceId,
    note.sourceLabel,
    note.title,
    note.summary,
    note.tags.join(','),
    note.importance,
    note.scope,
    note.path,
    note.links.join(','),
    note.createdAt,
    note.updatedAt,
    note.missing === true
  ])
}

function memorySourceSignature(source: MemorySourceStatus): string {
  return row([
    source.id,
    source.label,
    source.available,
    source.rootPath,
    source.noteCount,
    source.error
  ])
}

export function memoryListSignature(result: MemoryListResult): string {
  return [
    ...result.sources.map(memorySourceSignature),
    ...result.notes.map(memoryNoteSignature)
  ].join(ROW_SEPARATOR)
}
