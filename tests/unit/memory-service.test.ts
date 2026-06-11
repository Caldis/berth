import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { listMemory, readMemory } from '../../src/main/memory'
import { UnitedMemorySource } from '../../src/main/memory/sources/united-memory'
import { ClaudeNativeSource } from '../../src/main/memory/sources/claude-native'
import type { MemoryNote } from '@shared/types/memory'
import type { MemorySource } from '../../src/main/memory/types'

// ── Source classes against a real temp dir (covers fs + absolute-path resolution) ──

let tmp: string
let umRoot: string
let projectsRoot: string
const SLUG = 'C--Users-test'

beforeAll(async () => {
  tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'berth-mem-'))
  umRoot = path.join(tmp, '.united-memory')
  projectsRoot = path.join(tmp, 'projects')

  // united-memory fixture
  await fs.promises.mkdir(path.join(umRoot, 'mem'), { recursive: true })
  await fs.promises.writeFile(
    path.join(umRoot, 'index.json'),
    JSON.stringify({
      version: 1,
      entries: [
        {
          id: 'note-a',
          file: 'mem/note-a.md',
          title: 'Note A',
          tags: ['t1'],
          links: ['note-b'],
          importance: 'core',
          summary: 'summary a',
          created: '2026-01-01',
          updated: '2026-05-01'
        }
      ]
    }),
    'utf-8'
  )
  await fs.promises.writeFile(
    path.join(umRoot, 'mem', 'note-a.md'),
    `---\nid: note-a\ntitle: Note A\ntags: [t1]\nlinks: [note-b]\nimportance: core\n---\n\n# Note A\n\n## TL;DR\n\nsummary a\n\n## Body\n\nfull body text with [[note-b]] and [[note-c]]\n`,
    'utf-8'
  )
  await fs.promises.writeFile(
    path.join(umRoot, 'outside.md'),
    `---\ntitle: Outside\n---\n\n# Outside\n\nshould not be reachable\n`,
    'utf-8'
  )

  // claude-native fixture
  const memDir = path.join(projectsRoot, SLUG, 'memory')
  await fs.promises.mkdir(memDir, { recursive: true })
  await fs.promises.writeFile(path.join(memDir, 'MEMORY.md'), '# Memory Index\n\n- [Foo Note](foo.md) — a note\n', 'utf-8')
  await fs.promises.writeFile(
    path.join(memDir, 'foo.md'),
    `---\nname: Foo Note\ndescription: foo desc\nmetadata:\n  type: project\n  created: 2026-05-13T07:10:39.769Z\n  updated: 2026-05-14T07:10:39.769Z\n---\n\n# Foo Note\n\nfoo body\n`,
    'utf-8'
  )
  await fs.promises.writeFile(
    path.join(projectsRoot, SLUG, 'outside.md'),
    `---\nname: Outside\n---\n\nshould not be reachable\n`,
    'utf-8'
  )
})

afterAll(async () => {
  await fs.promises.rm(tmp, { recursive: true, force: true })
})

describe('UnitedMemorySource (temp dir)', () => {
  it('detects availability and counts notes from index.json', async () => {
    const status = await new UnitedMemorySource(umRoot).detect()
    expect(status.available).toBe(true)
    expect(status.noteCount).toBe(1)
    expect(status.rootPath).toBe(umRoot)
  })

  it('list() returns ABSOLUTE paths (regression guard for Show-in-Explorer)', async () => {
    const notes = await new UnitedMemorySource(umRoot).list()
    expect(notes).toHaveLength(1)
    expect(path.isAbsolute(notes[0].path)).toBe(true)
    expect(notes[0].path).toBe(path.join(umRoot, 'mem', 'note-a.md'))
  })

  it('read() returns body + absolute path', async () => {
    const note = await new UnitedMemorySource(umRoot).read('note-a')
    expect(note).not.toBeNull()
    expect(note!.body).toContain('full body text')
    expect(path.isAbsolute(note!.path)).toBe(true)
  })

  it('read() merges frontmatter links with body wiki links', async () => {
    const note = await new UnitedMemorySource(umRoot).read('note-a')
    expect(note?.links).toEqual(['note-b', 'note-c'])
  })

  it('read() rejects local ids that would escape the mem directory', async () => {
    const source = new UnitedMemorySource(umRoot)
    await expect(source.read('../outside')).resolves.toBeNull()
    await expect(source.read('..\\outside')).resolves.toBeNull()
    await expect(source.read('nested/note-a')).resolves.toBeNull()
  })

  it('marks indexed notes whose files are missing', async () => {
    const root = path.join(tmp, '.united-memory-missing')
    await fs.promises.mkdir(path.join(root, 'mem'), { recursive: true })
    await fs.promises.writeFile(
      path.join(root, 'index.json'),
      JSON.stringify({
        entries: [
          {
            id: 'missing-note',
            file: 'mem/missing-note.md',
            title: 'Missing note'
          }
        ]
      }),
      'utf-8'
    )

    const notes = await new UnitedMemorySource(root).list()
    expect(notes).toHaveLength(1)
    expect(notes[0].missing).toBe(true)
  })

  it('reuses the parsed index between detect() and list() on one source instance', async () => {
    const source = new UnitedMemorySource(umRoot)
    const readFile = vi.spyOn(fs.promises, 'readFile')
    try {
      await source.detect()
      await source.list()
      const indexReads = readFile.mock.calls.filter(([target]) => String(target) === path.join(umRoot, 'index.json'))
      expect(indexReads).toHaveLength(1)
    } finally {
      readFile.mockRestore()
    }
  })

  it('detect() reports unavailable when the root is missing', async () => {
    const status = await new UnitedMemorySource(path.join(tmp, 'nope')).detect()
    expect(status.available).toBe(false)
    expect(status.noteCount).toBe(0)
  })
})

