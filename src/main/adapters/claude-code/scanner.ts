import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
import type { Asset, AssetScope } from '../types'
import type { ScanError } from '@shared/types/ipc'
import {
  parseClaudeMd,
  parseAgentsMd,
  parseSkill,
  parseAgent,
  parseCommand,
  parseOutputMode,
  parseTeam,
  parseMcpServers,
  parseHooks,
  parsePermissions,
  parseEnv,
  parsePlugin,
  parseStatusline,
  parseSessionMeta,
  parsePlan,
  parseTodo,
  parseHistory,
  parseStatsCache,
  parseUsageData,
  parseIdeLock,
  parseCredential
} from './parsers'

export interface ScanContext {
  claudeDir: string // ~/.claude
  projectDir?: string // current project root (if any)
  errors: ScanError[]
}

function safeScan<T>(
  ctx: ScanContext,
  filePath: string,
  type: string,
  fn: () => T
): T | null {
  try {
    return fn()
  } catch (err) {
    ctx.errors.push({
      path: filePath,
      type,
      message: err instanceof Error ? err.message : String(err)
    })
    return null
  }
}

function safeGlob(pattern: string, cwd: string): string[] {
  try {
    return glob.sync(pattern, { cwd, absolute: true, windowsPathsNoEscape: true })
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Instruction assets
// ---------------------------------------------------------------------------

export function scanInstructions(ctx: ScanContext): Asset[] {
  const assets: Asset[] = []

  // CLAUDE.md / AGENTS.md at user scope (~/.claude/)
  for (const [file, parser, scope] of [
    ['CLAUDE.md', parseClaudeMd, 'user'],
    ['AGENTS.md', parseAgentsMd, 'user']
  ] as const) {
    const fp = path.join(ctx.claudeDir, file)
    if (fs.existsSync(fp)) {
      const a = safeScan(ctx, fp, file, () => parser(fp, scope))
      if (a) assets.push(a)
    }
  }

  // CLAUDE.md / AGENTS.md at project scope (.claude/)
  if (ctx.projectDir) {
    const projectClaudeDir = path.join(ctx.projectDir, '.claude')
    for (const [file, parser] of [
      ['CLAUDE.md', parseClaudeMd],
      ['AGENTS.md', parseAgentsMd]
    ] as const) {
      // Check project root
      const rootFp = path.join(ctx.projectDir, file)
      if (fs.existsSync(rootFp)) {
        const a = safeScan(ctx, rootFp, file, () => parser(rootFp, 'project'))
        if (a) assets.push(a)
      }
      // Check .claude/ dir
      const dotClaudeFp = path.join(projectClaudeDir, file)
      if (fs.existsSync(dotClaudeFp)) {
        const a = safeScan(ctx, dotClaudeFp, file, () => parser(dotClaudeFp, 'project'))
        if (a) assets.push(a)
      }
    }
  }

  // Skills
  assets.push(...scanDir(ctx, path.join(ctx.claudeDir, 'skills'), 'user', '**/*.md', parseSkill))
  if (ctx.projectDir) {
    assets.push(
      ...scanDir(ctx, path.join(ctx.projectDir, '.claude', 'skills'), 'project', '**/*.md', parseSkill)
    )
  }

  // Agents
  assets.push(
    ...scanDir(ctx, path.join(ctx.claudeDir, 'agents'), 'user', '**/*.{yml,yaml}', parseAgent)
  )
  if (ctx.projectDir) {
    assets.push(
      ...scanDir(
        ctx,
        path.join(ctx.projectDir, '.claude', 'agents'),
        'project',
        '**/*.{yml,yaml}',
        parseAgent
      )
    )
  }

  // Commands
  assets.push(
    ...scanDir(ctx, path.join(ctx.claudeDir, 'commands'), 'user', '**/*.md', parseCommand)
  )
  if (ctx.projectDir) {
    assets.push(
      ...scanDir(
        ctx,
        path.join(ctx.projectDir, '.claude', 'commands'),
        'project',
        '**/*.md',
        parseCommand
      )
    )
  }

  // Output modes
  assets.push(
    ...scanDir(ctx, path.join(ctx.claudeDir, 'output-modes'), 'user', '**/*.md', parseOutputMode)
  )

  // Teams
  assets.push(
    ...scanDir(ctx, path.join(ctx.claudeDir, 'teams'), 'user', '**/*.{yml,yaml}', parseTeam)
  )
  if (ctx.projectDir) {
    assets.push(
      ...scanDir(
        ctx,
        path.join(ctx.projectDir, '.claude', 'teams'),
        'project',
        '**/*.{yml,yaml}',
        parseTeam
      )
    )
  }

  return assets
}

// ---------------------------------------------------------------------------
// Capability assets
// ---------------------------------------------------------------------------

export function scanCapabilities(ctx: ScanContext): Asset[] {
  const assets: Asset[] = []

  // MCP servers from 3 sources
  const mcpSources: [string, AssetScope][] = [
    [path.join(ctx.claudeDir, '..', '.claude.json'), 'user'],
    [path.join(ctx.claudeDir, 'settings.json'), 'user']
  ]
  if (ctx.projectDir) {
    mcpSources.push([path.join(ctx.projectDir, '.mcp.json'), 'project'])
  }
  for (const [fp, scope] of mcpSources) {
    if (fs.existsSync(fp)) {
      const a = safeScan(ctx, fp, 'mcp-server', () => parseMcpServers(fp, scope))
      if (a) assets.push(...a)
    }
  }

  // Hooks, permissions, env from settings.json (user + project)
  const settingsSources: [string, AssetScope][] = [
    [path.join(ctx.claudeDir, 'settings.json'), 'user']
  ]
  if (ctx.projectDir) {
    settingsSources.push([path.join(ctx.projectDir, '.claude', 'settings.json'), 'project'])
  }
  for (const [fp, scope] of settingsSources) {
    if (fs.existsSync(fp)) {
      const hooks = safeScan(ctx, fp, 'hook', () => parseHooks(fp, scope))
      if (hooks) assets.push(...hooks)

      const perms = safeScan(ctx, fp, 'permission', () => parsePermissions(fp, scope))
      if (perms) assets.push(...perms)

      const envs = safeScan(ctx, fp, 'env', () => parseEnv(fp, scope))
      if (envs) assets.push(...envs)
    }
  }

  // Plugins
  const pluginsDir = path.join(ctx.claudeDir, 'plugins')
  if (fs.existsSync(pluginsDir)) {
    try {
      const entries = fs.readdirSync(pluginsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = path.join(pluginsDir, entry.name)
          const a = safeScan(ctx, pluginPath, 'plugin', () => parsePlugin(pluginPath))
          if (a) assets.push(a)
        }
      }
    } catch (err) {
      ctx.errors.push({
        path: pluginsDir,
        type: 'plugin',
        message: err instanceof Error ? err.message : String(err)
      })
    }
  }

  // Statusline scripts
  const statuslineFiles = safeGlob('statusline*', ctx.claudeDir)
  for (const fp of statuslineFiles) {
    const a = safeScan(ctx, fp, 'statusline', () => parseStatusline(fp, 'user'))
    if (a) assets.push(a)
  }

  return assets
}

// ---------------------------------------------------------------------------
// State assets
// ---------------------------------------------------------------------------

export function scanState(ctx: ScanContext): Asset[] {
  const assets: Asset[] = []

  // Sessions from ~/.claude/projects/<encoded-path>/*.jsonl
  const projectsDir = path.join(ctx.claudeDir, 'projects')
  if (fs.existsSync(projectsDir)) {
    try {
      const projectEntries = fs.readdirSync(projectsDir, { withFileTypes: true })
      for (const projEntry of projectEntries) {
        if (!projEntry.isDirectory()) continue
        const projPath = path.join(projectsDir, projEntry.name)
        const jsonlFiles = safeGlob('*.jsonl', projPath)
        for (const fp of jsonlFiles) {
          const a = safeScan(ctx, fp, 'session', () =>
            parseSessionMeta(fp, projEntry.name)
          )
          if (a) assets.push(a)
        }
      }
    } catch (err) {
      ctx.errors.push({
        path: projectsDir,
        type: 'session',
        message: err instanceof Error ? err.message : String(err)
      })
    }
  }

  // Plans
  assets.push(...scanDir(ctx, path.join(ctx.claudeDir, 'plans'), 'user', '**/*.*', parsePlanWrapper))

  // Todos
  assets.push(...scanDir(ctx, path.join(ctx.claudeDir, 'todos'), 'user', '**/*.*', parseTodoWrapper))

  // History
  const historyPath = path.join(ctx.claudeDir, 'history.jsonl')
  if (fs.existsSync(historyPath)) {
    const a = safeScan(ctx, historyPath, 'history', () => parseHistory(historyPath))
    if (a) assets.push(a)
  }

  return assets
}

// Wrappers that ignore scope param since plans/todos are always 'user'
function parsePlanWrapper(fp: string, _scope: AssetScope): Asset {
  return parsePlan(fp)
}

function parseTodoWrapper(fp: string, _scope: AssetScope): Asset {
  return parseTodo(fp)
}

// ---------------------------------------------------------------------------
// Observability assets
// ---------------------------------------------------------------------------

export function scanObservability(ctx: ScanContext): Asset[] {
  const assets: Asset[] = []

  // Stats cache
  const statsPath = path.join(ctx.claudeDir, 'stats-cache.json')
  if (fs.existsSync(statsPath)) {
    const a = safeScan(ctx, statsPath, 'stats-cache', () => parseStatsCache(statsPath))
    if (a) assets.push(a)
  }

  // Usage data
  const usageDir = path.join(ctx.claudeDir, 'usage-data')
  if (fs.existsSync(usageDir)) {
    const files = safeGlob('*.json', usageDir)
    for (const fp of files) {
      const a = safeScan(ctx, fp, 'usage-data', () => parseUsageData(fp))
      if (a) assets.push(a)
    }
  }

  return assets
}

// ---------------------------------------------------------------------------
// Integration assets
// ---------------------------------------------------------------------------

export function scanIntegration(ctx: ScanContext): Asset[] {
  const assets: Asset[] = []

  // IDE locks
  const ideDir = path.join(ctx.claudeDir, 'ide')
  if (fs.existsSync(ideDir)) {
    const files = safeGlob('*', ideDir)
    for (const fp of files) {
      if (fs.statSync(fp).isFile()) {
        const a = safeScan(ctx, fp, 'ide-lock', () => parseIdeLock(fp))
        if (a) assets.push(a)
      }
    }
  }

  // Credentials — detect existence only
  const credentialPatterns = [
    'credentials',
    'credentials.json',
    '.credentials',
    'auth.json',
    'oauth*'
  ]
  for (const pattern of credentialPatterns) {
    const files = safeGlob(pattern, ctx.claudeDir)
    for (const fp of files) {
      if (fs.statSync(fp).isFile()) {
        const a = safeScan(ctx, fp, 'credential', () => parseCredential(fp))
        if (a) assets.push(a)
      }
    }
  }

  return assets
}

// ---------------------------------------------------------------------------
// Helper: scan a directory with a parser function
// ---------------------------------------------------------------------------

function scanDir(
  ctx: ScanContext,
  dir: string,
  scope: AssetScope,
  pattern: string,
  parser: (filePath: string, scope: AssetScope) => Asset
): Asset[] {
  if (!fs.existsSync(dir)) return []
  const assets: Asset[] = []
  const files = safeGlob(pattern, dir)
  for (const fp of files) {
    const a = safeScan(ctx, fp, path.basename(fp), () => parser(fp, scope))
    if (a) assets.push(a)
  }
  return assets
}
