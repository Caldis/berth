import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
import type { Asset, AssetScope } from '../types'
import type { ScanError } from '@shared/types/ipc'
import type { AssetFileCache } from '../../engine/assets/file-cache'
import {
  parseClaudeMd,
  parseAgentsMd,
  parseSkill,
  parseAgent,
  parseCommand,
  parseOutputMode,
  parseMcpServers,
  parseClaudeJsonProjectMcp,
  parseHooks,
  parsePermissions,
  parseEnv,
  parseStatuslinesFromSettings,
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
  projectDirs?: string[] // project config roots from repository root to current cwd
  managedDir?: string // file-based managed settings directory
  errors: ScanError[]
  sessionCache?: AssetFileCache<Asset>
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

function safeGlob(pattern: string, cwd: string, ctx?: ScanContext): string[] {
  try {
    return glob.sync(pattern, { cwd, absolute: true, windowsPathsNoEscape: true })
  } catch (err) {
    // A glob failure (permission, IO, broken symlink) silently drops assets;
    // surface it so missing data is visible instead of looking like "no data".
    ctx?.errors.push({
      path: cwd,
      type: 'glob',
      message: err instanceof Error ? err.message : String(err)
    })
    return []
  }
}

/** stat guarded against TOCTOU: a file globbed then deleted/locked must not throw
 * out of the whole adapter scan — record it and skip the single file. */
function safeStatIsFile(ctx: ScanContext, filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile()
  } catch (err) {
    ctx.errors.push({
      path: filePath,
      type: 'stat',
      message: err instanceof Error ? err.message : String(err)
    })
    return false
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

  // CLAUDE.md / CLAUDE.local.md / AGENTS.md at project scope (root + .claude/),
  // plus nested CLAUDE.md anywhere in the project tree. Shared dedup avoids
  // double-counting across the root-to-leaf project roots and the nested glob.
  const seenConventions = new Set<string>()
  const addConvention = (
    fp: string,
    parser: (filePath: string, scope: AssetScope) => Asset
  ): void => {
    const key = fp.toLowerCase()
    if (seenConventions.has(key) || !fs.existsSync(fp)) return
    seenConventions.add(key)
    const a = safeScan(ctx, fp, path.basename(fp), () => parser(fp, 'project'))
    if (a) assets.push(a)
  }
  for (const projectDir of projectDirsFromContext(ctx)) {
    const projectClaudeDir = path.join(projectDir, '.claude')
    for (const file of ['CLAUDE.md', 'CLAUDE.local.md'] as const) {
      addConvention(path.join(projectDir, file), parseClaudeMd)
      addConvention(path.join(projectClaudeDir, file), parseClaudeMd)
    }
    addConvention(path.join(projectDir, 'AGENTS.md'), parseAgentsMd)
    addConvention(path.join(projectClaudeDir, 'AGENTS.md'), parseAgentsMd)
    // Nested subtree CLAUDE.md (skip vendored / build output directories).
    let nested: string[] = []
    try {
      nested = glob.sync('**/CLAUDE.md', {
        cwd: projectDir,
        absolute: true,
        windowsPathsNoEscape: true,
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/out/**', '**/build/**', '**/.next/**']
      })
    } catch {
      nested = []
    }
    for (const fp of nested) addConvention(fp, parseClaudeMd)
  }

  // Skills — official form is `<name>/SKILL.md`; supporting files (reference.md,
  // etc.) live alongside SKILL.md and must NOT be scanned as separate skills.
  assets.push(...scanDir(ctx, path.join(ctx.claudeDir, 'skills'), 'user', '**/SKILL.md', parseSkill))
  for (const projectDir of projectDirsFromContext(ctx)) {
    assets.push(
      ...scanDir(ctx, path.join(projectDir, '.claude', 'skills'), 'project', '**/SKILL.md', parseSkill)
    )
  }

  // Agents
  assets.push(
    ...scanDir(ctx, path.join(ctx.claudeDir, 'agents'), 'user', '**/*.md', parseAgent)
  )
  for (const projectDir of projectDirsFromContext(ctx)) {
    assets.push(
      ...scanDir(
        ctx,
        path.join(projectDir, '.claude', 'agents'),
        'project',
        '**/*.md',
        parseAgent
      )
    )
  }

  // Commands
  assets.push(
    ...scanDir(ctx, path.join(ctx.claudeDir, 'commands'), 'user', '**/*.md', parseCommand)
  )
  for (const projectDir of projectDirsFromContext(ctx)) {
    assets.push(
      ...scanDir(
        ctx,
        path.join(projectDir, '.claude', 'commands'),
        'project',
        '**/*.md',
        parseCommand
      )
    )
  }

  // Output styles — official dir is `output-styles` (user + project), not
  // `output-modes`. (https://docs.claude.com/en/docs/claude-code/output-styles)
  assets.push(
    ...scanDir(ctx, path.join(ctx.claudeDir, 'output-styles'), 'user', '**/*.md', parseOutputMode)
  )
  for (const projectDir of projectDirsFromContext(ctx)) {
    assets.push(
      ...scanDir(ctx, path.join(projectDir, '.claude', 'output-styles'), 'project', '**/*.md', parseOutputMode)
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
  if (ctx.managedDir) {
    mcpSources.push([path.join(ctx.managedDir, 'managed-mcp.json'), 'enterprise'])
  }
  for (const projectDir of projectDirsFromContext(ctx)) {
    mcpSources.push([path.join(projectDir, '.mcp.json'), 'project'])
    // mcpServers may also live under project settings (committed + local).
    mcpSources.push([path.join(projectDir, '.claude', 'settings.json'), 'project'])
    mcpSources.push([path.join(projectDir, '.claude', 'settings.local.json'), 'project'])
  }
  for (const [fp, scope] of mcpSources) {
    if (fs.existsSync(fp)) {
      const a = safeScan(ctx, fp, 'mcp-server', () => parseMcpServers(fp, scope))
      if (a) assets.push(...a)
    }
  }

  // Per-project MCP servers stored in ~/.claude.json's `projects` map.
  const claudeJsonPath = path.join(ctx.claudeDir, '..', '.claude.json')
  if (fs.existsSync(claudeJsonPath)) {
    const projectMcp = safeScan(ctx, claudeJsonPath, 'mcp-server', () =>
      parseClaudeJsonProjectMcp(claudeJsonPath)
    )
    if (projectMcp) assets.push(...projectMcp)
  }

  // Hooks, permissions, env from settings.json (user + project)
  const settingsSources: [string, AssetScope][] = [
    [path.join(ctx.claudeDir, 'settings.json'), 'user']
  ]
  if (ctx.managedDir) {
    settingsSources.push([path.join(ctx.managedDir, 'managed-settings.json'), 'enterprise'])
  }
  for (const projectDir of projectDirsFromContext(ctx)) {
    settingsSources.push([path.join(projectDir, '.claude', 'settings.json'), 'project'])
  }
  for (const [fp, scope] of settingsSources) {
    const settingsExists = fs.existsSync(fp)
    // Make malformed settings loud: a JSON typo otherwise silently drops ALL
    // hooks/permissions/env/statusline (parsers swallow parse errors → null).
    // An empty/whitespace file is treated as absent, not malformed.
    if (settingsExists) {
      try {
        const rawSettings = fs.readFileSync(fp, 'utf-8')
        if (rawSettings.trim().length > 0) JSON.parse(rawSettings)
      } catch (err) {
        ctx.errors.push({
          path: fp,
          type: 'settings-json',
          message: err instanceof Error ? err.message : String(err)
        })
      }
    }
    const sidecarPath = scope === 'user'
      ? path.join(ctx.claudeDir, '.berth', 'hooks-state.json')
      : undefined
    const sidecarExists = sidecarPath ? fs.existsSync(sidecarPath) : false
    if (settingsExists || sidecarExists) {
      const hooks = safeScan(ctx, fp, 'hook', () =>
        parseHooks(fp, scope, {
          sidecarPath,
          onSidecarError: (error, statePath) => {
            ctx.errors.push({
              path: statePath,
              type: 'hook-state',
              message: error.message
            })
          }
        })
      )
      if (hooks) assets.push(...hooks)
    }

    if (settingsExists) {
      const perms = safeScan(ctx, fp, 'permission', () => parsePermissions(fp, scope))
      if (perms) assets.push(...perms)

      const envs = safeScan(ctx, fp, 'env', () => parseEnv(fp, scope))
      if (envs) assets.push(...envs)

      const statuslines = safeScan(ctx, fp, 'statusline', () => parseStatuslinesFromSettings(fp, scope))
      if (statuslines) assets.push(...statuslines)
    }
  }

  for (const projectDir of projectDirsFromContext(ctx)) {
    const localSettings = path.join(projectDir, '.claude', 'settings.local.json')
    if (fs.existsSync(localSettings)) {
      const statuslines = safeScan(ctx, localSettings, 'statusline', () =>
        parseStatuslinesFromSettings(localSettings, 'project')
      )
      if (statuslines) assets.push(...statuslines)
    }
  }

  // Plugins (+ their bundled skills/agents/commands/hooks/mcp) and marketplaces
  assets.push(...scanPlugins(ctx))

  return assets
}

// ---------------------------------------------------------------------------
// Plugins: descend installed plugins into their bundled components
// ---------------------------------------------------------------------------

function readJsonRecord(filePath: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function readEnabledPlugins(claudeDir: string): Record<string, boolean> {
  const settings = readJsonRecord(path.join(claudeDir, 'settings.json'))
  const ep = settings?.enabledPlugins
  return ep && typeof ep === 'object' ? (ep as Record<string, boolean>) : {}
}

function pluginCoords(
  pluginsDir: string,
  root: string,
  manifest: Record<string, unknown>
): { marketplace: string; version: string } {
  const relCache = path.relative(path.join(pluginsDir, 'cache'), root)
  const manifestVersion = typeof manifest.version === 'string' ? manifest.version : undefined
  if (relCache && !relCache.startsWith('..')) {
    const parts = relCache.split(/[\\/]/).filter(Boolean)
    return { marketplace: parts[0] ?? 'unknown', version: manifestVersion ?? parts[2] ?? 'unknown' }
  }
  return { marketplace: 'inline', version: manifestVersion ?? 'unknown' }
}

function scanPlugins(ctx: ScanContext): Asset[] {
  const assets: Asset[] = []
  const pluginsDir = path.join(ctx.claudeDir, 'plugins')
  if (!fs.existsSync(pluginsDir)) return assets

  const enabled = readEnabledPlugins(ctx.claudeDir)

  // Marketplace catalog assets (no descent; cache holds the installed copies).
  const marketplaces = readJsonRecord(path.join(pluginsDir, 'known_marketplaces.json'))
  if (marketplaces) {
    for (const [id, value] of Object.entries(marketplaces)) {
      const rec = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
      assets.push({
        id: `marketplace:${id}`,
        agentId: 'claude-code',
        category: 'integration',
        type: 'marketplace',
        scope: 'user',
        name: id,
        path: path.join(pluginsDir, 'marketplaces', id),
        meta: { source: rec.source, installLocation: rec.installLocation, lastUpdated: rec.lastUpdated }
      })
    }
  }

  // Installed plugins: any dir under cache/ or data/ with .claude-plugin/plugin.json.
  const manifestPaths = [
    ...safeGlob('cache/**/.claude-plugin/plugin.json', pluginsDir),
    ...safeGlob('data/**/.claude-plugin/plugin.json', pluginsDir)
  ]
  for (const manifestPath of manifestPaths) {
    const root = path.dirname(path.dirname(manifestPath))
    const manifest = readJsonRecord(manifestPath) ?? {}
    const name = (manifest.name as string) ?? path.basename(root)
    const { marketplace, version } = pluginCoords(pluginsDir, root, manifest)
    const plugin: Asset = {
      id: `plugin:${marketplace}/${name}@${version}`,
      agentId: 'claude-code',
      category: 'capability',
      type: 'plugin',
      scope: 'user',
      name,
      path: root,
      meta: {
        marketplace,
        version,
        enabled: enabled[`${name}@${marketplace}`] ?? true,
        description: manifest.description,
        author: manifest.author,
        manifestPath
      }
    }
    assets.push(plugin)
    assets.push(...descendPluginComponents(ctx, root, plugin))
  }

  return assets
}

function descendPluginComponents(ctx: ScanContext, root: string, plugin: Asset): Asset[] {
  const out: Asset[] = []
  const tag = (asset: Asset): Asset => ({
    ...asset,
    scope: 'user',
    meta: {
      ...asset.meta,
      pluginId: plugin.id,
      pluginName: plugin.name,
      marketplace: plugin.meta.marketplace,
      origin: 'plugin'
    }
  })

  for (const fp of safeGlob('skills/**/SKILL.md', root)) {
    const a = safeScan(ctx, fp, 'plugin-skill', () => parseSkill(fp, 'user'))
    if (a) out.push(tag(a))
  }
  for (const fp of safeGlob('agents/**/*.md', root)) {
    const a = safeScan(ctx, fp, 'plugin-agent', () => parseAgent(fp, 'user'))
    if (a) out.push(tag(a))
  }
  for (const fp of safeGlob('commands/**/*.md', root)) {
    const a = safeScan(ctx, fp, 'plugin-command', () => parseCommand(fp, 'user'))
    if (a) out.push(tag(a))
  }
  const hooksPath = path.join(root, 'hooks', 'hooks.json')
  if (fs.existsSync(hooksPath)) {
    const hooks = safeScan(ctx, hooksPath, 'plugin-hook', () => parseHooks(hooksPath, 'user'))
    if (hooks) out.push(...hooks.map(tag))
  }
  const mcpPath = path.join(root, '.mcp.json')
  if (fs.existsSync(mcpPath)) {
    const servers = safeScan(ctx, mcpPath, 'plugin-mcp', () => parseMcpServers(mcpPath, 'user'))
    if (servers) out.push(...servers.map(tag))
  }
  return out
}

function projectDirsFromContext(ctx: ScanContext): string[] {
  if (ctx.projectDirs && ctx.projectDirs.length > 0) return ctx.projectDirs
  return ctx.projectDir ? [ctx.projectDir] : []
}

// ---------------------------------------------------------------------------
// State assets
// ---------------------------------------------------------------------------

export function scanState(ctx: ScanContext): Asset[] {
  const assets: Asset[] = []

  // Sessions are the top-level project JSONL files defined by the v0.1 PRD.
  // Nested subagents/*.jsonl files are execution children, not standalone sessions.
  const projectsDir = path.join(ctx.claudeDir, 'projects')
  if (fs.existsSync(projectsDir)) {
    try {
      const projectEntries = fs.readdirSync(projectsDir, { withFileTypes: true })
      for (const projEntry of projectEntries) {
        if (!projEntry.isDirectory()) continue
        const projPath = path.join(projectsDir, projEntry.name)
        const jsonlFiles = safeGlob('*.jsonl', projPath, ctx)
        for (const fp of jsonlFiles) {
          const a = safeScan(ctx, fp, 'session', () =>
            ctx.sessionCache
              ? ctx.sessionCache.getOrParse(fp, () => parseSessionMeta(fp, projEntry.name))
              : parseSessionMeta(fp, projEntry.name)
          )
          if (a) {
            assets.push(a)
            // A session whose transcript could not be read is surfaced (O2).
            if (typeof a.meta.parseError === 'string') {
              ctx.errors.push({ path: fp, type: 'session', message: a.meta.parseError })
            }
          }
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
    const files = safeGlob('*', ideDir, ctx)
    for (const fp of files) {
      if (safeStatIsFile(ctx, fp)) {
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
    const files = safeGlob(pattern, ctx.claudeDir, ctx)
    for (const fp of files) {
      if (safeStatIsFile(ctx, fp)) {
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
  const files = safeGlob(pattern, dir, ctx)
  for (const fp of files) {
    const a = safeScan(ctx, fp, path.basename(fp), () => parser(fp, scope))
    if (a) assets.push(a)
  }
  return assets
}
