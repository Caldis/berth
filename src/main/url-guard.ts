import { isPathInside } from '@shared/path-utils'

/**
 * GH-119 window-hardening predicates. Pure verdict layer — no electron import
 * (electron value imports are confined to index/dev-instance/devtools/ipc by
 * docs/ARCHITECTURE.md); the shell/window assembly consumes these and performs
 * the actual side effects, logging every denial via the main log.
 */

const SAFE_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

/** openExternal / window.open targets: absolute http(s)/mailto URLs only. */
export function isSafeExternalUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  return SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)
}

/**
 * shell:openPath (showItemInFolder) targets: only paths inside one of the
 * allowed roots — adapter scan roots ∪ memory roots ∪ active project dir.
 * Roots themselves are legitimate targets (ScanRoot paths are passed verbatim
 * by the scan-sources UI), hence includeEqual.
 */
export function isAllowedRevealPath(
  candidate: string,
  allowedRoots: string[],
  platform: NodeJS.Platform = process.platform
): boolean {
  if (!candidate) return false
  return allowedRoots.some((root) =>
    isPathInside(candidate, root, { includeEqual: true, platform })
  )
}

/**
 * GH-154 T2: realpath-normalized reveal check. The lexical predicate above
 * resolves `..` but not symlinks — a link inside an allowed root pointing
 * outside would pass. `realpath` is injected (fs.realpathSync in the handler;
 * fakes in tests) to keep this module electron/fs-free.
 * - candidate that fails to resolve (ENOENT/EPERM) → deny (revealing a
 *   non-existent path is meaningless).
 * - a root that fails to resolve keeps its literal value (missing scan roots
 *   are a normal state and must stay usable as prefixes).
 */
export function isAllowedRevealPathReal(
  candidate: string,
  allowedRoots: string[],
  options: { realpath: (p: string) => string; platform?: NodeJS.Platform }
): boolean {
  if (!candidate) return false
  let resolved: string
  try {
    resolved = options.realpath(candidate)
  } catch {
    return false
  }
  const resolvedRoots = allowedRoots.map((root) => {
    try {
      return options.realpath(root)
    } catch {
      return root
    }
  })
  return isAllowedRevealPath(resolved, resolvedRoots, options.platform ?? process.platform)
}

const ALLOWED_PERMISSIONS = new Set([
  // navigator.clipboard.writeText — overview/usage/hooks/file-viewer copy buttons.
  'clipboard-sanitized-write'
])

/** Chromium permission requests/checks: deny-all except the explicit allow-list. */
export function isAllowedPermission(permission: string): boolean {
  return ALLOWED_PERMISSIONS.has(permission)
}
