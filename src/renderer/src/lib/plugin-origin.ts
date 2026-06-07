import type { Asset } from '@shared/types/asset'

export interface PluginOrigin {
  pluginId: string
  pluginName?: string
}

/**
 * Returns the owning-plugin info for a plugin-provided component, or null for a
 * built-in component. Keyed off `meta.pluginId` (set by the scanner's plugin
 * descent, GH-110 P2.2). Single source of truth for "is this from a plugin?"
 * across every component page (GH-112).
 */
export function pluginOriginOf(asset: Pick<Asset, 'meta'>): PluginOrigin | null {
  const pluginId = asset.meta.pluginId
  if (typeof pluginId !== 'string' || pluginId.length === 0) return null
  const pluginName = typeof asset.meta.pluginName === 'string' ? asset.meta.pluginName : undefined
  return { pluginId, pluginName }
}
