import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { BrowserWindow, ipcMain, nativeTheme, shell, app } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { AgentView, Asset, AssetCategory, CostMode, Relation, SessionSummary, UsageSummary } from '@shared/types/asset'
import type {
  PlatformInfo,
  AgentScanSourceGroup,
  ScanResult,
  SearchResult,
  HealthCheck,
  ImportChainNode,
  SessionListResult,
  SessionDetailResult,
  MCPMergeInfo,
  SessionArtifacts,
  SessionToolEvent,
  HooksAgentId,
  HooksEnablementStatus,
  SetHookEnabledRequest,
  SetHookEnabledResult,
  SetHooksEnabledRequest,
  SetHooksEnabledResult
} from '@shared/types/ipc'
import { getScanner } from '../engine/scanner'
import { getSearch } from '../engine/search'
import { buildUsageSummary } from '../engine/usage'
import { normalizeTokenUsage } from '../../shared/token-usage'
import { runHealthChecks } from '../engine/health'
import { getAgentHooksStatus, setAgentHooksEnabled, setHookEnabled } from '../engine/hooks-manager'
import { resolveRelations, buildImportChain } from '../engine/relations'
import { parseMcpServers } from '../adapters/claude-code/parsers'
import { parseClaudeSessionDetail } from '../adapters/claude-code/session-detail'
import { parseCodexSessionDetail } from '../adapters/codex/parsers'
import { listMemory, readMemory } from '../memory'

