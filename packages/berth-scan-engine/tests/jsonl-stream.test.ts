import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  iterateJsonlLines,
  iterateJsonlLinesWithIndex
} from '../src/adapters/_shared/jsonl-stream'

// GH-148: the streaming iterator must be BYTE-FOR-BYTE equivalent to the old
// `readFileSync(path,'utf-8').split(/\r?\n/)` it replaces. Every assertion below
// compares the iterator output to the canonical split of the same bytes, because
// `split(/\r?\n/)` is the contract the 6 read points (and their golden tests)
// depend on. The empty-line / lineIndex behaviour is load-bearing: replay event
// ids `L{index}B{n}` use the line index, so an off-by-one desync corrupts the
// per-line raw-payload lookup.

let tempDir: string | null = null

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

function write(bytes: Buffer | string, name = 'data.jsonl'): string {
  tempDir ??= fs.mkdtempSync(path.join(os.tmpdir(), 'berth-jsonl-stream-'))
  const filePath = path.join(tempDir, name)
  fs.writeFileSync(filePath, bytes)
  return filePath
}

/** The exact legacy behaviour the iterator replaces. */
function legacySplit(bytes: Buffer): string[] {
  return bytes.toString('utf-8').split(/\r?\n/)
}

function streamLines(filePath: string): string[] {
  return Array.from(iterateJsonlLines(filePath))
}

function assertMatchesSplit(bytes: Buffer, name?: string): void {
  const filePath = write(bytes, name)
  const expected = legacySplit(bytes)
  const actual = streamLines(filePath)
  expect(actual).toEqual(expected)

  // lineIndex variant must enumerate the same lines with 0-based contiguous
  // indices (empty lines included) — i.e. equivalent to expected.entries().
  const indexed = Array.from(iterateJsonlLinesWithIndex(filePath))
  expect(indexed.map((e) => e.line)).toEqual(expected)
  expect(indexed.map((e) => e.index)).toEqual(expected.map((_, i) => i))
}

