import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { ipcMain, nativeTheme, shell, app } from 'electron'
import type { Asset, AssetCategory, Relation, UsageSummary } from '@shared/types/asset'
import type {
  PlatformInfo,
  ScanResult,
  SearchResult,
  HealthCheck,
  ImportChainNode,
  SessionListResult,
  SessionDetailResult,
  MCPMergeInfo
} from '@shared/types/ipc'
import { getScanner } from '../engine/scanner'
import { getSearch } from '../engine/search'
import { buildUsageSummary } from '../engine/usage'
import { resolveRelations, buildImportChain } from '../engine/relations'
import { parseMcpServers } from '../adapters/claude-code/parsers'

export function registerAssetHandlers(): void {
  ipcMain.handle('platform:info', (): PlatformInfo => ({
    platform: process.platform,
    arch: process.arch,
    homeDir: os.homedir(),
    version: app.getVersion(),
    claudeDir: path.join(os.homedir(), '.claude')
  }))

  ipcMain.handle('assets:scan-all', async (): Promise<ScanResult> => {
    const scanner = getScanner()
    const result = await scanner.scanAll()
    const search = getSearch()
    search.buildIndex(result.assets)
    return result
  })

  ipcMain.handle(
    'assets:scan-category',
    async (_event, category: AssetCategory): Promise<Asset[]> => {
      const scanner = getScanner()
      return scanner.scanCategory(category)
    }
  )

  ipcMain.handle('assets:get', (_event, id: string): Asset | null => {
    return getScanner().getAsset(id)
  })

  ipcMain.handle('assets:relations', (_event, id: string): Relation[] => {
    const scanner = getScanner()
    const asset = scanner.getAsset(id)
    if (!asset) return []
    return resolveRelations(asset, scanner.getAllAssets())
  })

  ipcMain.handle('assets:search', (_event, query: string): SearchResult[] => {
    const scanner = getScanner()
    const search = getSearch()
    return search.search(query, scanner.getAllAssets())
  })

  ipcMain.handle('assets:health-check', (): HealthCheck[] => {
    return runHealthChecks()
  })

  ipcMain.handle('assets:import-chain', (_event, filePath: string): ImportChainNode => {
    return buildImportChain(filePath)
  })

  ipcMain.handle(
    'sessions:list',
    async (_event, opts: { projectFilter?: string; limit?: number }): Promise<SessionListResult> => {
      const scanner = await ensureScanned()
      let sessions = scanner
        .getAllAssets()
        .filter((a) => a.type === 'session')

      if (opts.projectFilter) {
        sessions = sessions.filter(
          (s) => (s.meta.project as string)?.includes(opts.projectFilter!)
        )
      }

      // Sort by modification time descending
      sessions.sort((a, b) => {
        const aTime = (a.meta.modifiedAt as string) ?? ''
        const bTime = (b.meta.modifiedAt as string) ?? ''
        return bTime.localeCompare(aTime)
      })

      const totalCount = sessions.length
      if (opts.limit && opts.limit > 0) {
        sessions = sessions.slice(0, opts.limit)
      }

      return {
        sessions: sessions.map((s) => ({
          id: s.id,
          title: s.name,
          project: (s.meta.project as string) ?? '',
          startedAt: (s.meta.startedAt as string) ?? '',
          duration: 0,
          cost: (s.meta.totalCost as number) ?? 0,
          tokens: (s.meta.totalTokens as number) ?? 0,
          model: (s.meta.model as string) ?? '',
          skillsUsed: (s.meta.skillsUsed as string[]) ?? [],
          mcpServers: (s.meta.mcpServers as string[]) ?? [],
          hooksFired: 0
        })),
        totalCount
      }
    }
  )

  ipcMain.handle(
    'sessions:get',
    async (_event, id: string): Promise<SessionDetailResult | null> => {
      const scanner = await ensureScanned()
      const asset = scanner.getAsset(id)
      if (!asset || asset.type !== 'session') return null
      return {
        summary: {
          id: asset.id,
          title: asset.name,
          project: (asset.meta.project as string) ?? '',
          startedAt: (asset.meta.startedAt as string) ?? '',
          duration: 0,
          cost: (asset.meta.totalCost as number) ?? 0,
          tokens: (asset.meta.totalTokens as number) ?? 0,
          model: (asset.meta.model as string) ?? '',
          skillsUsed: (asset.meta.skillsUsed as string[]) ?? [],
          mcpServers: (asset.meta.mcpServers as string[]) ?? [],
          hooksFired: 0
        },
        skillsUsed: [],
        mcpServers: [],
        hooksFired: [],
        plans: [],
        todos: [],
        fileHistoryCount: 0
      }
    }
  )

  ipcMain.handle(
    'usage:summary',
    async (_event, opts: { days: number }): Promise<UsageSummary> => {
      void opts
      const scanner = await ensureScanned()
      return buildUsageSummary(scanner.getAllAssets())
    }
  )

  ipcMain.handle('mcp:merged', (): MCPMergeInfo[] => {
    return computeMcpMerged()
  })

  ipcMain.handle('theme:get', () => nativeTheme.themeSource)

  ipcMain.handle('theme:set', (_event, theme: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = theme
  })

  ipcMain.handle('shell:openPath', (_event, p: string) => {
    shell.showItemInFolder(p)
  })

  ipcMain.handle('shell:openExternal', (_event, url: string) => {
    shell.openExternal(url)
  })
}

