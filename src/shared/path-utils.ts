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