describe('iterateJsonlLines — byte-for-byte equivalence to split(/\\r?\\n/)', () => {
  it('handles all line-ending and empty variants', () => {
    const cases: Record<string, string> = {
      empty: '',
      onlyNewline: '\n',
      twoNewlines: '\n\n',
      noTrailing: 'a\nb',
      trailing: 'a\nb\n',
      crlf: 'a\r\nb\r\n',
      loneCR: 'a\rb\n',
      crThenCRLF: 'a\r\r\nb',
      trailingCRLF: 'a\r\n',
      trailingCRonly: 'a\r',
      consecutiveBlank: 'a\n\n\nb',
      crlfMixedNoTrail: 'x\r\ny\nz',
      blankThenContent: '\n\n{"a":1}\n'
    }
    for (const [name, text] of Object.entries(cases)) {
      assertMatchesSplit(Buffer.from(text, 'utf-8'), `${name}.jsonl`)
    }
  })

  it('empty file yields exactly one empty line at index 0 (matches "".split)', () => {
    const filePath = write('')
    expect(streamLines(filePath)).toEqual([''])
    expect(Array.from(iterateJsonlLinesWithIndex(filePath))).toEqual([{ index: 0, line: '' }])
  })

  it('lineIndex keeps empty lines occupying a slot (replay id alignment)', () => {
    // Two blank lines, then content on line index 2 — the index of the content
    // line MUST be 2, never collapsed to 0.
    const filePath = write('\n\n{"type":"user"}\n')
    const indexed = Array.from(iterateJsonlLinesWithIndex(filePath))
    expect(indexed).toEqual([
      { index: 0, line: '' },
      { index: 1, line: '' },
      { index: 2, line: '{"type":"user"}' },
      { index: 3, line: '' }
    ])
    // Cross-check against split: indexing into split[2] gives the same raw line
    // (this is exactly what readSessionReplayEventPayload does).
    expect('\n\n{"type":"user"}\n'.split(/\r?\n/)[2]).toBe(indexed[2].line)
  })

  it('stitches a single line longer than the 64KB chunk', () => {
    // One JSON line whose length far exceeds CHUNK_SIZE (64KB) forces the line to
    // span multiple readSync chunks; the iterator must reassemble it intact.
    const big = 'x'.repeat(200_000)
    const obj = JSON.stringify({ type: 'assistant', big })
    const bytes = Buffer.from(`${obj}\n{"type":"user"}\n`, 'utf-8')
    assertMatchesSplit(bytes, 'big.jsonl')
    // And the reassembled first line is valid JSON of the original size.
    const lines = streamLines(write(bytes, 'big2.jsonl'))
    expect(JSON.parse(lines[0]).big.length).toBe(200_000)
  })

  it('does not corrupt a UTF-8 multibyte char split across a chunk boundary', () => {
    // Build a line so that a 4-byte emoji straddles the 64KB boundary: pad with
    // single-byte ASCII up to (CHUNK_SIZE - 2) bytes, then the emoji — its bytes
    // land at offsets 65534..65537, i.e. 2 bytes in chunk #1, 2 bytes in chunk #2.
    const CHUNK = 64 * 1024
    const pad = 'a'.repeat(CHUNK - 2)
    const emoji = '😀' // U+1F600, 4 UTF-8 bytes
    const text = `${pad}${emoji}TAIL`
    const bytes = Buffer.from(`${text}\n`, 'utf-8')
    // Sanity: the emoji really straddles the boundary.
    expect(Buffer.byteLength(pad, 'utf-8')).toBe(CHUNK - 2)

    const filePath = write(bytes, 'utf8-boundary.jsonl')
    const lines = streamLines(filePath)
    expect(lines).toEqual(bytes.toString('utf-8').split(/\r?\n/))
    expect(lines[0]).toBe(text)
    expect(lines[0]).not.toContain('�') // no replacement char
    expect(lines[0].endsWith(`${emoji}TAIL`)).toBe(true)
  })

  it('handles a multibyte char split exactly on the chunk boundary (3-byte CJK)', () => {
    const CHUNK = 64 * 1024
    // 3-byte char (中, U+4E2D); place it so 1 byte is in chunk #1, 2 in chunk #2.
    const pad = 'a'.repeat(CHUNK - 1)
    const text = `${pad}中尾`
    const bytes = Buffer.from(`${text}\n`, 'utf-8')
    const filePath = write(bytes, 'cjk-boundary.jsonl')
    const lines = streamLines(filePath)
    expect(lines).toEqual(bytes.toString('utf-8').split(/\r?\n/))
    expect(lines[0]).not.toContain('�')
  })

  it('handles CRLF spanning a chunk boundary (\\r ends chunk, \\n starts next)', () => {
    const CHUNK = 64 * 1024
    // Make \r the last byte of chunk #1 and \n the first byte of chunk #2.
    const pad = 'a'.repeat(CHUNK - 1)
    const bytes = Buffer.from(`${pad}\r\nNEXT\n`, 'utf-8')
    const filePath = write(bytes, 'crlf-boundary.jsonl')
    expect(streamLines(filePath)).toEqual(bytes.toString('utf-8').split(/\r?\n/))
  })

  it('matches split on a randomized adversarial corpus (fuzz)', () => {
    // Deterministic PRNG so failures reproduce.
    let seed = 0x9e3779b9
    const rand = (): number => {
      seed ^= seed << 13
      seed ^= seed >>> 17
      seed ^= seed << 5
      return ((seed >>> 0) % 1000) / 1000
    }
    const alphabet = ['a', 'b', '{', '}', '"', ':', '1', ' ', '\t', '中', '😀', '\r', '\n', '\r\n']
    for (let t = 0; t < 200; t++) {
      let s = ''
      const len = Math.floor(rand() * 80)
      for (let i = 0; i < len; i++) {
        s += alphabet[Math.floor(rand() * alphabet.length)]
      }
      const bytes = Buffer.from(s, 'utf-8')
      const filePath = write(bytes, `fuzz-${t}.jsonl`)
      expect(streamLines(filePath)).toEqual(bytes.toString('utf-8').split(/\r?\n/))
      fs.rmSync(filePath)
    }
  })

  it('throws on a missing file (caller owns the try/catch)', () => {
    const missing = path.join(os.tmpdir(), 'berth-jsonl-stream-none', 'nope.jsonl')
    expect(() => streamLines(missing)).toThrow()
  })
})
