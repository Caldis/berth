import type { AgentView, Asset, AssetStats } from '@shared/types/asset'

export function matchesAgentView(agentId: string, view: AgentView): boolean {
  if (view === 'all') return true
  if (view === 'claude') return agentId === 'claude-code' || agentId === 'claude'
  return agentId === 'codex'
}

export function filterAssetsByAgentView(assets: Asset[], view: AgentView): Asset[] {
  return assets.filter((asset) => matchesAgentView(asset.agentId, view))
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
