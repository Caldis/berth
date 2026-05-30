import * as os from 'os'
import * as path from 'path'

export const EXTRA_CODEX_HOMES_ENV = 'BERTH_EXTRA_CODEX_HOMES'
export const EXTRA_CLAUDE_DIRS_ENV = 'BERTH_EXTRA_CLAUDE_DIRS'

export function resolveCodexHomeDir(
  homeDir = os.homedir(),
  env: NodeJS.ProcessEnv = process.env
): string {
  const configuredHome = env.CODEX_HOME?.trim()
  return configuredHome ? path.resolve(configuredHome) : path.join(homeDir, '.codex')
}

export function resolveCodexHomeDirs(
  homeDir = os.homedir(),
  env: NodeJS.ProcessEnv = process.env
): string[] {
  return uniquePaths([
    resolveCodexHomeDir(homeDir, env),
    ...parsePathList(env[EXTRA_CODEX_HOMES_ENV])
  ])
}

export function resolveClaudeDirs(
  homeDir = os.homedir(),
  env: NodeJS.ProcessEnv = process.env
): string[] {
  return uniquePaths([
    path.join(homeDir, '.claude'),
    ...parsePathList(env[EXTRA_CLAUDE_DIRS_ENV])
  ])
}

export function parsePathList(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(new RegExp(`[${escapeRegExp(path.delimiter)}\\n]`))
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => path.resolve(item))
}

function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const filePath of paths) {
    const key = process.platform === 'win32' ? filePath.toLowerCase() : filePath
    if (seen.has(key)) continue
    seen.add(key)
    result.push(filePath)
  }
  return result
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
