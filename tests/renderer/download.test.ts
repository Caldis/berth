import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadTextFile, sanitizeFilenamePart } from '@/lib/download'

// GH-120 AC7: 导出走 Blob + anchor[download] (Electron 默认弹系统保存对话框)。

describe('downloadTextFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('creates an object url, clicks a download anchor and revokes the url', () => {
    const createObjectURL = vi.fn(() => 'blob:berth-test')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadTextFile('berth-replay-test.json', '{"ok":true}')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement
    expect(anchor.download).toBe('berth-replay-test.json')
    expect(anchor.href).toContain('blob:berth-test')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:berth-test')
    // anchor 不残留在 DOM
    expect(document.querySelector('a[download]')).toBeNull()
  })
})

describe('sanitizeFilenamePart', () => {
  it('collapses separators, reserved chars and whitespace', () => {
    expect(sanitizeFilenamePart('a/b\\c:d*e?f"g<h>i|j k')).toBe('a-b-c-d-e-f-g-h-i-j-k')
    expect(sanitizeFilenamePart('  L12B0  ')).toBe('L12B0')
    expect(sanitizeFilenamePart('///')).toBe('export')
    expect(sanitizeFilenamePart('x'.repeat(100))).toHaveLength(64)
  })
})
