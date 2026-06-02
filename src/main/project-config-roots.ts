import * as fs from 'fs'
import * as path from 'path'

export function resolveProjectConfigRoots(projectDir?: string): string[] {
  if (!projectDir || !projectDir.trim()) return []

  const leafToRoot: string[] = []
  let current = path.resolve(projectDir)

  while (true) {
    leafToRoot.push(current)
    if (fs.existsSync(path.join(current, '.git'))) break

    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  return uniquePaths(leafToRoot.reverse())
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
