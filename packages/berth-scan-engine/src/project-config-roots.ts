import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { sameProjectPath } from '@shared/scope'

export function resolveProjectConfigRoots(
  projectDir?: string,
  opts?: { homeDir?: string }
): string[] {
  if (!projectDir || !projectDir.trim()) return []

  const leafToRoot: string[] = []
  let current = path.resolve(projectDir)
  let foundRepositoryRoot = false

  while (true) {
    leafToRoot.push(current)
    if (fs.existsSync(path.join(current, '.git'))) {
      foundRepositoryRoot = true
      break
    }

    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  const roots = foundRepositoryRoot
    ? uniquePaths(leafToRoot.reverse())
    : [path.resolve(projectDir)]
  // A cwd=$HOME session records home as a "project", but home as a config root
  // makes every agent's project config dir (~/.claude, ~/.codex, …) BE the
  // user-level config dir — the same settings/skills/hooks would double-archive
  // at user AND project scope, and a deep scan would glob the entire home tree.
  // Home is never a project config root (dotfiles .git at home included).
  const homeDir = opts?.homeDir ?? os.homedir()
  return roots.filter((root) => !sameProjectPath(root, homeDir))
}

function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const filePath of paths) {
    const resolved = path.resolve(filePath)
    const key = process.platform === 'win32' ? resolved.toLowerCase() : resolved
    if (seen.has(key)) continue
    seen.add(key)
    result.push(resolved)
  }
  return result
}
