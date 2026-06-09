// Shared markdown parsing helpers for adapters. Previously copied across the
// claude-code and codex adapters.

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
