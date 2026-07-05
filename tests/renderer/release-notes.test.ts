import { describe, expect, it } from 'vitest'
import { formatVersionRange, releaseNoteHtmlToText } from '../../src/renderer/src/lib/release-notes'

// GH-156: GitHub provider release notes arrive as Atom-feed HTML. The helper
// extracts readable text via a detached DOMParser document — content is never
// injected into the live DOM, scripts never execute, resources never load.
describe('releaseNoteHtmlToText', () => {
  it('passes plain text through unchanged', () => {
    expect(releaseNoteHtmlToText('just plain text')).toBe('just plain text')
  })

  it('returns empty string for empty input', () => {
    expect(releaseNoteHtmlToText('')).toBe('')
  })

  it('converts <br> into newlines', () => {
    expect(releaseNoteHtmlToText('first<br>second<br/>third')).toBe('first\nsecond\nthird')
  })

  it('renders list items as bullets', () => {
    expect(releaseNoteHtmlToText('<ul><li>one</li><li>two</li></ul>')).toBe('• one\n• two')
  })

  it('separates block elements with newlines', () => {
    expect(releaseNoteHtmlToText('<h2>Title</h2><p>alpha</p><p>beta</p>')).toBe('Title\nalpha\nbeta')
  })

  it('drops script/style content and never executes markup', () => {
    const marker = '__gh156_pwned__' as const
    const html = `<script>window["${marker}"] = true</script><style>.x{}</style>hello<img src="x" onerror="window['${marker}']=true">`
    expect(releaseNoteHtmlToText(html)).toBe('hello')
    expect((window as unknown as Record<string, unknown>)[marker]).toBeUndefined()
  })

  it('collapses runaway blank lines', () => {
    expect(releaseNoteHtmlToText('<p>a</p><div></div><div></div><div></div><p>b</p>')).toBe('a\n\nb')
  })
})

describe('formatVersionRange', () => {
  it('formats a single entry as vX', () => {
    expect(formatVersionRange([{ version: '0.5.0', note: 'x' }])).toBe('v0.5.0')
  })

  it('formats multiple entries (provider order: newest first) as oldest → newest', () => {
    const entries = [
      { version: '0.5.0', note: 'new' },
      { version: '0.4.10', note: 'mid' },
      { version: '0.4.9', note: 'old' }
    ]
    expect(formatVersionRange(entries)).toBe('v0.4.9 → v0.5.0')
  })

  it('falls back to the target version when entries carry no versions', () => {
    expect(formatVersionRange([], '1.2.3')).toBe('v1.2.3')
    expect(formatVersionRange([{ version: '', note: 'x' }], '1.2.3')).toBe('v1.2.3')
  })

  it('does not double an existing v prefix', () => {
    expect(formatVersionRange([{ version: 'v0.5.0', note: 'x' }])).toBe('v0.5.0')
  })

  it('returns empty string when nothing is known', () => {
    expect(formatVersionRange([])).toBe('')
  })
})
