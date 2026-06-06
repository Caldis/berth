/**
 * Minimal, dependency-free argv parser for the `berth-scan` CLI.
 *
 * Convention: `berth-scan [global-flags] <command> [args] [flags]`.
 * Boolean flags never consume the next token; value flags consume the next
 * token unless it is itself a flag, or use the `--flag=value` form.
 */

/** Deterministic exit codes so agents can branch on them (02-SPEC D12). */
export const EXIT = {
  OK: 0,
  ERROR: 1,
  NO_DATA: 2,
  ATTENTION: 3
} as const

export type ExitCode = (typeof EXIT)[keyof typeof EXIT]

const BOOLEAN_FLAGS = new Set([
  'json',
  'verbose',
  'quiet',
  'help',
  'version',
  'wait',
  'relations',
  'import-chain',
  'fix'
])

export interface ParsedArgs {
  command: string | null
  positionals: string[]
  flags: Record<string, string | boolean>
  json: boolean
}

export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {}
  const positionals: string[] = []
  let command: string | null = null

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const body = arg.slice(2)
      const eq = body.indexOf('=')
      if (eq >= 0) {
        flags[body.slice(0, eq)] = body.slice(eq + 1)
        continue
      }
      if (BOOLEAN_FLAGS.has(body)) {
        flags[body] = true
        continue
      }
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        flags[body] = next
        i++
      } else {
        flags[body] = true
      }
    } else if (command === null) {
      command = arg
    } else {
      positionals.push(arg)
    }
  }

  return {
    command,
    positionals,
    flags,
    json: flags.json === true || flags.json === 'true'
  }
}
