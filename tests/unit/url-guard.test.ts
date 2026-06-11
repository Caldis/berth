import { describe, it, expect } from 'vitest'
import * as path from 'path'
import { isSafeExternalUrl, isAllowedRevealPath, isAllowedPermission } from '../../src/main/url-guard'

// GH-119: pins the three pure window-hardening predicates. The guard module is
// electron-free by architecture constraint (electron value imports are confined
// to index/dev-instance/devtools/ipc), so the full allow/deny matrix is directly
// testable here — handlers and window assembly only consume these verdicts.
describe('isSafeExternalUrl', () => {
  it.each([
    'https://github.com/Caldis/berth',
    'http://example.com/page',
    'mailto:someone@example.com'
  ])('allows %s', (url) => {
    expect(isSafeExternalUrl(url)).toBe(true)
  })

  it('allows uppercase scheme (URL parser normalizes protocol)', () => {
    expect(isSafeExternalUrl('HTTPS://GITHUB.COM/X')).toBe(true)
  })

  it('allows surrounding whitespace (URL parser trims it)', () => {
    expect(isSafeExternalUrl('  https://github.com/x  ')).toBe(true)
  })

  it.each([
    'file:///C:/Windows/System32',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'data:text/html,<script>1</script>',
    'smb://host/share',
    'vbscript:msgbox(1)'
  ])('denies %s', (url) => {
    expect(isSafeExternalUrl(url)).toBe(false)
  })

  it('denies protocol-relative and scheme-less strings (not parseable as absolute URL)', () => {
    expect(isSafeExternalUrl('github.com/Caldis/berth')).toBe(false)
    expect(isSafeExternalUrl('/etc/passwd')).toBe(false)
    expect(isSafeExternalUrl('//evil.example')).toBe(false)
  })

  it('denies empty and garbage input', () => {
    expect(isSafeExternalUrl('')).toBe(false)
    expect(isSafeExternalUrl(':::')).toBe(false)
    expect(isSafeExternalUrl('not a url')).toBe(false)
  })
})

describe('isAllowedRevealPath', () => {
  // Paths are built via path.resolve/join on the host platform (no hard-coded
  // backslash literals — ambient path module is platform-specific).
  const rootA = path.resolve('/berth-test/scan-root-a')
  const rootB = path.resolve('/berth-test/memory-root')
  const roots = [rootA, rootB]

  it('allows a file inside a root', () => {
    expect(isAllowedRevealPath(path.join(rootA, 'skills', 'a.md'), roots)).toBe(true)
  })

  it('allows the root itself (includeEqual semantics — ScanRoot paths are passed verbatim)', () => {
    expect(isAllowedRevealPath(rootA, roots)).toBe(true)
  })

  it('allows a path inside any of multiple roots', () => {
    expect(isAllowedRevealPath(path.join(rootB, 'mem', 'note.md'), roots)).toBe(true)
  })

  it('denies a path outside every root', () => {
    expect(isAllowedRevealPath(path.resolve('/berth-test/elsewhere/file.md'), roots)).toBe(false)
  })

  it('denies sibling-prefix lookalikes (/root-a vs /root-a-evil)', () => {
    expect(isAllowedRevealPath(`${rootA}-evil${path.sep}file.md`, roots)).toBe(false)
  })

  it('denies dot-dot traversal escaping the root after resolution', () => {
    expect(isAllowedRevealPath(path.join(rootA, '..', 'escaped.md'), roots)).toBe(false)
  })

  it('denies on empty roots and empty path', () => {
    expect(isAllowedRevealPath(path.join(rootA, 'x.md'), [])).toBe(false)
    expect(isAllowedRevealPath('', roots)).toBe(false)
  })

  it('folds case on win32 (platform injected, host-built paths)', () => {
    const upper = path.join(rootA, 'Sub', 'File.MD').toUpperCase()
    expect(isAllowedRevealPath(upper, roots, 'win32')).toBe(true)
    expect(isAllowedRevealPath(upper, roots, 'linux')).toBe(false)
  })
})

describe('isAllowedPermission', () => {
  it('allows clipboard-sanitized-write (4 renderer copy buttons depend on it)', () => {
    expect(isAllowedPermission('clipboard-sanitized-write')).toBe(true)
  })

  it.each(['notifications', 'geolocation', 'media', 'fullscreen', 'openExternal', 'clipboard-read', ''])(
    'denies %s',
    (permission) => {
      expect(isAllowedPermission(permission)).toBe(false)
    }
  )
})
