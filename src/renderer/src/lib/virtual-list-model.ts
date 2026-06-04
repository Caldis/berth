export type VirtualListGroupMeta = Record<string, string | number | boolean>

export interface VirtualListGroup<TItem> {
  id: string
  label: string
  count: number
  items: readonly TItem[]
  meta?: VirtualListGroupMeta
}

export interface JumpNavItem {
  id: string
  label: string
  count: number
  targetIndex: number
  kind?: 'item' | 'heading'
  parentId?: string
  title?: string
  tone?: 'default' | 'muted' | 'warning'
}

export interface VirtualListRange {
  startIndex: number
  endIndex: number
  startGroupId?: string
  endGroupId?: string
}

export function visibleVirtualGroups<TItem>(
  groups: readonly VirtualListGroup<TItem>[]
): VirtualListGroup<TItem>[] {
  return groups.filter((group) => group.items.length > 0)
}

export function virtualGroupCounts<TItem>(groups: readonly VirtualListGroup<TItem>[]): number[] {
  return groups.map((group) => group.items.length)
}

export function flattenVirtualGroups<TItem>(groups: readonly VirtualListGroup<TItem>[]): TItem[] {
  return groups.flatMap((group) => [...group.items])
}

export function findVirtualGroupIndex(groupCounts: readonly number[], itemIndex: number): number {
  if (groupCounts.length === 0) return -1

  let offset = 0
  for (let index = 0; index < groupCounts.length; index += 1) {
    const count = groupCounts[index]
    if (itemIndex < offset + count) return index
    offset += count
  }

  return groupCounts.length - 1
}

export function buildJumpNavItems<TItem>(
  groups: readonly VirtualListGroup<TItem>[]
): JumpNavItem[] {
  let targetIndex = 0
  let lastParentId = ''
  const items: JumpNavItem[] = []

  for (const group of groups) {
    const parentPath = typeof group.meta?.parentPath === 'string' ? group.meta.parentPath : ''
    const parentLabel = typeof group.meta?.parentLabel === 'string' ? group.meta.parentLabel : ''
    const parentId = parentPath ? `parent:${parentPath}` : ''

    if (parentId && parentId !== lastParentId) {
      items.push({
        id: `heading:${parentId}`,
        kind: 'heading',
        label: parentLabel,
        count: 0,
        targetIndex,
        title: parentPath
      })
      lastParentId = parentId
    }

    items.push({
      id: group.id,
      kind: 'item',
      label: group.label,
      count: group.items.length,
      targetIndex,
      parentId: parentId || undefined,
      title: typeof group.meta?.pathTitle === 'string' ? group.meta.pathTitle : undefined
    })

    targetIndex += group.items.length
  }

  return items
}