async function ensureScanned(): Promise<ReturnType<typeof getScanner>> {
  const scanner = getScanner()
  if (!scanner.hasScanned()) {
    await scanner.scanAll()
  }
  return scanner
}

// ---------------------------------------------------------------------------
// Health checks
// ---------------------------------------------------------------------------

function runHealthChecks(): HealthCheck[] {
  const checks: HealthCheck[] = []
  const claudeDir = path.join(os.homedir(), '.claude')

  if (!fs.existsSync(claudeDir)) {
    checks.push({
      id: 'no-claude-dir',
      severity: 'error',
      message: 'Claude Code directory (~/.claude) not found. Is Claude Code installed?'
    })
    return checks
  }

  // Check for CLAUDE.md
  if (!fs.existsSync(path.join(claudeDir, 'CLAUDE.md'))) {
    checks.push({
      id: 'no-user-claude-md',
      severity: 'info',
      message: 'No user-level CLAUDE.md found. Consider creating ~/.claude/CLAUDE.md.'
    })
  }

  // Check settings.json readability
  const settingsPath = path.join(claudeDir, 'settings.json')
  if (fs.existsSync(settingsPath)) {
    try {
      JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    } catch {
      checks.push({
        id: 'invalid-settings',
        severity: 'error',
        message: 'settings.json contains invalid JSON.',
        assetType: 'hook'
      })
    }
  }

  // Check for orphaned sessions dir
  const projectsDir = path.join(claudeDir, 'projects')
  if (fs.existsSync(projectsDir)) {
    try {
      const entries = fs.readdirSync(projectsDir, { withFileTypes: true })
      const emptyDirs = entries.filter((e) => {
        if (!e.isDirectory()) return false
        try {
          return fs.readdirSync(path.join(projectsDir, e.name)).length === 0
        } catch {
          return false
        }
      })
      if (emptyDirs.length > 0) {
        checks.push({
          id: 'empty-project-dirs',
          severity: 'info',
          message: `${emptyDirs.length} empty project directories found in ~/.claude/projects/`
        })
      }
    } catch {
      // ignore
    }
  }

  return checks
}

// ---------------------------------------------------------------------------
// MCP merge info
// ---------------------------------------------------------------------------

function computeMcpMerged(): MCPMergeInfo[] {
  const claudeDir = path.join(os.homedir(), '.claude')
  const sources: { path: string; scope: string }[] = [
    { path: path.join(os.homedir(), '.claude.json'), scope: 'user' },
    { path: path.join(claudeDir, 'settings.json'), scope: 'user' }
  ]

  // Gather all MCP server definitions across scopes
  const serverMap = new Map<string, MCPMergeInfo>()

  for (const src of sources) {
    if (!fs.existsSync(src.path)) continue
    const assets = parseMcpServers(src.path, 'user')
    for (const a of assets) {
      const existing = serverMap.get(a.name)
      const scopeEntry = {
        scope: src.scope,
        source: src.path,
        config: (a.meta.serverConfig as Record<string, unknown>) ?? {}
      }
      if (existing) {
        existing.scopes.push(scopeEntry)
        existing.hasConflict = true
        existing.overriddenBy = src.scope
        existing.effective = scopeEntry.config
      } else {
        serverMap.set(a.name, {
          serverId: a.id,
          name: a.name,
          scopes: [scopeEntry],
          effective: scopeEntry.config,
          hasConflict: false
        })
      }
    }
  }

  return Array.from(serverMap.values())
}
