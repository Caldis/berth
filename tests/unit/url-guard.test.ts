import { describe, it, expect } from 'vitest'
import * as path from 'path'
import { isSafeExternalUrl, isAllowedRevealPath, isAllowedRevealPathReal, isAllowedPermission } from '../../src/main/url-guard'

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

// GH-154 T2: openPath 白名单此前纯词法 (path.resolve 处理 .. 但不解 symlink) —
// 根内恶意 symlink 可指向根外。realpath 注入式谓词: candidate 解析失败即 deny。
describe('isAllowedRevealPathReal', () => {
  const rootA = path.resolve('/berth-test/scan-root-a')
  const outside = path.resolve('/berth-test/outside')
  const roots = [rootA]

  it('denies a symlink inside a root that resolves outside every root', () => {
    const link = path.join(rootA, 'evil-link.md')
    const realpath = (p: string): string => (p === link ? path.join(outside, 'secret.md') : p)
    expect(isAllowedRevealPathReal(link, roots, { realpath })).toBe(false)
  })

  it('allows a normal file whose realpath stays inside the root', () => {
    const file = path.join(rootA, 'skills', 'a.md')
    expect(isAllowedRevealPathReal(file, roots, { realpath: (p) => p })).toBe(true)
  })

  it('denies when the candidate cannot be resolved (ENOENT)', () => {
    const file = path.join(rootA, 'missing.md')
    const realpath = (): string => {
      throw new Error('ENOENT')
    }
    expect(isAllowedRevealPathReal(file, roots, { realpath })).toBe(false)
  })

  it('keeps a root usable when the root itself fails to resolve (falls back to the literal root)', () => {
    const file = path.join(rootA, 'a.md')
    const realpath = (p: string): string => {
      if (p === rootA) throw new Error('EPERM')
      return p
    }
    expect(isAllowedRevealPathReal(file, roots, { realpath })).toBe(true)
  })

  it('allows a candidate that reaches a root through a symlinked alias of the root', () => {
    // alias → rootA 本体: candidate 与 root 都归一后仍在白名单内。
    const alias = path.resolve('/berth-test/alias-root')
    const file = path.join(alias, 'a.md')
    const realpath = (p: string): string => {
      if (p === file) return path.join(rootA, 'a.md')
      if (p === alias) return rootA
      return p
    }
    expect(isAllowedRevealPathReal(file, [alias], { realpath })).toBe(true)
  })
})
