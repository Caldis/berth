import * as fs from 'fs'
import * as path from 'path'
import type { AssetScope } from './types'

interface ExtractCommandEntryPathOptions {
  scope: AssetScope
  env?: NodeJS.ProcessEnv
}

export function extractCommandEntryPaths(
  sourcePath: string,
  commands: string | Array<string | undefined>,
  options: ExtractCommandEntryPathOptions
): string[] {
  const commandList = Array.isArray(commands) ? commands : [commands]
  const baseDir = path.dirname(sourcePath)
  const agentConfigDir = inferAgentConfigDir(sourcePath)
  const projectRoot = options.scope === 'project' && agentConfigDir
    ? path.dirname(agentConfigDir)
    : undefined
  const variables = buildVariableMap(options.env ?? process.env, agentConfigDir, projectRoot)
  const paths: string[] = []

  for (const command of commandList) {
    if (!command) continue
    for (const token of splitCommandTokens(command)) {
      const expanded = expandCommandPathToken(token, variables)
      if (!looksLikeScriptPath(expanded)) continue
      const candidate = path.normalize(path.isAbsolute(expanded) ? expanded : path.resolve(baseDir, expanded))
      if (fs.existsSync(candidate)) paths.push(candidate)
    }
  }

  return Array.from(new Set(paths))
}

function splitCommandTokens(command: string): string[] {
  const tokens: string[] = []
  const pattern = /"([^"]+)"|'([^']+)'|(\S+)/g
  for (const match of command.matchAll(pattern)) {
    const token = match[1] ?? match[2] ?? match[3]
    if (token) tokens.push(token)
  }
  return tokens
}

function expandCommandPathToken(token: string, variables: Map<string, string>): string {
  let expanded = token
  const projectRoot = variables.get('PROJECT_ROOT')
  if (projectRoot) {
    expanded = expanded.replace(/\$\(git\s+rev-parse\s+--show-toplevel\)/g, projectRoot)
  }
  expanded = expanded.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/gi, (_match, name: string) =>
    variables.get(name.toUpperCase()) ?? _match
  )
  expanded = expanded.replace(/\$([A-Z_][A-Z0-9_]*)/gi, (_match, name: string) =>
    variables.get(name.toUpperCase()) ?? _match
  )
  expanded = expanded.replace(/%([A-Z_][A-Z0-9_]*)%/gi, (_match, name: string) =>
    variables.get(name.toUpperCase()) ?? _match
  )
  return expandHomePath(expanded, variables)
}

function buildVariableMap(
  env: NodeJS.ProcessEnv,
  agentConfigDir: string | undefined,
  projectRoot: string | undefined
): Map<string, string> {
  const variables = new Map<string, string>()
  const homeDir = readEnv(env, 'HOME') ?? readEnv(env, 'USERPROFILE')

  setVariable(variables, 'HOME', homeDir)
  setVariable(variables, 'USERPROFILE', readEnv(env, 'USERPROFILE') ?? homeDir)
  setVariable(variables, 'PROJECT_ROOT', readEnv(env, 'PROJECT_ROOT') ?? projectRoot)
  setVariable(variables, 'PWD', readEnv(env, 'PWD') ?? projectRoot)
  setVariable(variables, 'GIT_WORK_TREE', readEnv(env, 'GIT_WORK_TREE') ?? projectRoot)

  if (agentConfigDir && path.basename(agentConfigDir) === '.codex') {
    setVariable(variables, 'CODEX_HOME', readEnv(env, 'CODEX_HOME') ?? agentConfigDir)
    setVariable(variables, 'CODEX_PROJECT_DIR', readEnv(env, 'CODEX_PROJECT_DIR') ?? projectRoot)
  }
  if (agentConfigDir && path.basename(agentConfigDir) === '.claude') {
    setVariable(variables, 'CLAUDE_CONFIG_DIR', readEnv(env, 'CLAUDE_CONFIG_DIR') ?? agentConfigDir)
    setVariable(variables, 'CLAUDE_PROJECT_DIR', readEnv(env, 'CLAUDE_PROJECT_DIR') ?? projectRoot)
  }

  return variables
}

function setVariable(variables: Map<string, string>, name: string, value: string | undefined): void {
  if (value?.trim()) variables.set(name, value)
}

function readEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  return env[name] ?? Object.entries(env).find(([key]) => key.toUpperCase() === name)?.[1]
}

function inferAgentConfigDir(sourcePath: string): string | undefined {
  const dir = path.dirname(sourcePath)
  if (isAgentConfigDir(dir)) return dir
  const parent = path.dirname(dir)
  if (isAgentConfigDir(parent)) return parent
  return undefined
}

function isAgentConfigDir(dir: string): boolean {
  const name = path.basename(dir)
  return name === '.claude' || name === '.codex'
}

function expandHomePath(token: string, variables: Map<string, string>): string {
  if (token !== '~' && !token.startsWith('~/') && !token.startsWith('~\\')) return token
  const homeDir = variables.get('HOME') ?? variables.get('USERPROFILE')
  if (!homeDir) return token
  if (token === '~') return homeDir
  return path.join(homeDir, token.slice(2))
}

function looksLikeScriptPath(value: string): boolean {
  return /\.(?:bat|cmd|cjs|js|mjs|ps1|py|rb|sh|ts|zsh)$/i.test(value)
}
