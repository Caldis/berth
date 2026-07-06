import * as path from 'path'

export interface ProjectDirOptions {
  isDev: boolean
  cwd: string
}

export function resolveDefaultProjectDir({ isDev, cwd }: ProjectDirOptions): string | undefined {
  if (isDev) return undefined
  const trimmed = cwd.trim()
  if (!trimmed) return undefined

  const resolved = isWindowsStyleAbsolute(trimmed)
    ? path.win32.normalize(trimmed)
    : path.resolve(trimmed)

  if (isFilesystemRoot(resolved)) return undefined
  if (hasAppBundleSegment(resolved)) return undefined

  return resolved
}

function isFilesystemRoot(filePath: string): boolean {
  const parsed = isWindowsStyleAbsolute(filePath)
    ? path.win32.parse(filePath)
    : path.parse(filePath)
  return parsed.root.length > 0 && filePath.toLowerCase() === parsed.root.toLowerCase()
}

function isWindowsStyleAbsolute(filePath: string): boolean {
  return /^(?:[a-zA-Z]:[\\/]|\\\\)/.test(filePath)
}

function hasAppBundleSegment(filePath: string): boolean {
  return filePath.split(/[\\/]+/).some((segment) => /\.app$/i.test(segment))
}
