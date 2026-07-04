import * as fs from 'fs'
import * as path from 'path'
import { resolveClaudeDirs } from '@berth/scan-engine/agent-homes'
import { isPathInside } from '@shared/path-utils'
import * as yaml from 'js-yaml'
import { isFileMissingError, logDomainFailureOnce } from '../../domain-log'
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

function asDateString(v: unknown): string | null {
  if (typeof v === 'string') return v
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const iso = v.toISOString()
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso
  }
  return null
}

function hasPathSeparator(value: string): boolean {
  return value.includes('/') || value.includes('\\')
}

function isSafePathSegment(value: string): boolean {
  return value.length > 0 && value !== '.' && value !== '..' && !hasPathSeparator(value) && path.basename(value) === value
}

function isSafeNoteFilename(value: string): boolean {
  return isSafePathSegment(value) && value.toLowerCase().endsWith('.md') && value.toLowerCase() !== INDEX_FILE.toLowerCase()
}

// GH-115 T7: 收敛到 @shared/path-utils.isPathInside (equal 算 inside, win32 折叠修复)
function isInsidePath(parent: string, candidate: string): boolean {
  return isPathInside(candidate, parent, { includeEqual: true })
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath)
    return true
  } catch {
    return false
  }
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
    createdAt: asDateString(metadata.created),
    updatedAt: asDateString(metadata.updated),
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
  private readonly projectsRoots: string[]
  private readonly projectFilter?: string

  /**
   * @param projectDir Optional project slug to restrict scanning to one project.
   * @param projectsRoot Override the projects root(s); 默认遍历 resolveClaudeDirs()
   *   (GH-115 T10b: BERTH_EXTRA_CLAUDE_DIRS 契约修复 — 此前只看主 home)。
   */
  constructor(projectDir?: string, projectsRoot?: string | string[]) {
    this.projectsRoots = projectsRoot
      ? Array.isArray(projectsRoot) ? projectsRoot : [projectsRoot]
      : resolveClaudeDirs().map((dir) => path.join(dir, 'projects'))
    this.projectFilter = projectDir
  }

  private memoryDir(root: string, slug: string): string {
    return path.join(root, slug, 'memory')
  }

  private notePath(root: string, slug: string, filename: string): string | null {
    if (!isSafePathSegment(slug) || !isSafeNoteFilename(filename)) return null
    const dir = this.memoryDir(root, slug)
    const filePath = path.resolve(dir, filename)
    return isInsidePath(dir, filePath) ? filePath : null
  }

  /** localId 保持 `slug/filename`; 多根下按根顺序首个命中 (同 slug 跨 home 冲突取主 home)。 */
  private parseLocalId(localId: string): { root: string; slug: string; filename: string } | null {
    const parts = localId.split('/')
    if (parts.length !== 2) return null
    const [slug, filename] = parts
    for (const root of this.projectsRoots) {
      if (this.notePath(root, slug, filename)) return { root, slug, filename }
    }
    return null
  }

  /** Resolve (root, slug) pairs whose memory/ dir exists, across all roots. */
  private async resolveSlugs(): Promise<{ root: string; slug: string }[]> {
    const pairs: { root: string; slug: string }[] = []
    for (const root of this.projectsRoots) {
      let candidates: string[]
      if (this.projectFilter) {
        candidates = [this.projectFilter]
      } else {
        try {
          const dirents = await fs.promises.readdir(root, { withFileTypes: true })
          candidates = dirents.filter((d) => d.isDirectory()).map((d) => d.name)
        } catch {
          continue
        }
      }
      for (const slug of candidates) {
        try {
          const stat = await fs.promises.stat(this.memoryDir(root, slug))
          if (stat.isDirectory()) pairs.push({ root, slug })
        } catch {
          // memory dir absent for this project; skip
        }
      }
    }
    return pairs
  }

  /** List note .md files (excluding the MEMORY.md index) in a memory dir. */
  private async noteFiles(root: string, slug: string): Promise<string[]> {
    try {
      const names = await fs.promises.readdir(this.memoryDir(root, slug))
      return names.filter(
        (n) => n.toLowerCase().endsWith('.md') && n !== INDEX_FILE
      )
    } catch {
      return []
    }
  }

  private async indexEntries(root: string, slug: string): Promise<NativeIndexEntry[] | null> {
    const indexPath = path.join(this.memoryDir(root, slug), INDEX_FILE)
    try {
      const md = await fs.promises.readFile(indexPath, 'utf-8')
      const entries = parseMemoryIndex(md)
      return entries.length > 0 ? entries : null
    } catch (err) {
      // No MEMORY.md is the normal un-indexed case; other read failures leave a
      // trace (GH-152 T4).
      if (!isFileMissingError(err)) logDomainFailureOnce('memory-native', indexPath, err)
      return null
    }
  }

  private async listFromIndex(root: string, slug: string): Promise<MemoryNote[] | null> {
    const entries = await this.indexEntries(root, slug)
    if (!entries) return null
    try {
      const notes = await Promise.all(entries.map(async (entry): Promise<MemoryNote | null> => {
        const filePath = this.notePath(root, slug, entry.file)
        if (!filePath) return null
        const exists = await fileExists(filePath)
        return {
          id: `${SOURCE_ID}:${slug}/${entry.file}`,
          sourceId: SOURCE_ID,
          sourceLabel: SOURCE_LABEL,
          title: entry.title,
          summary: entry.hook,
          tags: [],
          importance: 'active',
          scope: slug,
          path: filePath,
          links: [],
          createdAt: null,
          updatedAt: null,
          missing: exists ? undefined : true
        }
      }))
      return notes.filter((note): note is MemoryNote => note !== null)
    } catch (err) {
      // Unexpected — the per-entry work only stats/joins paths (GH-152 T4).
      logDomainFailureOnce('memory-native', this.memoryDir(root, slug), err)
      return null
    }
  }

  async detect(): Promise<MemorySourceStatus> {
    const base: MemorySourceStatus = {
      id: this.id,
      label: this.label,
      available: false,
      rootPath: this.projectsRoots[0],
      noteCount: 0
    }
    const slugs = await this.resolveSlugs()
    if (slugs.length === 0) return base

    let count = 0
    for (const { root, slug } of slugs) {
      const indexed = await this.indexEntries(root, slug)
      count += indexed ? indexed.length : (await this.noteFiles(root, slug)).length
    }
    return { ...base, available: count > 0, noteCount: count }
  }

  async list(): Promise<MemoryNote[]> {
    const slugs = await this.resolveSlugs()
    const notes: MemoryNote[] = []
    for (const { root, slug } of slugs) {
      const indexed = await this.listFromIndex(root, slug)
      if (indexed) {
        notes.push(...indexed)
        continue
      }
      const files = await this.noteFiles(root, slug)
      for (const filename of files) {
        const filePath = this.notePath(root, slug, filename)
        if (!filePath) continue
        try {
          const md = await fs.promises.readFile(filePath, 'utf-8')
          const note = parseNativeNote(md, slug, filename)
          // List view omits body; resolve the parser's bare filename to an
          // absolute path so "Show in Explorer" and the path label work.
          delete note.body
          note.path = filePath
          notes.push(note)
        } catch (err) {
          // unreadable note; skip — deleted-after-listing is normal, other
          // failures leave a trace (GH-152 T4)
          if (!isFileMissingError(err)) logDomainFailureOnce('memory-native', filePath, err)
        }
      }
    }
    return notes
  }

  async read(localId: string): Promise<MemoryNote | null> {
    const parsed = this.parseLocalId(localId)
    if (!parsed) return null
    const { root, slug, filename } = parsed
    const filePath = this.notePath(root, slug, filename)
    if (!filePath) return null
    try {
      const md = await fs.promises.readFile(filePath, 'utf-8')
      return { ...parseNativeNote(md, slug, filename), path: filePath }
    } catch (err) {
      if (!isFileMissingError(err)) logDomainFailureOnce('memory-native', filePath, err)
      return null
    }
  }
}
