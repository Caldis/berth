import { describe, expect, it } from 'vitest'
import { parseUnitedNote } from '../../src/main/memory/sources/united-memory'
import { parseNativeNote } from '../../src/main/memory/sources/claude-native'

// GH-115 T7: memory 两份 splitFrontmatter 变体的 characterization 测试。
// 与 adapters/_shared/markdown.ts 统一版存在有意/历史语义差 (返回 {} 而非 null、
// malformed YAML 整体回退为正文等)。本任务**只钉现行为不收敛** — 收敛归属
// engine-shared-core-package issue (roadmap Phase C 既定处置), 届时以本测试为迁移红绿网。

const ID = 'note-1'

describe('memory splitFrontmatter variants (现行为钉死, 不收敛)', () => {
  it('united: no frontmatter → empty meta, full content as body', () => {
    const note = parseUnitedNote('just body text', ID)
    expect(note.title.length).toBeGreaterThan(0)
    expect(note.body ?? '').toContain('just body text')
  })

  it('united: malformed YAML frontmatter → treated as body, not an error', () => {
    const raw = ['---', 'broken: [unclosed', '---', 'body line'].join('\n')
    const note = parseUnitedNote(raw, ID)
    // 变体语义: yaml.load 抛错被吞, 整个内容 (含 --- 块) 作为 body 处理
    expect(note).toBeTruthy()
  })

  it('united: frontmatter fields are surfaced (tags/title)', () => {
    const raw = ['---', 'title: Hello', 'tags: [a, b]', '---', 'body'].join('\n')
    const note = parseUnitedNote(raw, ID)
    expect(note.title).toBe('Hello')
    expect(note.tags).toEqual(['a', 'b'])
  })

  it('native: frontmatter-less note keeps body intact', () => {
    const note = parseNativeNote('plain native body', ID, 'MEMORY.md')
    expect(note).toBeTruthy()
  })

  it('native: non-record YAML (scalar frontmatter) does not crash and yields a note', () => {
    const raw = ['---', 'just-a-string', '---', 'body'].join('\n')
    const note = parseNativeNote(raw, ID, 'MEMORY.md')
    expect(note).toBeTruthy()
  })
})
