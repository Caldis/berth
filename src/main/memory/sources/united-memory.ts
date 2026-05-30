import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as yaml from 'js-yaml'
import type {
  MemoryImportance,
  MemoryNote,
  MemorySourceStatus
} from '@shared/types/memory'
import type { MemorySource } from '../types'

const SOURCE_ID = 'united-memory' as const
const SOURCE_LABEL = 'United Memory'

interface UnitedIndexEntry {
  id?: unknown
  file?: unknown
  title?: unknown
  tags?: unknown
  links?: unknown
  importance?: unknown
  summary?: unknown
  created?: unknown
  updated?: unknown
}

function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function toImportance(v: unknown): MemoryImportance {
  return v === 'core' || v === 'active' || v === 'archive' ? v : 'unknown'
}

/**
 * Coerce a date-ish frontmatter value to a string. YAML parses unquoted ISO
 * dates (e.g. `created: 2026-03-17`) into JS `Date` objects, so a plain
 * `asString` would drop them. Date-only values render back as `YYYY-MM-DD`.
 */
function asDateString(v: unknown): string | null {
  if (typeof v === 'string') return v
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const iso = v.toISOString()
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso
  }
  return null
}

/**
 * Split YAML frontmatter from a markdown body. Mirrors the convention used by
 * src/main/adapters/claude-code/parsers.ts.
 */
function splitFrontmatter(content: string): {
  frontmatter: Record<string, unknown>
  body: string
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: content }
  try {
    const fm = (yaml.load(match[1]) as Record<string, unknown>) ?? {}
    return { frontmatter: fm, body: match[2] }
  } catch {
    return { frontmatter: {}, body: content }
  }
}

/**
 * Extract the `## TL;DR` section text (up to the next heading) from markdown.
 */
function extractTldr(content: string): string | undefined {
  const start = content.match(/^##\s+TL;DR\s*$/m)
  if (!start || start.index === undefined) return undefined
  const after = content.slice(start.index + start[0].length)
  // Section runs until the next markdown heading (any level) or end of string.
  const next = after.match(/^#{1,6}\s/m)
  const section = next && next.index !== undefined ? after.slice(0, next.index) : after
  const text = section.trim()
  return text.length > 0 ? text : undefined
}

/**
 * Pure: parse united-memory `index.json` text into MemoryNote[] (metadata only,
 * no body). Iterates `entries[]` so malformed/non-indexed mem files are never
 * surfaced. Returns [] on malformed JSON or missing entries.
 */
export function parseUnitedIndex(jsonString: string): MemoryNote[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return []
  }
  const entries = (parsed as { entries?: unknown })?.entries
  if (!Array.isArray(entries)) return []

  const notes: MemoryNote[] = []
  for (const raw of entries as UnitedIndexEntry[]) {
    const localId = asString(raw.id)
    if (!localId) continue
    const file = asString(raw.file) ?? `mem/${localId}.md`
    const summary = asString(raw.summary) ?? undefined
    notes.push({
      id: `${SOURCE_ID}:${localId}`,
      sourceId: SOURCE_ID,
      sourceLabel: SOURCE_LABEL,
      title: asString(raw.title) ?? localId,
      summary,
      tags: asStringArray(raw.tags),
      importance: toImportance(raw.importance),
      path: file,
      links: asStringArray(raw.links),
      createdAt: asString(raw.created),
      updatedAt: asString(raw.updated)
    })
  }
  return notes
}

/**
 * Pure: parse a single united-memory note markdown into a full MemoryNote
 * (including body). `localId` is the entry id (filename without extension).
 */
export function parseUnitedNote(mdString: string, localId: string): MemoryNote {
  const { frontmatter, body } = splitFrontmatter(mdString)

  const fmTitle = asString(frontmatter.title)
  const h1 = body.match(/^#\s+(.+)$/m)
  const title = fmTitle ?? (h1 ? h1[1].trim() : localId)

  return {
    id: `${SOURCE_ID}:${localId}`,
    sourceId: SOURCE_ID,
    sourceLabel: SOURCE_LABEL,
    title,
    summary: extractTldr(body),
    tags: asStringArray(frontmatter.tags),
    importance: toImportance(frontmatter.importance),
    path: `mem/${localId}.md`,
    links: asStringArray(frontmatter.links),
    createdAt: asDateString(frontmatter.created),
    updatedAt: asDateString(frontmatter.updated),
    body
  }
}

/**
 * united-memory source: reads ~/.united-memory. List from index.json; detail
 * reads mem/<id>.md on demand. Read-only.
 */
export class UnitedMemorySource implements MemorySource {
  readonly id = SOURCE_ID
  readonly label = SOURCE_LABEL
  private readonly root: string

  constructor(root?: string) {
    this.root = root ?? path.join(os.homedir(), '.united-memory')
  }

  private get indexPath(): string {
    return path.join(this.root, 'index.json')
  }

  async detect(): Promise<MemorySourceStatus> {
    const base: MemorySourceStatus = {
      id: this.id,
      label: this.label,
      available: false,
      rootPath: this.root,
      noteCount: 0
    }
    try {
      const json = await fs.promises.readFile(this.indexPath, 'utf-8')
      const notes = parseUnitedIndex(json)
      return { ...base, available: true, noteCount: notes.length }
    } catch {
      return base
    }
  }

  async list(): Promise<MemoryNote[]> {
    try {
      const json = await fs.promises.readFile(this.indexPath, 'utf-8')
      return parseUnitedIndex(json)
    } catch {
      return []
    }
  }

  async read(localId: string): Promise<MemoryNote | null> {
    const filePath = path.join(this.root, 'mem', `${localId}.md`)
    try {
      const md = await fs.promises.readFile(filePath, 'utf-8')
      return parseUnitedNote(md, localId)
    } catch {
      return null
    }
  }
}
