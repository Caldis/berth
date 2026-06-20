// Filesystem probes used by health check providers.
// Extracted from health.ts (GH #6 health-restructure, behavior-preserving).
import * as fs from 'fs'
import { glob } from 'glob'

export function safeGlob(pattern: string, cwd: string): string[] {
  if (!dirExists(cwd)) return []
  try {
    return glob.sync(pattern, { cwd, absolute: true, windowsPathsNoEscape: true })
  } catch {
    return []
  }
}

export function safeReadDir(dirPath: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return []
  }
}

export function safeReadText(filePath: string): string | undefined {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return undefined
  }
}

export function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

export function dirExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory()
  } catch {
    return false
  }
}
