import { describe, it, expect } from 'vitest'
import {
  parseNativeNote,
  parseMemoryIndex
} from '../../src/main/memory/sources/claude-native'

// Mirrors the real ~/.claude/projects/<slug>/memory/MEMORY.md format:
// `- [link](file.md) — hook` with an em-dash separator. Sections also contain
// plain prose bullets (no markdown link) that are NOT index entries and must
// be skipped by the parser.
const MEMORY_MD = `# Memory Index

## Remote Devices
- [macmini.md](macmini.md) — SSH remote operations for macmini (macOS)
- [tv-vigil.md](tv-vigil.md) — Android TV 后台应用守夜人

## Home Network
- [network.md](network.md) — 家庭局域网拓扑、静态 IP 分配、设备清单
- 架构: Internet → UniFi Router (.1) → Mac mini/Surge (.250) → 代理设备
- Mac mini 是网络核心: Surge 透明代理 + DHCP + DNS

## Projects
- united-memory: 自己维护的私有 Claude Code 插件项目 (无链接, 纯说明)
`

const SLUG = 'C--Users-mail'

describe('parseMemoryIndex', () => {
  it('extracts linked index entries and skips plain prose bullets', () => {
    const entries = parseMemoryIndex(MEMORY_MD)
    // Only the 3 lines with a [text](file.md) link are entries; the prose
    // bullets ("架构:", "Mac mini 是…", "united-memory: …") are excluded.
    expect(entries).toHaveLength(3)
    expect(entries[0]).toEqual({
      title: 'macmini.md',
      file: 'macmini.md',
      hook: 'SSH remote operations for macmini (macOS)'
    })
    expect(entries[1].file).toBe('tv-vigil.md')
    expect(entries[2].file).toBe('network.md')
    expect(entries[2].hook).toBe('家庭局域网拓扑、静态 IP 分配、设备清单')
  })

  it('also parses a plain-hyphen separator entry', () => {
    const md = '- [Title Here](note.md) - a hyphen hook'
    expect(parseMemoryIndex(md)).toEqual([
      { title: 'Title Here', file: 'note.md', hook: 'a hyphen hook' }
    ])
  })

  it('returns [] for an index with no entries', () => {
    expect(parseMemoryIndex('# Memory Index\n\nNothing here yet.')).toEqual([])
  })
})

describe('parseNativeNote', () => {
  const PROJECT_NOTE = `---
name: Mac Mini Remote Operations
description: SSH access, services, hardware specs for remote Mac Mini management
metadata:
  type: project
  created: 2026-05-13T07:10:39.769Z
  updated: 2026-05-13T07:10:39.769Z
---

# Mac Mini Remote Operations

SSH access via \`ssh macmini\`. Runs Surge proxy, UTM HomeAssistant VM.
`

  const FEEDBACK_NOTE = `---
name: 'User Feedback: ESP Harness First'
description: prefers harness-first approach for ESP32
metadata:
  type: feedback
---

Body content here.
`

  it('maps name/description/metadata.type with scope, importance and stable id', () => {
    const note = parseNativeNote(PROJECT_NOTE, SLUG, 'macmini.md')
    expect(note.id).toBe('claude-native:C--Users-mail/macmini.md')
    expect(note.sourceId).toBe('claude-native')
    expect(note.sourceLabel).toBe('Claude Code')
    expect(note.title).toBe('Mac Mini Remote Operations')
    expect(note.summary).toBe(
      'SSH access, services, hardware specs for remote Mac Mini management'
    )
    expect(note.tags).toEqual(['project'])
    expect(note.importance).toBe('active')
    expect(note.scope).toBe(SLUG)
    expect(note.path).toBe('macmini.md')
    expect(note.createdAt).toBe('2026-05-13T07:10:39.769Z')
    expect(note.updatedAt).toBe('2026-05-13T07:10:39.769Z')
    expect(note.body).toContain('SSH access via')
  })

  it('maps a different metadata.type to its tag', () => {
    const note = parseNativeNote(FEEDBACK_NOTE, SLUG, 'feedback_esp-harness-first.md')
    expect(note.tags).toEqual(['feedback'])
    expect(note.title).toBe('User Feedback: ESP Harness First')
    expect(note.summary).toBe('prefers harness-first approach for ESP32')
  })

  it('falls back to filename when name is missing', () => {
    const md = `---
description: No name here.
metadata:
  type: reference
---

Some reference content.`
    const note = parseNativeNote(md, SLUG, 'reference-note.md')
    expect(note.title).toBe('reference-note.md')
    expect(note.tags).toEqual(['reference'])
  })

  it('produces no tags when metadata.type is absent', () => {
    const md = `---
name: Bare note
---

content`
    const note = parseNativeNote(md, SLUG, 'bare.md')
    expect(note.tags).toEqual([])
    expect(note.title).toBe('Bare note')
  })
})
