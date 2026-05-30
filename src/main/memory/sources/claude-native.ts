import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as yaml from 'js-yaml'
import type { MemoryNote, MemorySourceStatus } from '@shared/types/memory'
import type { MemorySource } from '../types'

const SOURCE_ID = 'claude-native' as const
const SOURCE_LABEL = 'Claude Code'
const INDEX_FILE = 'MEMORY.md'

export interface NativeIndexEntry {
  title: string
  file: string
  hook?: string
}

function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}

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
 * Pure: parse a native `MEMORY.md` index. Each entry is a list line of the form
 * `- [Title](file.md) - hook` (separator may be a hyphen or em/en dash).
 * Returns [] when no entries are present.
 */
export function parseMemoryIndex(mdString: string): NativeIndexEntry[] {
  const entries: NativeIndexEntry[] = []
  const lineRe = /^\s*[-*]\s*\[([^\]]+)\]\(([^)]+)\)\s*(?:[—–-]\s*(.*\S))?\s*$/gm
  let m: RegExpExecArray | null
  while ((m = lineRe.exec(mdString)) !== null) {
    const title = m[1].trim()
    const file = m[2].trim()
    const hook = m[3]?.trim()
    entries.push(hook ? { title, file, hook } : { title, file })
  }
  return entries
}

/**
 * Pure: parse a single native memory note markdown into a full MemoryNote.
 * Frontmatter: `name` / `description` / `metadata.type`. `slug` is the project
 * slug; `filename` the note's file name (used for id + title fallback).
 */
export function parseNativeNote(
  mdString: string,
  slug: string,
  filename: string
): MemoryNote {
  const { frontmatter, body } = splitFrontmatter(mdString)

  const name = asString(frontmatter.name)
  const description = asString(frontmatter.description) ?? undefined
  const metadata =
    frontmatter.metadata && typeof frontmatter.metadata === 'object'
      ? (frontmatter.metadata as Record<string, unknown>)
      : {}
  const type = asString(metadata.type)

  return {
    id: `${SOURCE_ID}:${slug}/${filename}`,
    sourceId: SOURCE_ID,
    sourceLabel: SOURCE_LABEL,
    title: name ?? filename,
    summary: description,
    tags: type ? [type] : [],
    importance: 'active',
    scope: slug,
    path: filename,
    links: [],
    createdAt: null,
    updatedAt: null,
    body
  }
}

/**
 * Native Claude Code memory source: scans ~/.claude/projects/<slug>/memory/ for
 * MEMORY.md + sibling note files. Read-only. On machines where this dir is
 * empty/absent, detect() reports available:false gracefully.
 */
export class ClaudeNativeSource implements MemorySource {
  readonly id = SOURCE_ID
  readonly label = SOURCE_LABEL
  private readonly projectsRoot: string
  private readonly projectFilter?: string

  /**
   * @param projectDir Optional project slug to restrict scanning to one project.
   * @param projectsRoot Override the projects root (defaults to ~/.claude/projects).
   */
  constructor(projectDir?: string, projectsRoot?: string) {
    this.projectsRoot = projectsRoot ?? path.join(os.homedir(), '.claude', 'projects')
    this.projectFilter = projectDir
  }

  private memoryDir(slug: string): string {
    return path.join(this.projectsRoot, slug, 'memory')
  }

  /** Resolve the project slugs whose memory/ dir exists. */
  private async resolveSlugs(): Promise<string[]> {
    let candidates: string[]
    if (this.projectFilter) {
      candidates = [this.projectFilter]
    } else {
      try {
        const dirents = await fs.promises.readdir(this.projectsRoot, {
          withFileTypes: true
        })
        candidates = dirents.filter((d) => d.isDirectory()).map((d) => d.name)
      } catch {
        return []
      }
    }

    const slugs: string[] = []
    for (const slug of candidates) {
      try {
        const stat = await fs.promises.stat(this.memoryDir(slug))
        if (stat.isDirectory()) slugs.push(slug)
      } catch {
        // memory dir absent for this project; skip
      }
    }
    return slugs
  }

  /** List note .md files (excluding the MEMORY.md index) in a memory dir. */
  private async noteFiles(slug: string): Promise<string[]> {
    try {
      const names = await fs.promises.readdir(this.memoryDir(slug))
      return names.filter(
        (n) => n.toLowerCase().endsWith('.md') && n !== INDEX_FILE
      )
    } catch {
      return []
    }
  }

  async detect(): Promise<MemorySourceStatus> {
    const base: MemorySourceStatus = {
      id: this.id,
      label: this.label,
      available: false,
      rootPath: this.projectsRoot,
      noteCount: 0
    }
    const slugs = await this.resolveSlugs()
    if (slugs.length === 0) return base

    let count = 0
    for (const slug of slugs) {
      count += (await this.noteFiles(slug)).length
    }
    return { ...base, available: count > 0, noteCount: count }
  }

  async list(): Promise<MemoryNote[]> {
    const slugs = await this.resolveSlugs()
    const notes: MemoryNote[] = []
    for (const slug of slugs) {
      const files = await this.noteFiles(slug)
      for (const filename of files) {
        try {
          const md = await fs.promises.readFile(
            path.join(this.memoryDir(slug), filename),
            'utf-8'
          )
          const note = parseNativeNote(md, slug, filename)
          // List view omits body.
          delete note.body
          notes.push(note)
        } catch {
          // unreadable note; skip
        }
      }
    }
    return notes
  }

  async read(localId: string): Promise<MemoryNote | null> {
    // localId is `<slug>/<filename>`.
    const slash = localId.indexOf('/')
    if (slash < 0) return null
    const slug = localId.slice(0, slash)
    const filename = localId.slice(slash + 1)
    try {
      const md = await fs.promises.readFile(
        path.join(this.memoryDir(slug), filename),
        'utf-8'
      )
      return parseNativeNote(md, slug, filename)
    } catch {
      return null
    }
  }
}
