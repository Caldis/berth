// Shared markdown parsing helpers for adapters. Previously copied across the
// claude-code and codex adapters.

import * as yaml from 'js-yaml'
import { isRecord } from './parser-helpers'

/**
 * Split a YAML frontmatter block (`---` fences) from a markdown document.
 *
 * Unified semantics (reconciled from the drifted claude-code regex variant and
 * codex indexOf variant):
 * - The opening `---` must be line 1; the closing `---` must sit on its own
 *   line, followed by a newline or end of file. CRLF is handled.
 * - The fenced block is stripped from `body` whenever the fences are
 *   structurally valid — even if the YAML inside fails to parse or is empty.
 * - `frontmatter` is null unless the YAML parses to a record (scalar/sequence
 *   YAML would otherwise leak garbage keys into spread sites).
 * - Without structurally valid fences the whole content is returned as body.
 */
export function splitFrontmatter(raw: string): {
  frontmatter: Record<string, unknown> | null
  body: string
} {
  const match = raw.match(/^---\r?\n(?:([\s\S]*?)\r?\n)?---(?:\r?\n([\s\S]*))?$/)
  if (!match) return { frontmatter: null, body: raw }
  const body = match[2] ?? ''
  try {
    const parsed = yaml.load(match[1] ?? '')
    return { frontmatter: isRecord(parsed) ? parsed : null, body }
  } catch {
    return { frontmatter: null, body }
  }
}

/**
 * Extract `@path` import references (e.g. `@AGENTS.md`, `@./foo/bar.md`) from
 * instruction file content, one per line. Returns the paths without the `@`.
 */
export function extractAtImports(content: string): string[] {
  const results: string[] = []
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    // Matches @path references like @AGENTS.md, @./foo/bar.md
    if (/^@[\w./\\]/.test(trimmed)) {
      results.push(trimmed.slice(1).trim())
    }
  }
  return results
}
