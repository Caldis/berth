import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseSessionMeta } from '../../src/main/adapters/claude-code/parsers'

// GH-111 O2: session parsing must not silently swallow malformed lines or read
// failures — both should be observable rather than looking like a clean session.
let dir: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-gh111-session-'))
})

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('parseSessionMeta observability', () => {
  it('counts malformed JSONL lines into meta.malformedLineCount', () => {
    const fp = path.join(dir, 'session.jsonl')
    fs.writeFileSync(
      fp,
      ['{"type":"summary","summary":"ok"}', '{ this is not json', '', 'also broken}'].join('\n')
    )
    const asset = parseSessionMeta(fp, 'my-project')
    expect(asset.meta.malformedLineCount).toBe(2)
  })

  it('does not set malformedLineCount when every line parses', () => {
    const fp = path.join(dir, 'clean.jsonl')
    fs.writeFileSync(fp, '{"type":"summary","summary":"ok"}\n')
    const asset = parseSessionMeta(fp, 'my-project')
    expect(asset.meta.malformedLineCount).toBeUndefined()
  })

  it('records parseError when the transcript cannot be read', () => {
    const asset = parseSessionMeta(path.join(dir, 'does-not-exist.jsonl'), 'my-project')
    expect(typeof asset.meta.parseError).toBe('string')
    // The session asset is still produced (the file existed at glob time).
    expect(asset.type).toBe('session')
  })
})
