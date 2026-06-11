import { describe, it, expect } from 'vitest'
import { extractAtImports, splitFrontmatter } from '@berth/scan-engine/adapters/_shared/markdown'

// Pins the unified splitFrontmatter semantics after reconciling the two
// drifted adapter copies (claude-code regex variant vs codex indexOf variant).
// Each edge case below previously behaved differently between the two.
describe('splitFrontmatter (shared)', () => {
  it('parses record frontmatter and strips the fences from body', () => {
    const { frontmatter, body } = splitFrontmatter('---\nname: my-skill\ndescription: d\n---\n# Body')
    expect(frontmatter).toEqual({ name: 'my-skill', description: 'd' })
    expect(body).toBe('# Body')
  })

  it('body does not keep the newline after the closing fence (codex drift)', () => {
    const { body } = splitFrontmatter('---\nname: x\n---\nbody')
    expect(body).toBe('body')
  })

  it('handles CRLF line endings', () => {
    const { frontmatter, body } = splitFrontmatter('---\r\nname: x\r\n---\r\nbody')
    expect(frontmatter).toEqual({ name: 'x' })
    expect(body).toBe('body')
  })

  it('returns full content as body when there is no opening fence', () => {
    const raw = '# Just markdown\nno frontmatter'
    expect(splitFrontmatter(raw)).toEqual({ frontmatter: null, body: raw })
  })

  it('returns full content as body when the closing fence is missing', () => {
    const raw = '---\nname: x\nno closing fence'
    expect(splitFrontmatter(raw)).toEqual({ frontmatter: null, body: raw })
  })

  it('accepts a closing fence at end of file without trailing newline', () => {
    const { frontmatter, body } = splitFrontmatter('---\nname: x\n---')
    expect(frontmatter).toEqual({ name: 'x' })
    expect(body).toBe('')
  })

  it('treats empty frontmatter as null and still strips the fences', () => {
    const { frontmatter, body } = splitFrontmatter('---\n---\nbody')
    expect(frontmatter).toBeNull()
    expect(body).toBe('body')
  })

  it('treats non-record YAML (scalar) as null frontmatter (claude drift: leaked spread keys)', () => {
    const { frontmatter, body } = splitFrontmatter('---\njust a string\n---\nbody')
    expect(frontmatter).toBeNull()
    expect(body).toBe('body')
  })

  it('treats unparseable YAML as null frontmatter but still strips the fences', () => {
    const { frontmatter, body } = splitFrontmatter('---\n{ broken: [yaml\n---\nbody')
    expect(frontmatter).toBeNull()
    expect(body).toBe('body')
  })

  it('does not close the block on a fence with trailing characters', () => {
    const raw = '---\nname: x\n--- trailing\nbody'
    expect(splitFrontmatter(raw)).toEqual({ frontmatter: null, body: raw })
  })

  it('does not close the block on a horizontal rule of four dashes', () => {
    const { frontmatter, body } = splitFrontmatter('---\nname: x\nnote: y\n---\nafter\n----\nmore')
    expect(frontmatter).toEqual({ name: 'x', note: 'y' })
    expect(body).toBe('after\n----\nmore')
  })
})

describe('extractAtImports (shared)', () => {
  it('extracts @path references one per line', () => {
    expect(extractAtImports('@AGENTS.md\nplain line\n  @./docs/notes.md  ')).toEqual([
      'AGENTS.md',
      './docs/notes.md'
    ])
  })

  it('ignores mid-line mentions and bare @', () => {
    expect(extractAtImports('see @AGENTS.md inline\n@\n@ spaced')).toEqual([])
  })
})
