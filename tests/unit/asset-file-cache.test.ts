import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssetFileCache, fingerprintFile } from '@berth/scan-engine/engine/assets/file-cache'

let tempDir: string | null = null

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

function tempFile(name = 'session.jsonl'): string {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-file-cache-'))
  const filePath = path.join(tempDir, name)
  fs.writeFileSync(filePath, '{"type":"session_meta"}\n')
  return filePath
}

describe('AssetFileCache', () => {
  it('returns a hit when the file fingerprint is unchanged', () => {
    const filePath = tempFile()
    const cache = new AssetFileCache<{ id: string }>()
    const parse = vi.fn(() => ({ id: 'session-1' }))

    expect(cache.read(filePath, parse)).toMatchObject({ status: 'miss', value: { id: 'session-1' } })
    expect(cache.read(filePath, parse)).toMatchObject({ status: 'hit', value: { id: 'session-1' } })
    expect(parse).toHaveBeenCalledTimes(1)
  })

  it('invalidates the cached value when size or mtime changes', () => {
    const filePath = tempFile()
    const cache = new AssetFileCache<{ id: string }>()
    const parse = vi.fn()
      .mockReturnValueOnce({ id: 'session-1' })
      .mockReturnValueOnce({ id: 'session-2' })

    cache.getOrParse(filePath, parse)
    fs.appendFileSync(filePath, '{"type":"event_msg"}\n')
    fs.utimesSync(filePath, new Date('2026-06-03T00:00:00.000Z'), new Date('2026-06-03T00:00:00.000Z'))

    expect(cache.read(filePath, parse)).toMatchObject({ status: 'miss', value: { id: 'session-2' } })
    expect(parse).toHaveBeenCalledTimes(2)
  })

  it('removes entries when files are deleted or pruned', () => {
    const filePath = tempFile()
    const cache = new AssetFileCache<{ id: string }>()
    cache.getOrParse(filePath, () => ({ id: 'session-1' }))

    fs.rmSync(filePath)

    expect(cache.read(filePath, () => ({ id: 'session-2' }))).toEqual({ status: 'deleted', path: filePath })

    const nextFile = tempFile('next.jsonl')
    cache.getOrParse(nextFile, () => ({ id: 'session-next' }))
    expect(cache.pruneTo([])).toEqual([nextFile])
    expect(cache.toSnapshot().entries).toEqual([])
  })

  it('does not keep stale cache entries after parser errors', () => {
    const filePath = tempFile()
    const cache = new AssetFileCache<{ id: string }>()
    cache.getOrParse(filePath, () => ({ id: 'session-1' }))
    fs.appendFileSync(filePath, '{"type":"broken"}\n')

    const result = cache.read(filePath, () => {
      throw new Error('parse failed')
    })

    expect(result).toMatchObject({ status: 'error', path: filePath })
    expect(() => cache.getOrParse(filePath, () => {
      throw new Error('parse failed again')
    })).toThrow('parse failed again')
  })

  it('restores entries from a snapshot without touching disk state', () => {
    const filePath = tempFile()
    const cache = new AssetFileCache<{ id: string }>()
    const fingerprint = fingerprintFile(filePath)
    expect(fingerprint).not.toBeNull()
    cache.getOrParse(filePath, () => ({ id: 'session-1' }))

    const restored = AssetFileCache.fromSnapshot(cache.toSnapshot())

    expect(restored.read(filePath, () => ({ id: 'session-2' }))).toMatchObject({
      status: 'hit',
      fingerprint,
      value: { id: 'session-1' }
    })
  })
})
