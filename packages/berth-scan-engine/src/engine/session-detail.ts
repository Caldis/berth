import type { Asset, SessionSummary } from '@shared/types/asset'
import type { SessionArtifacts, SessionDetailResult, SessionModelInfo, SessionToolEvent } from '@shared/types/ipc'
import { normalizeTokenUsage } from '@shared/token-usage'
import { isRecord, readNumber, readString, readStringArray, safeId } from '@shared/object-guards'
import { resolveModelPricing } from './pricing'
import { parseClaudeSessionDetail } from '../adapters/claude-code/session-detail'
import { parseCodexSessionDetail } from '../adapters/codex/parsers'
import { toSessionActivityMetrics } from './session-activity'
import { AssetFileCache } from './assets/file-cache'

// GH-115 T10: session/模型推断域逻辑自 ipc/handlers.ts 迁入 (~276 行) — IPC 层回归薄门面,
// 域逻辑落 engine 可被 vitest 直测 (handlers 顶层 import electron 致其不可加载)。
// KNOWN_MODEL_METADATA 是模型知识库: 新模型补条目, 不改推断逻辑。

/** sessions:get 的完整编排 — handlers 压成单调用。 */
export function buildSessionDetail(asset: Asset, allAssets: Asset[]): SessionDetailResult {
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

export function toSessionSummary(asset: Asset): SessionSummary {
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
      id: `${session.id}-${type}-${safeId(name)}`,
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

interface ParsedExecutionDetail {
  toolTimeline: SessionToolEvent[]
  artifacts: SessionArtifacts
}

// GH-116: detail 解析按文件指纹缓存 — 重复打开同一会话不再整文件重解析。
const executionDetailCache = new AssetFileCache<ParsedExecutionDetail>()

function parseSessionExecutionDetail(asset: Asset): ParsedExecutionDetail {
  const parse = executionDetailParserFor(asset.agentId)
  if (!parse) return emptyExecutionDetail()
  const result = executionDetailCache.read(asset.path, () => parse(asset.path))
  if (result.status === 'hit' || result.status === 'miss') return result.value
  return emptyExecutionDetail()
}

function executionDetailParserFor(
  agentId: string
): ((filePath: string) => ParsedExecutionDetail) | null {
  if (agentId === 'codex') return parseCodexSessionDetail
  if (agentId === 'claude-code' || agentId === 'claude') return parseClaudeSessionDetail
  return null
}

function emptyExecutionDetail(): ParsedExecutionDetail {
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
