import type { Asset } from '@shared/types/asset'

/**
 * Maps an asset to the route of the page where it is displayed. Single source of
 * truth shared by the global search and the plugin↔component cross-navigation
 * (GH-112), so "jump to this asset's page" behaves identically everywhere.
 */
export function routeForAsset(asset: Pick<Asset, 'type' | 'id'>): string {
  switch (asset.type) {
    case 'session':
      return `/sessions/${asset.id}`
    case 'usage-data':
    case 'stats-cache':
      return '/usage'
    case 'hook':
      return '/capabilities/hooks'
    case 'mcp-server':
      return '/capabilities/mcp'
    case 'permission':
      return '/capabilities/permissions'
    case 'plugin':
      return '/capabilities/plugins'
    case 'statusline':
      return '/capabilities/status-line'
    case 'env':
      return '/capabilities/env'
    case 'skill':
      return '/instructions/skills'
    case 'command':
      return '/instructions/commands'
    case 'agent':
      return '/instructions/subagents'
    case 'output-mode':
      return '/instructions/output-modes'
    case 'claude-md':
    case 'agents-md':
      return '/instructions/conventions'
    default:
      return '/'
  }
}
