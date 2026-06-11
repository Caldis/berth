import { describe, it, expect } from 'vitest'
import {
  extractPaths,
  parseMcpToolName,
  upsertFile
} from '@berth/scan-engine/adapters/_shared/session-artifacts'
import type { SessionArtifactFile } from '@shared/types/ipc'

describe('extractPaths (shared)', () => {
  it('collects strings under path-like keys, recursively and deduped', () => {
    const payload = {
      file_path: '/a.ts',
      nested: { absolutePath: '/b.ts', other: 'not-a-path' },
      edits: [{ path: '/a.ts' }, { path: '/c.ts' }]
    }
    expect(extractPaths(payload)).toEqual(['/a.ts', '/b.ts', '/c.ts'])
  })

  it('collects array values under plural keys (codex superset, unified for both adapters)', () => {
    expect(extractPaths({ files: ['/a.ts', '/b.ts'], paths: ['/c.ts'], file: '/d.ts' })).toEqual([
      '/a.ts',
      '/b.ts',
      '/c.ts',
      '/d.ts'
    ])
  })

  it('ignores blank values, non-path keys and non-record payloads', () => {
    expect(extractPaths({ path: '  ', command: '/looks/like/path' })).toEqual([])
    expect(extractPaths('bare string')).toEqual([])
    expect(extractPaths(null)).toEqual([])
  })
})

describe('parseMcpToolName (shared)', () => {
  it('parses mcp__server__tool names', () => {
    expect(parseMcpToolName('mcp__playwright__browser_click')).toEqual({
      server: 'playwright',
      tool: 'browser_click'
    })
  })

  it('keeps tool-internal separators intact', () => {
    expect(parseMcpToolName('mcp__a__b__c')).toEqual({ server: 'a', tool: 'b__c' })
  })

  it('rejects non-mcp names, missing separators and empty servers', () => {
    expect(parseMcpToolName('Read')).toBeUndefined()
    expect(parseMcpToolName('mcp__only-server')).toBeUndefined()
    expect(parseMcpToolName('mcp____tool')).toBeUndefined()
  })
})

describe('upsertFile (shared)', () => {
  it('creates an entry, bumps count on repeats, first operation wins', () => {
    const artifacts = { files: new Map<string, SessionArtifactFile>() }
    upsertFile(artifacts, '/a.ts')
    upsertFile(artifacts, '/a.ts', 'edit')
    upsertFile(artifacts, '/a.ts', 'write')
    const entry = artifacts.files.get('/a.ts')
    expect(entry?.count).toBe(3)
    expect(entry?.operation).toBe('edit')
    expect(entry?.id).toMatch(/^file-/)
  })

  it('skips blank paths', () => {
    const artifacts = { files: new Map<string, SessionArtifactFile>() }
    upsertFile(artifacts, '   ')
    expect(artifacts.files.size).toBe(0)
  })
})
