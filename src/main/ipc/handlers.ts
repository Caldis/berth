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
  HealthCheckRequest,
  ImportChainNode,
  SessionListResult,
  SessionDetailResult,
  SessionActivityMetrics,
  SessionModelInfo,
  MCPMergeInfo,
  SessionArtifacts,
  SessionToolEvent,
  ClearHookRecoveryRequest,
  ClearHookRecoveryResult,
  HookRecoveryListResult,
  HooksAgentId,
  HooksEnablementStatus,
  SetHookEnabledRequest,
  SetHookEnabledResult,
  SetHooksEnabledRequest,
  SetHooksEnabledResult
} from '@shared/types/ipc'
import type { AgentCapabilityPluginListResult } from '@shared/types/agent-plugin'
import { getScanner } from '../engine/scanner'
import { getSearch } from '../engine/search'
import { buildUsageSummary } from '../engine/usage'
import { normalizeTokenUsage } from '../../shared/token-usage'
import { runHealthChecks } from '../engine/health'
import {
  clearHookRecovery,
  getAgentHooksStatus,
  getAgentHooksStatuses,
  getHookRecoveries,
  setAgentHooksEnabled,
  setHookEnabled
} from '../engine/hooks-manager'
import { resolveRelations, buildImportChain } from '../engine/relations'
import { parseMcpServers } from '../adapters/claude-code/parsers'
import { parseClaudeSessionDetail } from '../adapters/claude-code/session-detail'
import { parseCodexSessionDetail } from '../adapters/codex/parsers'
import { listMemory, readMemory } from '../memory'
import { resolveModelPricing } from '../engine/pricing/catalog'
import { listAgentCapabilityPlugins } from '../agent-plugins/registry'
import { assetMatchesProjectPath } from '../project-scope'
import { activateProjectScope } from '../project-scope-runtime'

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

  ipcMain.handle('window:set-always-on-top', (event: IpcMainInvokeEvent, flag: boolean): void => {
    BrowserWindow.fromWebContents(event.sender)?.setAlwaysOnTop(Boolean(flag))
  })

  ipcMain.handle('window:is-always-on-top', (event: IpcMainInvokeEvent): boolean => {
    return BrowserWindow.fromWebContents(event.sender)?.isAlwaysOnTop() ?? false
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

  ipcMain.handle('agent-plugins:list', async (): Promise<AgentCapabilityPluginListResult> => {
    const scanner = getScanner()
    return listAgentCapabilityPlugins(await scanner.getScanSourceGroups(), {
      homeDir: os.homedir(),
      projectDir: scanner.getProjectDir(),
      env: process.env
    })
  })

  ipcMain.handle('project-scope:candidates', async () => {
    const scanner = await ensureScanned()
    return scanner.getProjectScopeCandidates()
  })

  ipcMain.handle('project-scope:activate', async (_event, opts: { projectPath?: string } = {}) => {
    return activateProjectScope(opts.projectPath)
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

  ipcMain.handle('assets:health-check', async (_event, opts: HealthCheckRequest = {}): Promise<HealthCheck[]> => {
    const scanner = getScanner()
    if (opts.refresh || !scanner.hasScanned()) {
      await scanner.scanAll()
    }
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
      opts: { projectFilter?: string; projectPath?: string; limit?: number; agentView?: AgentView }
    ): Promise<SessionListResult> => {
      const scanner = await ensureScanned()
      let sessions = scanner
        .getAllAssets()
        .filter((a) => a.type === 'session')
        .filter((a) => sessionMatchesAgentView(a, opts.agentView))

      if (opts.projectFilter) {
        sessions = sessions.filter((s) => sessionMatchesProjectFilter(s, opts.projectFilter!))
      }
      if (opts.projectPath) {
        sessions = sessions.filter((s) => assetMatchesProjectPath(s, opts.projectPath))
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
      const summary = toSessionSummary(asset)
      return {
        summary,
        modelInfo: toSessionModelInfo(summary.model, asset.agentId),
        activityMetrics: toSessionActivityMetrics(summary, asset),
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
    async (_event, opts: { days: number; agentView?: AgentView; costMode?: CostMode; projectPath?: string }): Promise<UsageSummary> => {
      const scanner = await ensureScanned()
      return buildUsageSummary(
        scanner.getAllAssets().filter((asset) => sessionMatchesAgentView(asset, opts.agentView)),
        { days: opts.days, costMode: opts.costMode, projectPath: opts.projectPath }
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

  ipcMain.handle('hooks:statuses', (_event, agentId: HooksAgentId): HooksEnablementStatus[] => {
    return getAgentHooksStatuses(agentId, undefined, getScanner().getProjectDir())
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

  ipcMain.handle('hooks:recoveries', (): HookRecoveryListResult => {
    return getHookRecoveries()
  })

  ipcMain.handle(
    'hooks:clear-recovery',
    async (_event, request: ClearHookRecoveryRequest): Promise<ClearHookRecoveryResult> => {
      const result = clearHookRecovery(request)
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

function toSessionModelInfo(model: string, agentId: string): SessionModelInfo {
  const knownModel = findKnownModelMetadata(model)
  const provider = inferModelProvider(model, agentId)
  const pricing = resolvePreferredModelPricing(model, knownModel?.provider ?? provider.name)
  const inferredReleaseDate = inferModelDate(model)
  const releaseDate = inferredReleaseDate ?? knownModel?.releaseDate ?? null

  return {
    provider: knownModel?.provider ?? provider.name ?? pricing?.provider ?? null,
    providerSource: provider.source ?? (pricing?.provider ? 'pricing-catalog' : 'unknown'),
    releaseDate,
    releaseDateSource: inferredReleaseDate ? 'model-id' : knownModel?.releaseDate ? 'model-catalog' : null,
    knowledgeCutoff: knownModel?.knowledgeCutoff ?? inferKnowledgeCutoff(model),
    referenceUrl: knownModel?.referenceUrl,
    pricing: pricing
      ? {
          matchedModel: pricing.model,
          matchedProvider: pricing.provider,
          inputCostPerMillion: pricing.inputCostPerToken * 1_000_000,
          outputCostPerMillion: pricing.outputCostPerToken * 1_000_000,
          cacheReadInputCostPerMillion: toPerMillion(pricing.cacheReadInputCostPerToken),
          cacheCreationInputCostPerMillion: toPerMillion(pricing.cacheCreationInputCostPerToken),
          reasoningOutputCostPerMillion: toPerMillion(pricing.reasoningOutputCostPerToken),
          contextWindow: pricing.contextWindow,
          maxOutputTokens: pricing.maxOutputTokens,
          source: pricing.source,
          sourceUrl: pricing.sourceUrl,
          updatedAt: pricing.updatedAt
        }
      : null
  }
}

function toSessionActivityMetrics(summary: SessionSummary, asset: Asset): SessionActivityMetrics {
  const startedAt = readString(asset.meta, 'usageStartedAt') ?? null
  const endedAt = readString(asset.meta, 'usageEndedAt') ?? null
  const durationSeconds =
    readNumber(asset.meta, 'usageDuration') ??
    calculateDurationSeconds(startedAt, endedAt)
  if (durationSeconds != null && durationSeconds > 0 && summary.tokenUsage.totalTokens > 0) {
    return {
      tokenRatePerMinute: summary.tokenUsage.totalTokens / (durationSeconds / 60),
      tokenRateDurationSeconds: durationSeconds,
      tokenRateSource: 'usage-events',
      tokenRateStartedAt: startedAt,
      tokenRateEndedAt: endedAt
    }
  }

  return {
    tokenRatePerMinute: null,
    tokenRateDurationSeconds: durationSeconds,
    tokenRateSource: 'unavailable',
    tokenRateStartedAt: startedAt,
    tokenRateEndedAt: endedAt
  }
}

function resolvePreferredModelPricing(
  model: string,
  provider: string | null | undefined
): ReturnType<typeof resolveModelPricing> {
  const providerSlug = provider == null ? null : modelPricingProviderSlug(provider)
  if (providerSlug) {
    return resolveModelPricing(`${providerSlug}/${model}`) ?? resolveModelPricing(model)
  }
  return resolveModelPricing(model)
}

function modelPricingProviderSlug(provider: string): string | null {
  const normalized = provider.toLowerCase()
  if (normalized === 'openai') return 'openai'
  if (normalized === 'anthropic') return 'anthropic'
  if (normalized === 'google') return 'google'
  if (normalized === 'deepseek') return 'deepseek'
  if (normalized === 'xai') return 'xai'
  return null
}

type KnownModelMetadata = {
  pattern: RegExp
  provider: string
  releaseDate?: string
  knowledgeCutoff?: string
  referenceUrl: string
}

const KNOWN_MODEL_METADATA: readonly KnownModelMetadata[] = [
  {
    pattern: /^gpt-5\.5(?:-|$)/,
    provider: 'OpenAI',
    releaseDate: '2026-04-23',
    knowledgeCutoff: '2025-12-01',
    referenceUrl: 'https://developers.openai.com/api/docs/models/gpt-5.5'
  },
  {
    pattern: /^claude-opus-4-8(?:-|$)/,
    provider: 'Anthropic',
    referenceUrl: 'https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-8'
  }
]

function findKnownModelMetadata(model: string): KnownModelMetadata | null {
  const normalized = model.toLowerCase()
  return KNOWN_MODEL_METADATA.find((entry) => entry.pattern.test(normalized)) ?? null
}

function inferModelProvider(
  model: string,
  agentId: string
): { name: string | null; source: SessionModelInfo['providerSource'] | null } {
  const normalized = model.toLowerCase()
  if (normalized.startsWith('claude-')) return { name: 'Anthropic', source: 'model-id' }
  if (/^(gpt-|chatgpt-|o\d)/.test(normalized)) return { name: 'OpenAI', source: 'model-id' }
  if (normalized.startsWith('gemini-')) return { name: 'Google', source: 'model-id' }
  if (normalized.startsWith('deepseek-')) return { name: 'DeepSeek', source: 'model-id' }
  if (normalized.startsWith('qwen')) return { name: 'Alibaba Cloud', source: 'model-id' }
  if (normalized.startsWith('kimi-')) return { name: 'Moonshot AI', source: 'model-id' }
  if (normalized.startsWith('grok-')) return { name: 'xAI', source: 'model-id' }
  if (agentId === 'claude-code' || agentId === 'claude') return { name: 'Anthropic', source: 'agent' }
  if (agentId === 'codex') return { name: 'OpenAI', source: 'agent' }
  return { name: null, source: null }
}

function inferModelDate(model: string): string | null {
  const compact = model.match(/(?:^|[-_/])((?:20)\d{2})(\d{2})(\d{2})(?:$|[-_/])/)
  if (compact) return normalizeDateParts(compact[1], compact[2], compact[3])

  const dashed = model.match(/(?:^|[-_/])((?:20)\d{2})-(\d{2})-(\d{2})(?:$|[-_/])/)
  if (dashed) return normalizeDateParts(dashed[1], dashed[2], dashed[3])

  return null
}

function inferKnowledgeCutoff(model: string): string | null {
  const normalized = model.toLowerCase()
  if (normalized === 'gpt-5.5' || normalized.startsWith('gpt-5.5-')) return '2025-12-01'
  if (normalized === 'gpt-5' || normalized.startsWith('gpt-5-')) return '2024-09-30'
  return null
}

function normalizeDateParts(
  year: string | undefined,
  month: string | undefined,
  day: string | undefined
): string | null {
  if (!year || !month || !day) return null
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  return `${year}-${month}-${day}`
}

function toPerMillion(value: number | undefined): number | undefined {
  return value == null ? undefined : value * 1_000_000
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
  if (asset.agentId !== 'claude-code' && asset.agentId !== 'claude') return []
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

function calculateDurationSeconds(
  startedAt: string | null,
  endedAt: string | null
): number | null {
  if (!startedAt || !endedAt) return null
  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  return Math.max(0, Math.round((end - start) / 1000))
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