export function registerAssetHandlers(): void {
  ipcMain.handle('window:minimize', (event: IpcMainInvokeEvent): void => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.handle('window:toggle-maximize', (event: IpcMainInvokeEvent): void => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return
    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.handle('window:close', (event: IpcMainInvokeEvent): void => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('window:is-maximized', (event: IpcMainInvokeEvent): boolean => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })

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

  ipcMain.handle('assets:scan-sources', async (): Promise<AgentScanSourceGroup[]> => {
    return getScanner().getScanSourceGroups()
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

  ipcMain.handle('assets:health-check', async (): Promise<HealthCheck[]> => {
    const scanner = getScanner()
    await scanner.scanAll()
    return runHealthChecks({
      projectDir: scanner.getProjectDir(),
      assets: scanner.getAllAssets(),
      scanErrors: scanner.getScanErrors()
    })
  })

  ipcMain.handle('assets:import-chain', (_event, filePath: string): ImportChainNode => {
    return buildImportChain(filePath)
  })

  ipcMain.handle(
    'sessions:list',
    async (
      _event,
      opts: { projectFilter?: string; limit?: number; agentView?: AgentView }
    ): Promise<SessionListResult> => {
      const scanner = await ensureScanned()
      let sessions = scanner
        .getAllAssets()
        .filter((a) => a.type === 'session')
        .filter((a) => sessionMatchesAgentView(a, opts.agentView))

      if (opts.projectFilter) {
        sessions = sessions.filter((s) => sessionMatchesProjectFilter(s, opts.projectFilter!))
      }

      sessions.sort((a, b) => getSessionSortTime(b) - getSessionSortTime(a))

      const totalCount = sessions.length
      if (opts.limit && opts.limit > 0) {
        sessions = sessions.slice(0, opts.limit)
      }

      return {
        sessions: sessions.map(toSessionSummary),
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
      const allAssets = scanner.getAllAssets()
      const parsedDetail = parseSessionExecutionDetail(asset)
      const fileHistoryCount =
        parsedDetail.artifacts.checkpoints.length ||
        readNumber(asset.meta, 'fileHistoryCount') ||
        0
      return {
        summary: toSessionSummary(asset),
        skillsUsed: resolveSessionNamedAssets(asset, allAssets, 'skill', readStringArray(asset.meta, 'skillsUsed')),
        mcpServers: resolveSessionNamedAssets(
          asset,
          allAssets,
          'mcp-server',
          readStringArray(asset.meta, 'mcpServers')
        ),
        hooksFired: toHookEvents(asset),
        toolTimeline: parsedDetail.toolTimeline,
        artifacts: parsedDetail.artifacts,
        plans: parsedDetail.artifacts.plans,
        todos: parsedDetail.artifacts.todos,
        fileHistoryCount
      }
    }
  )

  ipcMain.handle(
    'usage:summary',
    async (_event, opts: { days: number; agentView?: AgentView; costMode?: CostMode }): Promise<UsageSummary> => {
      const scanner = await ensureScanned()
      return buildUsageSummary(
        scanner.getAllAssets().filter((asset) => sessionMatchesAgentView(asset, opts.agentView)),
        { days: opts.days, costMode: opts.costMode }
      )
    }
  )

  ipcMain.handle('memory:list', () => listMemory())

  ipcMain.handle('memory:get', (_event, id: string) => readMemory(id))

  ipcMain.handle('mcp:merged', (): MCPMergeInfo[] => {
    return computeMcpMerged()
  })

  ipcMain.handle('hooks:status', (_event, agentId: HooksAgentId): HooksEnablementStatus => {
    return getAgentHooksStatus(agentId)
  })

  ipcMain.handle(
    'hooks:set-enabled',
    async (_event, request: SetHooksEnabledRequest): Promise<SetHooksEnabledResult> => {
      const result = setAgentHooksEnabled(request)
      const scanResult = await getScanner().scanAll()
      getSearch().buildIndex(scanResult.assets)
      return result
    }
  )

  ipcMain.handle(
    'hooks:set-hook-enabled',
    async (_event, request: SetHookEnabledRequest): Promise<SetHookEnabledResult> => {
      const result = setHookEnabled(request)
      const scanResult = await getScanner().scanAll()
      getSearch().buildIndex(scanResult.assets)
      return result
    }
  )

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

function toSessionSummary(asset: Asset): SessionSummary {
  const tokenUsage = normalizeTokenUsage(asset.meta.tokenUsage ?? asset.meta)
  return {
    id: asset.id,
    agentId: asset.agentId,
    title: asset.name,
    project: readString(asset.meta, 'project') ?? '',
    projectPath: readString(asset.meta, 'projectPath') ?? '',
    transcriptPath: readString(asset.meta, 'transcriptPath') ?? asset.path,
    startedAt: readString(asset.meta, 'startedAt') ?? null,
    endedAt: readString(asset.meta, 'endedAt') ?? null,
    duration: readNumber(asset.meta, 'duration') ?? null,
    cost: readNumber(asset.meta, 'totalCost') ?? null,
    tokens: tokenUsage.totalTokens,
    tokenUsage,
    model: readString(asset.meta, 'model') ?? '',
    skillsUsed: readStringArray(asset.meta, 'skillsUsed'),
    mcpServers: readStringArray(asset.meta, 'mcpServers'),
    hooksFired: readNumber(asset.meta, 'hooksFired') ?? 0
  }
}

function sessionMatchesAgentView(asset: Asset, view: AgentView | undefined): boolean {
  if (!view || view === 'all') return true
  if (view === 'claude') return asset.agentId === 'claude-code' || asset.agentId === 'claude'
  return asset.agentId === 'codex'
}

function sessionMatchesProjectFilter(asset: Asset, filter: string): boolean {
  const query = filter.toLowerCase()
  return [
    readString(asset.meta, 'project'),
    readString(asset.meta, 'projectPath'),
    readString(asset.meta, 'projectDirName')
  ].some((value) => value?.toLowerCase().includes(query))
}

function getSessionSortTime(asset: Asset): number {
  for (const key of ['endedAt', 'startedAt', 'modifiedAt']) {
    const value = readString(asset.meta, key)
    if (!value) continue
    const time = new Date(value).getTime()
    if (!Number.isNaN(time)) return time
  }
  return 0
}

function resolveSessionNamedAssets(
  session: Asset,
  allAssets: Asset[],
  type: Asset['type'],
  names: string[]
): Asset[] {
  return names.map((name) => {
    const existing = allAssets
      .filter((asset) => asset.type === type && asset.name.toLowerCase() === name.toLowerCase())
      .sort((a, b) => scopeRank(a.scope) - scopeRank(b.scope))[0]
    if (existing) return existing

    return {
      id: `${session.id}-${type}-${slugId(name)}`,
      agentId: session.agentId,
      category: type === 'skill' ? 'instruction' : 'capability',
      type,
      scope: 'session',
      name,
      path: session.path,
      meta: { source: 'session-transcript' }
    }
  })
}

function scopeRank(scope: Asset['scope']): number {
  if (scope === 'project') return 0
  if (scope === 'user') return 1
  if (scope === 'enterprise') return 2
  return 3
}

function toHookEvents(asset: Asset): { event: string; count: number }[] {
  const counts = asset.meta.hookEventCounts
  if (isRecord(counts)) {
    return Object.entries(counts)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0)
      .map(([event, count]) => ({ event, count }))
  }

  const hooksFired = readNumber(asset.meta, 'hooksFired') ?? 0
  return hooksFired > 0 ? [{ event: 'Stop', count: hooksFired }] : []
}

function parseSessionExecutionDetail(asset: Asset): {
  toolTimeline: SessionToolEvent[]
  artifacts: SessionArtifacts
} {
  if (asset.agentId === 'codex') {
    return parseCodexSessionDetail(asset.path)
  }
  if (asset.agentId === 'claude-code' || asset.agentId === 'claude') {
    return parseClaudeSessionDetail(asset.path)
  }
  return {
    toolTimeline: [],
    artifacts: {
      plans: [],
      todos: [],
      files: [],
      checkpoints: []
    }
  }
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function slugId(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'unknown'
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
