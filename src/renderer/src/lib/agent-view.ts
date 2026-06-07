import type { AgentView, Asset, AssetStats } from '@shared/types/asset'

export function matchesAgentView(agentId: string, view: AgentView): boolean {
  if (view === 'all') return true
  if (view === 'claude') return agentId === 'claude-code' || agentId === 'claude'
  return agentId === 'codex'
}

/**
 * Visibility for a single asset under an agent view. A cross-agent file (a merged
 * AGENTS.md) keeps one primary `agentId` but lists every agent that reads it in
 * `meta.readByAgentIds`, so it must show under all of those views — not just its
 * primary's. Falls back to the primary agentId when readByAgentIds is absent
 * (every non-shared asset). (GH-113 T1)
 */
export function assetMatchesAgentView(asset: Asset, view: AgentView): boolean {
  if (view === 'all') return true
  if (matchesAgentView(asset.agentId, view)) return true
  const readers = Array.isArray(asset.meta?.readByAgentIds) ? asset.meta.readByAgentIds : []
  return readers.some((reader) => typeof reader === 'string' && matchesAgentView(reader, view))
}

export function filterAssetsByAgentView(assets: Asset[], view: AgentView): Asset[] {
  return assets.filter((asset) => assetMatchesAgentView(asset, view))
}

export function computeStatsForAssets(assets: Asset[]): AssetStats {
  return {
    skills: assets.filter((a) => a.type === 'skill').length,
    mcpServers: assets.filter((a) => a.type === 'mcp-server').length,
    sessions: assets.filter((a) => a.type === 'session').length,
    plugins: assets.filter((a) => a.type === 'plugin').length,
    hooks: assets.filter((a) => a.type === 'hook').length,
    commands: assets.filter((a) => a.type === 'command').length,
    subagents: assets.filter((a) => a.type === 'agent').length
  }
}