describe('ClaudeNativeSource (temp dir)', () => {
  it('list() returns absolute paths and maps frontmatter', async () => {
    const notes = await new ClaudeNativeSource(SLUG, projectsRoot).list()
    expect(notes).toHaveLength(1)
    expect(notes[0].title).toBe('Foo Note')
    expect(notes[0].summary).toBe('a note')
    expect(notes[0].scope).toBe(SLUG)
    expect(path.isAbsolute(notes[0].path)).toBe(true)
    expect(notes[0].path).toBe(path.join(projectsRoot, SLUG, 'memory', 'foo.md'))
  })

  it('read() returns body + absolute path', async () => {
    const note = await new ClaudeNativeSource(SLUG, projectsRoot).read(`${SLUG}/foo.md`)
    expect(note).not.toBeNull()
    expect(note!.body).toContain('foo body')
    expect(path.isAbsolute(note!.path)).toBe(true)
    expect(note!.createdAt).toBe('2026-05-13T07:10:39.769Z')
    expect(note!.updatedAt).toBe('2026-05-14T07:10:39.769Z')
  })

  it('read() rejects local ids outside the native note filename shape', async () => {
    const source = new ClaudeNativeSource(SLUG, projectsRoot)
    await expect(source.read(`${SLUG}/../outside.md`)).resolves.toBeNull()
    await expect(source.read(`../${SLUG}/foo.md`)).resolves.toBeNull()
    await expect(source.read(`${SLUG}/nested/foo.md`)).resolves.toBeNull()
    await expect(source.read(`${SLUG}/MEMORY.md`)).resolves.toBeNull()
    await expect(source.read(`${SLUG}/foo.txt`)).resolves.toBeNull()
  })

  it('list() uses MEMORY.md index entries and keeps missing files visible', async () => {
    const slug = 'C--Users-missing'
    const memDir = path.join(projectsRoot, slug, 'memory')
    await fs.promises.mkdir(memDir, { recursive: true })
    await fs.promises.writeFile(path.join(memDir, 'MEMORY.md'), '# Memory Index\n\n- [Missing](missing.md) — listed but absent\n', 'utf-8')

    const notes = await new ClaudeNativeSource(slug, projectsRoot).list()
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({
      id: `claude-native:${slug}/missing.md`,
      title: 'Missing',
      summary: 'listed but absent',
      missing: true
    })

    const status = await new ClaudeNativeSource(slug, projectsRoot).detect()
    expect(status.available).toBe(true)
    expect(status.noteCount).toBe(1)
  })
})

// ── Aggregation / routing with injected fakes ──

function fakeSource(id: string, notes: MemoryNote[], opts: { available?: boolean; throws?: boolean } = {}): MemorySource {
  const { available = true, throws = false } = opts
  return {
    id,
    label: id,
    detect: async () => ({ id, label: id, available, rootPath: `/${id}`, noteCount: notes.length }),
    list: async () => {
      if (throws) throw new Error('boom')
      return notes
    },
    read: async (localId) => notes.find((n) => n.id === `${id}:${localId}`) ?? null
  }
}

function makeNote(id: string, sourceId: string): MemoryNote {
  return {
    id: `${sourceId}:${id}`,
    sourceId,
    sourceLabel: sourceId,
    title: id,
    tags: [],
    importance: 'active',
    path: `/${sourceId}/${id}.md`,
    links: [],
    createdAt: null,
    updatedAt: null
  }
}

describe('listMemory aggregation', () => {
  it('flattens notes across sources and includes every source status', async () => {
    const a = fakeSource('a', [makeNote('1', 'a'), makeNote('2', 'a')])
    const b = fakeSource('b', [makeNote('1', 'b')])
    const result = await listMemory(undefined, [a, b])
    expect(result.notes).toHaveLength(3)
    expect(result.sources.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('includes unavailable sources with no notes', async () => {
    const a = fakeSource('a', [makeNote('1', 'a')], { available: false })
    const result = await listMemory(undefined, [a])
    expect(result.notes).toHaveLength(0)
    expect(result.sources[0].available).toBe(false)
  })

  it('captures a source that throws during list() as unavailable + error', async () => {
    const a = fakeSource('a', [makeNote('1', 'a')], { throws: true })
    const result = await listMemory(undefined, [a])
    expect(result.notes).toHaveLength(0)
    expect(result.sources[0].available).toBe(false)
    expect(result.sources[0].error).toContain('boom')
  })
})

describe('readMemory routing', () => {
  const a = fakeSource('a', [makeNote('1', 'a')])
  const b = fakeSource('b', [makeNote('9', 'b')])

  it('routes by the prefix before the first colon', async () => {
    const note = await readMemory('a:1', undefined, [a, b])
    expect(note?.id).toBe('a:1')
  })

  it('returns null for an unknown source', async () => {
    expect(await readMemory('zzz:1', undefined, [a, b])).toBeNull()
  })

  it('returns null when the id has no colon', async () => {
    expect(await readMemory('nocolon', undefined, [a, b])).toBeNull()
  })

  it('preserves colons in the local id', async () => {
    const c = fakeSource('claude-native', [makeNote('slug/with:colon', 'claude-native')])
    const note = await readMemory('claude-native:slug/with:colon', undefined, [c])
    expect(note?.id).toBe('claude-native:slug/with:colon')
  })
})
