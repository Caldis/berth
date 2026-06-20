// Markdown frontmatter reader for skill / agent metadata checks.
// Extracted from health.ts (GH #6 health-restructure, behavior-preserving).
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { asRecord } from './value-guards'

export function readMarkdownFrontmatter(filePath: string): {
  frontmatter: Record<string, unknown> | null
  error?: string
} {
  let raw = ''
  try {
    raw = fs.readFileSync(filePath, 'utf-8')
  } catch (err) {
    return { frontmatter: null, error: err instanceof Error ? err.message : 'Unable to read file.' }
  }
  if (!raw.startsWith('---')) return { frontmatter: null }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { frontmatter: null, error: 'Frontmatter is not closed.' }
  try {
    const parsed = yaml.load(raw.slice(3, end).trim())
    return { frontmatter: asRecord(parsed) ?? null }
  } catch (err) {
    return {
      frontmatter: null,
      error: err instanceof Error ? err.message : 'Invalid YAML frontmatter.'
    }
  }
}
