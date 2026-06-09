import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { BrowserWindow, ipcMain, nativeTheme, shell, app } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { AgentView, Asset, CostMode, Relation, SessionSummary, UsageSummary } from '@shared/types/asset'
import type {
  PlatformInfo,
  AgentScanSourceGroup,
  AssetRuntimeStatus,
  AssetSnapshot,
  ScanResult,
  SearchResult,
  HealthCheck,
  HealthCheckRequest,
  ImportChainNode,
  SessionListResult,
  SessionDetailResult,
  SessionModelInfo,
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
import type { AgentCapabilityPluginListResult } from '@shared/types/agent-plugin'
import { getAssetRuntime } from '../engine/assets/runtime'
import { normalizeTokenUsage } from '../../shared/token-usage'
import {
  getAgentHooksStatus,
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
import { activateProjectScope } from '../project-scope-runtime'
import type { AppScopeSelection } from '@shared/scope'
import { toSessionActivityMetrics } from './session-activity'

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

  ipcMain.handle('assets:snapshot', async (): Promise<AssetSnapshot> => {
    return getAssetRuntime().getSnapshot()
  })

  ipcMain.handle('assets:status', (): AssetRuntimeStatus => {
    return getAssetRuntime().getStatus()
  })

  ipcMain.handle('assets:refresh', async (_event, opts: { wait?: boolean } = {}): Promise<AssetRuntimeStatus> => {
    return getAssetRuntime().refresh({ reason: 'manual', wait: opts.wait })
  })

  ipcMain.handle('assets:scan-all', async (): Promise<ScanResult> => {
    const runtime = getAssetRuntime()
    await runtime.refresh({ reason: 'legacy-scan-all', wait: true })
    return runtime.getScanResult()
  })

  ipcMain.handle('assets:scan-sources', async (): Promise<AgentScanSourceGroup[]> => {
    return getAssetRuntime().getScanSourceGroups()
  })

  ipcMain.handle('agent-plugins:list', async (): Promise<AgentCapabilityPluginListResult> => {
    const snapshot = await getAssetRuntime().ensureReady({ reason: 'manual' })
    return listAgentCapabilityPlugins(snapshot.sources, {
      homeDir: os.homedir(),
      projectDir: snapshot.projectDir,
      env: process.env
    })
  })

  ipcMain.handle('project-scope:candidates', async () => {
    return getAssetRuntime().getProjectCandidates()
  })

  ipcMain.handle('project-scope:activate', async (_event, opts: { projectPath?: string } = {}) => {
    return activateProjectScope(opts.projectPath)
  })

  // Update the active scope without rescanning (sub-second scope switching).
  // Server-side reads like search honour this selection.
  ipcMain.handle('project-scope:set-scope', async (_event, selection: AppScopeSelection) => {
    getAssetRuntime().setScopeSelection(selection)
    return { applied: true }
  })

  ipcMain.handle('assets:get', (_event, id: string): Asset | null => {
    return getAssetRuntime().getAsset(id)
  })

  ipcMain.handle('assets:relations', (_event, id: string): Relation[] => {
    const runtime = getAssetRuntime()
    const asset = runtime.getAsset(id)
    if (!asset) return []
    return resolveRelations(asset, runtime.getAssets())
  })

  ipcMain.handle('assets:search', async (_event, query: string): Promise<SearchResult[]> => {
    return getAssetRuntime().search(query)
  })

  ipcMain.handle('assets:health-check', async (_event, opts: HealthCheckRequest = {}): Promise<HealthCheck[]> => {
    return getAssetRuntime().getHealthChecks(opts)
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
      return getAssetRuntime().listSessions(opts)
    }
  )

  ipcMain.handle(
    'sessions:get',
    async (_event, id: string): Promise<SessionDetailResult | null> => {
      const runtime = getAssetRuntime()
      await runtime.ensureReady({ reason: 'manual' })
      const asset = runtime.getAsset(id)
      if (!asset || asset.type !== 'session') return null
      const allAssets = runtime.getAssets()
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
      return getAssetRuntime().getUsageSummary(opts)
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
      await getAssetRuntime().refresh({ reason: 'manual', wait: true })
      return result
    }
  )

  ipcMain.handle(
    'hooks:set-hook-enabled',
    async (_event, request: SetHookEnabledRequest): Promise<SetHookEnabledResult> => {
      const result = setHookEnabled(request)
      await getAssetRuntime().refresh({ reason: 'manual', wait: true })
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
