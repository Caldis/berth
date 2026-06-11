import * as path from 'path'

/**
 * Path equality with platform-aware case folding: case-insensitive on win32,
 * case-sensitive elsewhere. Returns false if either side is undefined.
 *
 * Single source of truth consolidating the previously-duplicated `samePath`
 * copies (claude parsers / engine health / engine scanner / hooks-manager).
 * The hooks-manager copy used to fold case on every platform; this canonical
 * form keeps case-sensitivity on case-sensitive filesystems (Linux), matching
 * the other three and the parser-path-equality test contract.
 */
export function samePath(
  left: string | undefined,
  right: string | undefined,
  platform: NodeJS.Platform = process.platform
): boolean {
  if (!left || !right) return false
  const a = path.resolve(left)
  const b = path.resolve(right)
  return platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
}

/**
 * Path containment with platform-aware case folding (same canonical semantics
 * as samePath) and an explicit `includeEqual` knob.
 *
 * GH-115 T7: consolidates the previously-divergent containment checks —
 * memory sources ×2 (equal counted as inside, never folded) and engine/scanner
 * (equal excluded + separate samePath call, never folded). Non-folding win32
 * behavior was the bug (inconsistent with samePath); the sep-boundary check
 * keeps the /foo vs /foobar false positive out of every variant.
 */
export function isPathInside(
  candidate: string | undefined,
  parent: string | undefined,
  options: { includeEqual?: boolean; platform?: NodeJS.Platform } = {}
): boolean {
  if (!candidate || !parent) return false
  const platform = options.platform ?? process.platform
  const fold = (p: string): string =>
    platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p)
  const c = fold(candidate)
  const root = fold(parent)
  if (c === root) return options.includeEqual ?? false
  return c.startsWith(root + path.sep)
}
