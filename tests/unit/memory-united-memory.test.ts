import { describe, it, expect } from 'vitest'
import {
  parseUnitedIndex,
  parseUnitedNote
} from '../../src/main/memory/sources/united-memory'

// Small index.json with 3 entries spanning core / active / archive importance.
// Note: there is NO entry for `20260317-orphan.md.md` (a malformed file that
// exists on disk in real united-memory installs) — proving that parsing the
// index, not globbing mem/, excludes malformed/non-indexed files.
const INDEX_JSON = JSON.stringify({
  version: 1,
  entries: [
    {
      id: '20250701-macmini-remote-ops',
      file: 'mem/20250701-macmini-remote-ops.md',
      title: 'Mac Mini 远程操作指南',
      tags: ['ssh', 'remote', 'macos'],
      links: ['20250715-home-network', '20250701-windows-ssh-env'],
      importance: 'core',
      summary: 'SSH 远程操作 Mac Mini',
      created: '2025-07-01',
      updated: '2026-03-21'
    },
    {
      id: '20250219-united-memory-project',
      file: 'mem/20250219-united-memory-project.md',
      title: 'United Memory 项目架构与使用',
      tags: ['united-memory', 'skill'],
      links: [],
      importance: 'active',
      summary: 'United Memory 项目架构与使用',
      created: '2026-02-19',
      updated: '2026-02-19'
    },
    {
      id: '20250101-legacy-note',
      file: 'mem/20250101-legacy-note.md',
      title: '归档笔记',
      tags: ['legacy'],
      links: [],
      importance: 'archive',
      summary: '旧的归档内容',
      created: '2025-01-01',
      updated: '2025-01-01'
    }
  ]
})

describe('parseUnitedIndex', () => {
  it('maps index entries to MemoryNote[] with stable global ids', () => {
    const notes = parseUnitedIndex(INDEX_JSON)
    expect(notes).toHaveLength(3)

    const first = notes[0]
    expect(first.id).toBe('united-memory:20250701-macmini-remote-ops')
    expect(first.sourceId).toBe('united-memory')
    expect(first.sourceLabel).toBe('United Memory')
    expect(first.title).toBe('Mac Mini 远程操作指南')
    expect(first.summary).toBe('SSH 远程操作 Mac Mini')
    expect(first.tags).toEqual(['ssh', 'remote', 'macos'])
    expect(first.importance).toBe('core')
    expect(first.links).toEqual([
      '20250715-home-network',
      '20250701-windows-ssh-env'
    ])
    expect(first.path).toBe('mem/20250701-macmini-remote-ops.md')
    expect(first.createdAt).toBe('2025-07-01')
    expect(first.updatedAt).toBe('2026-03-21')
  })

  it('maps importance across core / active / archive', () => {
    const notes = parseUnitedIndex(INDEX_JSON)
    expect(notes.map((n) => n.importance)).toEqual(['core', 'active', 'archive'])
  })

  it('derives notes only from index entries, excluding malformed/non-indexed files', () => {
    // The index has exactly 3 entries; a malformed disk file like
    // `20260317-orphan.md.md` is never indexed, so it can never appear.
    const ids = parseUnitedIndex(INDEX_JSON).map((n) => n.id)
    expect(ids).toHaveLength(3)
    expect(ids).not.toContain('united-memory:20260317-orphan.md.md')
    expect(ids).not.toContain('united-memory:20260317-orphan')
  })

  it('coerces unknown/missing importance to "unknown" and tolerates missing arrays/dates', () => {
    const json = JSON.stringify({
      version: 1,
      entries: [{ id: 'bare', title: 'Bare entry' }]
    })
    const notes = parseUnitedIndex(json)
    expect(notes).toHaveLength(1)
    expect(notes[0].importance).toBe('unknown')
    expect(notes[0].tags).toEqual([])
    expect(notes[0].links).toEqual([])
    expect(notes[0].createdAt).toBeNull()
    expect(notes[0].updatedAt).toBeNull()
    // path falls back to mem/<id>.md when `file` is absent
    expect(notes[0].path).toBe('mem/bare.md')
  })

  it('returns [] for malformed JSON or missing entries instead of throwing', () => {
    expect(parseUnitedIndex('{ not valid json')).toEqual([])
    expect(parseUnitedIndex('{}')).toEqual([])
    expect(parseUnitedIndex('[]')).toEqual([])
  })
})

describe('parseUnitedNote', () => {
  const NOTE_MD = `---
id: 20260317-default-branch-master
title: 默认分支统一为 master
tags:
  - git
  - convention
  - workflow
links: []
importance: core
created: 2026-03-17
updated: 2026-03-17
---

# 默认分支统一为 master

## TL;DR

所有新仓库默认分支统一用 \`master\`（非 \`main\`）。已有仓库保持现状。

## 背景

用户在多个项目中明确表达偏好使用 \`master\` 作为默认分支名。
`

  it('parses frontmatter into a MemoryNote and extracts TL;DR as summary', () => {
    const note = parseUnitedNote(NOTE_MD, '20260317-default-branch-master')
    expect(note.id).toBe('united-memory:20260317-default-branch-master')
    expect(note.sourceId).toBe('united-memory')
    expect(note.sourceLabel).toBe('United Memory')
    expect(note.title).toBe('默认分支统一为 master')
    expect(note.importance).toBe('core')
    expect(note.tags).toEqual(['git', 'convention', 'workflow'])
    expect(note.links).toEqual([])
    expect(note.summary).toBe(
      '所有新仓库默认分支统一用 `master`（非 `main`）。已有仓库保持现状。'
    )
    expect(note.path).toBe('mem/20260317-default-branch-master.md')
    expect(note.createdAt).toBe('2026-03-17')
    expect(note.updatedAt).toBe('2026-03-17')
  })

  it('keeps the full markdown content (minus frontmatter) as body', () => {
    const note = parseUnitedNote(NOTE_MD, '20260317-default-branch-master')
    expect(note.body).toContain('## TL;DR')
    expect(note.body).toContain('## 背景')
    expect(note.body).not.toContain('importance: core') // frontmatter stripped
  })

  it('falls back to h1 then localId when frontmatter title is missing', () => {
    const md = `---
tags: []
---

# Heading As Title

Body text.`
    expect(parseUnitedNote(md, 'x').title).toBe('Heading As Title')

    const noHeading = `---
tags: []
---

Body without heading.`
    const note = parseUnitedNote(noHeading, 'fallback-id')
    expect(note.title).toBe('fallback-id')
    expect(note.summary).toBeUndefined()
  })

  it('bounds the TL;DR section at the next heading', () => {
    const md = `---
title: T
---

## TL;DR

Line one of summary.
Line two of summary.

## Details

Should not be in summary.`
    const note = parseUnitedNote(md, 'x')
    expect(note.summary).toBe('Line one of summary.\nLine two of summary.')
    expect(note.summary).not.toContain('Should not be in summary.')
  })
})
